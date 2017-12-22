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
        app.get(module_settings + '/uploadform', uploadform);
        app.post(module_settings + '/uploadfile', uploadfile);
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
var formidable = require('formidable');
var fs = require('fs');
var pos = require('pos');
var Lexer = new pos.Lexer();
var Tagger = new pos.Tagger();


function handleMessage(receivedEvent) {
    if(receivedEvent.isCommand) {
        switch(receivedEvent.fullCommand[0].toLowerCase()) {
            case "/generate":
                if(receivedEvent.paramList.length > 1) {
                    var input = receivedEvent.paramList.splice(1,receivedEvent.paramList.length);
                    generateMessage(receivedEvent.message, input);
                } else {
                    generateMessage(receivedEvent.message);
                }
                break;
            default: ;
        }
    } else {
        buildChain(receivedEvent.message);
    }
}

function updateDatabase() {
    MongoDB.connect(process.env.MONGO_DATABASE, function(err, db) {
        if(!err) {
            db.collection('WordCollection', function(err, collection) {
                if(!err) {
                        /*
                    collection.find().forEach(function(e) {
                        e.context = e.context.toLowerCase();
                        e.context = e.context.replace('**ignore**', '**IGNORE**');
                        console.log('lowercase: ' + e.context);

                        if(e.context = )
                        collection.save(e);
                        if(db) { db.close(); }
                    });
                        */

                    collection.remove({context : /^\*\*IGNORE\*\*/, nextWord : "**IGNORE**"}).then(function(err) {
                        if(err) { console.log(err); } else {
                            console.log("completed database update");
                        }
                    });
                } else {
                    console.log('something went wrong: ' + err);
                    if(db) { db.close(); }
                }
            });
        } else {
            console.log('could not connect to databse: ' + err);
            if(db) { db.close(); }
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
        if(db) { db.close(); }
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
            if(keyWords[0] != '**IGNORE**')
                WordCol.update({context : keyWords.join(), nextWord : '**IGNORE**', tag : 'null'}, {$inc: { count : 1}}, {upsert : true});
        }
        if(db) { db.close(); }
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
                                        if(db) { db.close(); }
                                    }
                                    break;
                                }
                            }
                        } else {
                            if(!err) {
                                api.sendMessage(generatedMessage, {is_reply : true}, message);
                                if(db) { db.close(); }
                            } else {
                                console.log('error getting tag aggregate: ' + err);
                                api.sendMessage('error getting tag aggregate: ' + err, {is_reply : true}, message);
                                if(db) { db.close(); }
                            }
                        }
                    });
                } else {
                    console.log('Error going to array: ' + err);
                    api.sendMessage('Error going to array: ' + err, {is_reply : true}, message);
                    if(db) { db.close(); }
                }
            });
        } else {
            console.log('Error finding word: ' + err);
            api.sendMessage('Error finding word: ' + err, {is_reply : true}, message);
            if(db) { db.close(); }
        }
    });
}


function generateMessage(message, input) {
    MongoDB.connect(process.env.MONGO_DATABASE, function(err, db) {
        if(!err) {
            if(typeof input != 'undefined' && Array.isArray(input)) {
                var initialMessage = input.join(' ');
                initialMessage += ' ';

                var newInput = input.splice(input.length-2, 2);

                for(var key in newInput) {
                    newInput[key] = newInput[key].toLowerCase();
                }

                while(newInput.length < 2) {
                    newInput.unshift('**IGNORE**');
                }
                addWord(initialMessage, newInput, message, db);
            } else {
                addWord('', new Array(2).fill('**IGNORE**'), message, db);
            }
        } else {
            console.log("error connecting to database: " + err);
            api.sendMessage("error connecting to database: " + err, {is_reply : true}, message);
            if(db) { db.close(); }
        }
    });
}

function rootpage(req, res) {
    res.render('root', app.getOptions(req, {name: module_name, version: module_version}));
}

function uploadform(req, res) {
    res.render("MarkovModule/upload");
};

function safeCopy(input, output, callback) {
    var readstream = fs.createReadStream(input);
    var writestream = fs.createWriteStream(output);

    readstream.on('error', callback);
    writestream.on('error', callback);

    readstream.on('close', function() {
        fs.unlink(input, callback);
    });

    readstream.pipe(writestream);
}

function uploadfile(req,res) {
    var form = new formidable.IncomingForm();
    form.parse(req, function(err, fields, files) {
        if(!err) {
            var oldpath = files.inputfile.path;
            var newpath = './tmp/' + files.inputfile.name;
            safeCopy(oldpath, newpath, function(err) {
                if(!err) {
                    parseText(newpath, function(err, num_added) {
                        if(!err) {
                            res.end('added ' + num_added + ' entries to markov chain');
                        } else {
                            console.log(err);
                            res.end(err);
                        }
                    });
                } else {
                    console.log(err);
                    res.end(err);
                }
            });
        } else {
            console.log(err);
            res.end(err);
        }
    });
}

function parseText(path, callback) {
    fs.readFile(path, 'utf8', function(err, data) {
        if(!err) {
            try {
                var obj = JSON.parse(data);
                var count = 0;
                if(obj)
                    for(var key in obj) {
                        if(obj[key] && 'text' in obj[key]) {
                            buildChain(obj[key]);
                            count++;
                        }
                    }
                fs.unlink(path, callback);
                callback(undefined, count);
            } catch (e) {
                callback(e);
            }
        } else {
            callback(err);
        }
    });
}