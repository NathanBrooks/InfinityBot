'use strict';


const module_name = "Markov Module"
const module_version = "1.1"
const module_settings = "/MarkovModule"

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
    },

    commandList: function() {
        return '/generate - Generate a message\n\n';
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
    var paramList = message.text.toLowerCase().split(/\s+/);
    var fullCommand = paramList[0].split(/@/);
	if(fullCommand.length == 1 || 									// no name was specified
 	   fullCommand[1].toLowerCase() == BotName.toLowerCase()) {     // check if the command was meant for us

    	switch(fullCommand[0].toLowerCase()) {
       		case "/generate":

                if(paramList.length > 1) {
                    var input = paramList.splice(1,2);
                    generateMessage(message, input);
                } else {
                    generateMessage(message);
                }
       	    	break;
            case "/generatev":
                generateMessage(message);
                break
            case "/ndlte" :
                //deleteCollections();
                break;
            case "/lowercase":
                //updateDatabase();
                break;
       		default: ;
    	}
    }
}

function updateDatabase() {
    MongoDB.connect(process.env.MONGO_DATABASE, function(err, db) {
        if(!err) {
            console.log('found database');
            db.collection('WordCollection', function(err, collection) {
                if(!err) {
                    console.log('finding');
                    collection.find().forEach(function(e) {
                        e.context = e.context.toLowerCase();
                        e.context = e.context.replace('**ignore**', '**IGNORE**');
                        console.log('lowercase: ' + e.context);
                        collection.save(e);
                    });
                } else {
                    console.log('something went wrong: ' + err);
                }
            });
        } else {
            console.log('could not connect to databse: ' + err);
        }
   });
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
            var WordCol  = db.collection('WordCollection');
            var keyWords = new Array(2).fill('**IGNORE**');

            for (var i in tWords) {
                var newWord = tWords[i][0];
                var newTag  = tWords[i][1];

                WordCol.update({context : keyWords.join(), nextWord : newWord, tag : newTag}, {$inc: { count: 1}}, {upsert : true});
                keyWords.shift();
                keyWords.push(newWord.toLowerCase());
            }
            WordCol.update({context : keyWords.join(), nextWord : '**IGNORE**', tag : 'null'}, {$inc: { count : 1}}, {upsert : true});
        }
    });
}

function addWord(generatedMessage, keyWords, message, db) {
    db.collection('WordCollection', function(err, collection) {
        if(!err) {
            collection.find({context : keyWords.join()}).sort({count : 1}).toArray(function(err, result) {
                if(!err) {
                    collection.aggregate([
                        {$match : {context : keyWords.join()}},
                        {$group : {
                            _id: null,
                            myTotal: { $sum : '$count' }
                        }}
                    ], function(err, resp) {
                        if(!err && !(resp[0] === undefined)) {
                            var total = resp[0].myTotal;
                            var current_probability = 0.0;
                            var rnd = Math.random();
                            for(var i in result) {
                                current_probability += (result[i].count / total);
                                if(rnd < current_probability) {
                                    var newWord = result[i].nextWord;
                                    if (newWord != '**IGNORE**') {
                                        generatedMessage += (newWord + ' ');
                                        keyWords.shift();
                                        keyWords.push(newWord.toLowerCase());
                                        addWord(generatedMessage, keyWords, message, db);
                                    } else {
                                        api.sendMessage(generatedMessage, {is_reply : true}, message);
                                        db.close();
                                    }
                                    break;
                                }
                            }
                        } else {
                            if(!err) {
                                api.sendMessage(generatedMessage, {is_reply : true}, message);
                                db.close();
                            } else {
                                console.log('error getting tag aggregate: ' + err);
                                api.sendMessage('error getting tag aggregate: ' + err, {is_reply : true}, message);
                                db.close();
                            }
                        }
                    });
                } else {
                    console.log('Error going to array: ' + err);
                    api.sendMessage('Error going to array: ' + err, {is_reply : true}, message);
                    db.close();
                }
            });
        } else {
            console.log('Error finding word: ' + err);
            api.sendMessage('Error finding word: ' + err, {is_reply : true}, message);
            db.close();
        }
    });
}


function generateMessage(message, input) {
    MongoDB.connect(process.env.MONGO_DATABASE, function(err, db) {
        if(!err) {
            if(typeof input != 'undefined' && Array.isArray(input)) {
                var initialMessage = input.join(' ');
                initialMessage += ' ';

                while(input.length < 2) {
                    input.unshift('**IGNORE**');
                }
                addWord(initialMessage, input, message, db);
            } else {
                addWord('', new Array(2).fill('**IGNORE**'), message, db);
            }
        } else {
            console.log("error connecting to database: " + err);
            api.sendMessage("error connecting to database: " + err, {is_reply : true}, message);
            db.close();
        }
    });
}

function rootpage(req, res) {
    res.render('root', app.getOptions(req, {name: module_name, version: module_version}));
}