'use strict';


const module_name = "Markov Lex Module"
const module_version = "1.0"
const module_settings = "/MarkovLexModule"

var api;
var app;

module.exports = {
    module_name: module_name,
    module_version: module_version,
    module_settings: module_settings,

    init: function(parent_api, parent_app) {
        api = parent_api;
        app = parent_app;

        api.on('messageReceived', handleMessage);
        app.get(module_settings, rootpage);
    },

    free: function() {
        api.removeListener('messageReceived', handleMessage);

        api = null;
        app = null;
    }
};

/* module specific vars */
var MongoDB = require('mongodb').MongoClient;
var pos = require('pos');
var Lexer = new pos.Lexer();
var Tagger = new pos.Tagger();


function handleMessage(message){
    if('text' in message) {
        if(message.text[0] == '/') {
            parseCommand(message);
        } else {
            buildChain(message);
        }
    }
}

function parseCommand(message) {
    var paramList = message.text.split(/\s+/);
    var fullCommand = paramList[0].split(/@/);
	if(fullCommand.length == 1 || 									// no name was specified
 	   fullCommand[1].toLowerCase() == BotName.toLowerCase()) {     // check if the command was meant for us

    	switch(fullCommand[0].toLowerCase()) {
       		case "/generate":
                generateMessage(message);
       	    	break;
            case "/ndlte" :
                deleteCollections();
                break;
       		default: ;
    	}
    }
}

function deleteCollections() {
   MongoDB.connect(process.env.MONGO_DATABASE, function(err, db) {
        if(!err) {
            console.log("deleting");
            db.collection('TagCollection').remove();
            db.collection('WordCollection').remove();
        }
   });
}

function buildChain(message) {
    var tWords = Tagger.tag(Lexer.lex(message.text));               // lex and tag the message

    MongoDB.connect(process.env.MONGO_DATABASE, function(err, db) {
        if(!err) {
            var TagCol = db.collection('TagCollection');
            var WordCol = db.collection('WordCollection');
            var keyTags = new Array(2).fill('nothing');
            var keyWords = new Array(2).fill('**IGNORE**');
            var NextTag = 'nothing';

            for(var i in tWords) {
                var tWord = tWords[i];
                NextTag = tWord[1];
                TagCol.update({context : keyTags.join(), nextTag : NextTag}, {$inc: { count : 1}}, {upsert : true});
                WordCol.update({ tag : tWord[1], word : tWord[0], context : keyWords.join()}, {$inc: {count : 1}}, {upsert: true});
                keyTags.shift();
                keyTags.push(NextTag);
                keyWords.shift();
                keyWords.push(tWord[0]);
            }
            NextTag = 'nothing'
            TagCol.update({context : keyTags.join(), nextTag : NextTag}, {$inc: { count : 1}}, {upsert : true});
        } else {
            console.log("error connecting to database:" + err);
        }
    });
}

function addWordTagless(generatedMessage, keyTags, keyWords, newTag, message, db) {
    db.collection('WordCollection', function(err, collection) {
        if(!err) {
            collection.find({context: keyWords.join()}).sort({count : 1}).toArray(function(err, result) {
                if(!err) {
                    collection.aggregate([
                        {$match : {context: keyWords.join()}},
                        {$group : {
                            _id: null,
                            myTotal: { $sum: '$count' }
                        }}
                    ], function(err, resp) {
                        if(!err && !(resp[0] === undefined)) {
                            var total = resp[0].myTotal;
                            var current_probability = 0.0;
                            var rnd = Math.random();
                            for(var i in result) {
                                current_probability += (result[i].count / total);
                                if(rnd < current_probability) {
                                    generatedMessage += result[i].word + " ";
                                    keyWords.shift();
                                    keyWords.push(result[i].word);
                                    break;
                                }
                            }
                            keyTags.shift();
                            keyTags.push(newTag);
                            findTag(generatedMessage, keyTags, keyWords, message, db);
                        } else {
                            if(!err) {
                                message.extras.is_reply = true;
                                api.sendMessage(generatedMessage, message);
                                db.close();
                            } else {
                            	console.log("error getting word aggregate: " + err);
                            }
                        }
                    });
                } else {
                    console.log("error going to array: " + err);
                    db.close();
                }
            });
        } else {
            console.log("error finding word: " + err);
            db.close();
        }
    });
}

function addWord(generatedMessage, keyTags, keyWords, newTag, message, db) {
    if(newTag == 'nothing') {
        message.extras.is_reply = true;
        api.sendMessage(generatedMessage, message);
        db.close();
    } else {
        db.collection('WordCollection', function(err, collection) {
            if(!err) {
                collection.find({tag : newTag, context: keyWords.join()}).sort({count : 1}).toArray(function(err, result) {
                    if(!err) {
                        collection.aggregate([
                            {$match : {tag : newTag, context: keyWords.join()}},
                            {$group : {
                                _id: null,
                                myTotal: { $sum: '$count' }
                            }}
                        ], function(err, resp) {
                            if(!err && !(resp[0] === undefined)) {
                                var total = resp[0].myTotal;
                                var current_probability = 0.0;
                                var rnd = Math.random();
                                for(var i in result) {
                                    current_probability += (result[i].count / total);
                                    if(rnd < current_probability) {
                                        generatedMessage += result[i].word + " ";
                                        keyWords.shift();
                                        keyWords.push(result[i].word);
                                        break;
                                    }
                                }
                                keyTags.shift();
                                keyTags.push(newTag);
                                findTag(generatedMessage, keyTags, keyWords, message, db);
                            } else {
                                if(!err) {
                                    addWordTagless(generatedMessage, keyTags, keyWords, newTag, message, db);
                                } else {
                                    console.log("error getting word aggregate: " + err);
                                    db.close();
                                }
                            }
                        });
                    } else {
                        console.log("error going to array: " + err);
                        db.close();
                    }
                });
            } else {
                console.log("error finding word: " + err);
                db.close();
            }
        });
    }
}

function findTag(generatedMessage, keyTags, keyWords, message, db) {
    var newTag = 'nothing';
    db.collection('TagCollection', function(err, collection) {
        if(!err) {
            collection.find({context : keyTags.join()}).sort({count : 1}).toArray(function(err, result) {
                if(!err) {
                    collection.aggregate([
                        {$match : {context: keyTags.join()}},
                        {$group : {
                            _id: null,
                            myTotal: { $sum: '$count' }
                        }}
                    ], function(err, resp) {
                        if(!err && !(resp[0] === undefined)) {
                            var total = resp[0].myTotal;
                            var current_probability = 0.0;
                            var rnd = Math.random();
                            for(var i in result) {
                                current_probability += (result[i].count / total);
                                if(rnd < current_probability) {
                                    newTag = result[i].nextTag;
                                    break;
                                }
                            }
                            addWord(generatedMessage, keyTags, keyWords, newTag, message, db);
                        } else {
                            console.log("error getting tag aggregate: " + err);
                            db.close();
                        }
                    });
                } else {
                    console.log("error going to array: " + err);
                    db.close();
                }
            })
        } else {
            console.log("error finding tag: " + err);
            db.close();
        }
    });
}

function generateMessage(message) {
    var generatedMessage = '';
    var keyTags = new Array(2).fill('nothing');
    var keyWords = new Array(2).fill('**IGNORE**');

    MongoDB.connect(process.env.MONGO_DATABASE, function(err, db) {
        if(!err) {
            findTag(generatedMessage, keyTags, keyWords, message, db);
        } else {
            console.log("error connecting to database: " + err);
            db.close();
        }
    });
}

function rootpage(req, res) {
    res.render('root', {name: module_name, version: module_version});
}