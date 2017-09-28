'use strict';


const module_name = "Markov Lex Module"
const module_version = "2.0"
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
            case "/generatev":
                generateMessage(message);
                break
            case "/ndlte" :
                //deleteCollections();
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
            var WordCol  = db.collection('WordCollection');
            var keyWords = new Array(2).fill('**IGNORE**');

            for (var i in tWords) {
                var newWord = tWords[i][0];
                var newTag  = tWords[i][1];

                WordCol.update({context : keyWords.join(), nextWord : newWord, tag : newTag}, {$inc: { count: 1}}, {upsert : true});
                keyWords.shift();
                keyWords.push(newWord);
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
                                        keyWords.push(newWord);
                                        addWord(generatedMessage, keyWords, message, db);
                                    } else {
                                        message.extras.is_reply = true;
                                        api.sendMessage(generatedMessage, message);
                                        db.close();
                                    }
                                    break;
                                }
                            }
                        } else {
                            console.log('error getting tag aggregate: ' + err);
                            console.log('response: ' + resp);
                            db.close();
                        }
                    });
                } else {
                    console.log('Error going to array: ' + err);
                    db.close();
                }
            });
        } else {
            console.log('Error finding word: ' + err);
            db.close();
        }
    });
}


function generateMessage(message) {
    MongoDB.connect(process.env.MONGO_DATABASE, function(err, db) {
        if(!err) {
            addWord('', new Array(2).fill('**IGNORE**'), message, db);
        } else {
            console.log("error connecting to database: " + err);
            db.close();
        }
    });
}

function rootpage(req, res) {
    res.render('MarkovLex', {name: module_name, version: module_version});
}