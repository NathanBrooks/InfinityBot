/*
 * Copyright 2018 Nathan Tyler Brooks
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 *
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

/* Module Requirements */
var mongoClient = require('mongodb').MongoClient;
var formidable = require('formidable');
var fs = require('fs');
var pos = require('pos');
var posLexer = new pos.Lexer();
var posTagger = new pos.Tagger();

/* Module Setup */
const NAME = "Markov Module"
const VERSION = "1.1"
const URI = "/MarkovModule"

// these will be initialized in module.exports.init
var apiHandler = null;
var webApp = null;

module.exports = {
  name: NAME,
  version: VERSION,
  uri: URI,

  init: (parentBotApi, parentWebApp) => {
    apiHandler = parentBotApi;
    webApp = parentWebApp;

    apiHandler.on('receiveMessage', receiveMessage);
    webApp.get(URI, getRootPage);
  },

  free: () => {
    apiHandler.removeListener('receiveMessage', receiveMessage);

    apiHandler = null;
    webApp = null;
  },

  getCommands: () => {
    return '/generate - Generate a message\n\n' +
    '/generateme - Generates a message from your personal data\n\n' +
    '/generatememe - Markov generate a meme\n\n';
  },
}

function receiveMessage(receivedEvent) {
  if (receivedEvent.isCommand) {
    switch (receivedEvent.fullCommand[0].toLowerCase()) {
      case '/generate':
        if (receivedEvent.paramList.length > 1) {
            var input = receivedEvent.paramList.splice(1,
              receivedEvent.paramList.length);
            generateMessage(receivedEvent.message, input);
        } else {
          generateMessage(receivedEvent.message);
        }
        break;
      case '/generateme':
        generateUserMessage(receivedEvent.message);
        break;
      case '/generatememe':
        if (receivedEvent.paramList.length > 1) {
            var input = receivedEvent.paramList.splice(1,
              receivedEvent.paramList.length);
            generateMeme(receivedEvent.message, input);
        } else {
          generateMeme(receivedEvent.message);
        }
        break;
      default:;
    }
  } else {
    buildChain(receivedEvent.message);
  }
}

function buildChain(message) {
  var taggedWords = posTagger.tag(posLexer.lex(message.text));

  mongoClient.connect(process.env.MONGO_DATABASE, (err, db) => {
    if (!err) {
      var wordCollection = db.collection('WordCollection');
      var keywords = new Array(2).fill('**IGNORE**');

      for (var key in taggedWords) {
        var newWord = taggedWords[key][0];
        var newTag = taggedWords[key][1];

        wordCollection.update({context: keywords.join(), nextWord: newWord,
          tag: newTag, user: message.uid}, {$inc: {count: 1}}, {upsert: true});

        keywords.shift();
        keywords.push(newWord.toLowerCase());
      }

      if(keywords[0] != '**IGNORE**') {
        wordCollection.update({context: keywords.join(), nextWord: '**IGNORE**',
          tag: 'null', user: message.uid}, {$inc: {count: 1}}, {upsert: true});
      }
    } else {
      apiHandler.sendMessage(err.toString(), {isReply:true}, message);
    }

    if (db) { db.close(); }
  });
}

function getWord(wordCollection, keywords) {
  return new Promise((resolve, reject) => {
    wordCollection.find({context: keywords.join()})
      .sort({count: 1})
      .toArray((err, words) => {
      if (err) {
        reject(err);
      } else {
        if(words.length < 1) {
          resolve('**IGNORE**');
        } else {
          wordCollection.aggregate([
            {$match: {context: keywords.join()}},
            {$group: {
              _id: null,
              myTotal: { $sum : '$count' }
            }}
          ], (err, response) => {
            if (err) {
              reject(err);
            } else {
              var total = response[0].myTotal;
              var currentProbability = 0.0;
              var randomNumber = Math.random();

              for (var i in words) {
                currentProbability += (words[i].count / total);
                if(randomNumber < currentProbability) {
                  resolve(words[i].nextWord);
                }
              }
            }
          });
        }
      }
    });
  });
}

function getUserWord(wordCollection, keywords, userID) {
  return new Promise((resolve, reject) => {
    wordCollection.find({context: keywords.join(), user: userID})
      .sort({count: 1})
      .toArray((err, words) => {
      if (err) {
        console.log("error:" + err.toString());
        reject(err);
      } else {
        if(words.length < 1) {
          resolve('**IGNORE**');
        } else {
          wordCollection.aggregate([
            {$match: {context: keywords.join(), user: userID}},
            {$group: {
              _id: null,
              myTotal: { $sum : '$count' }
            }}
          ], (err, response) => {
            if (err) {
              reject(err);
            } else {
              var total = response[0].myTotal;
              var currentProbability = 0.0;
              var randomNumber = Math.random();

              for (var i in words) {
                currentProbability += (words[i].count / total);
                if(randomNumber < currentProbability) {
                  resolve(words[i].nextWord);
                }
              }
            }
          });
        }
      }
    });
  });
}

function buildMessage(wordCollection, generatedMessage, keywords) {
  return getWord(wordCollection, keywords).then((word) => {
    if(word != '**IGNORE**') {
      generatedMessage += ' ' + word;
      keywords.shift();
      keywords.push(word.toLowerCase());
      return buildMessage(wordCollection, generatedMessage, keywords);
    } else {
      return generatedMessage;
    }
  });
}

function buildUserMessage(wordCollection, generatedMessage, keywords, userID) {
  return getUserWord(wordCollection, keywords, userID).then((word) => {
    if(word != '**IGNORE**') {
      generatedMessage += ' ' + word;
      keywords.shift();
      keywords.push(word.toLowerCase());
      return buildUserMessage(wordCollection, generatedMessage, keywords, userID);
    } else {
      return generatedMessage;
    }
  });
}

// TODO: FIX THIS MESS

function generateMessage(message, input) {
  var database;
  var wordCollection;

  apiHandler.setBotStatus(apiHandler.statusList.typing, message);

  mongoClient.connect(process.env.MONGO_DATABASE).then((db) => {
    database = db;
    return database.collection('WordCollection');
  }).then((collection) => {
    wordCollection = collection;
    if(typeof input != 'undefined' && Array.isArray(input)) {
      var initialMessage = input.join(' ');

      var newInput = input.splice(input.length-2,2);

      for(var key in newInput) {
        newInput[key] = newInput[key].toLowerCase();
      }

      while(newInput.length < 2) {
        newInput.unshift('**IGNORE**');
      }

      return buildMessage(wordCollection, initialMessage, newInput);
    } else {
      return buildMessage(wordCollection, '', new Array(2).fill('**IGNORE**'));
    }
  }).then((generatedMessage) => {
    if (database) { database.close(); }
    apiHandler.sendMessage(generatedMessage, {isReply: true}, message);
    apiHandler.setBotStatus(apiHandler.statusList.done, message);
  }).catch((err) => {
    if (database) { database.close(); }
    apiHandler.sendMessage(err.toString(), {isReply: true}, message);
    apiHandler.setBotStatus(apiHandler.statusList.done, message);
  });
}

function generateUserMessage(message) {
  var database;
  var wordCollection;

  apiHandler.setBotStatus(apiHandler.statusList.typing, message);

  mongoClient.connect(process.env.MONGO_DATABASE).then((db) => {
    database = db;
    return database.collection('WordCollection');
  }).then((collection) => {
    wordCollection = collection;
    if(typeof input != 'undefined' && Array.isArray(input)) {
      var initialMessage = input.join(' ');

      var newInput = input.splice(input.length-2,2);

      for(var key in newInput) {
        newInput[key] = newInput[key].toLowerCase();
      }

      while(newInput.length < 2) {
        newInput.unshift('**IGNORE**');
      }

      return buildUserMessage(wordCollection, initialMessage, newInput,
        message.uid);
    } else {
      return buildUserMessage(wordCollection, '',
        new Array(2).fill('**IGNORE**'), message.uid);
    }
  }).then((generatedMessage) => {
    if (database) { database.close(); }
    apiHandler.sendMessage(generatedMessage, {isReply: true}, message);
    apiHandler.setBotStatus(apiHandler.statusList.done, message);
  }).catch((err) => {
    if (database) { database.close(); }
    console.log(err);
    apiHandler.sendMessage(err.toString(), {isReply: true}, message);
    apiHandler.setBotStatus(apiHandler.statusList.done, message);
  });
}

function generateMeme(message, input) {
  var database;
  var wordCollection;
  var line0 = '';
  var line1 = '';

  apiHandler.setBotStatus(apiHandler.statusList.typing, message);

  mongoClient.connect(process.env.MONGO_DATABASE).then((db) => {
    database = db;
    return database.collection('WordCollection');
  }).then((collection) => {
    wordCollection = collection;
    if(typeof input != 'undefined' && Array.isArray(input)) {
      var initialMessage = input.join(' ');

      var newInput = input.splice(input.length-2,2);

      for(var key in newInput) {
        newInput[key] = newInput[key].toLowerCase();
      }

      while(newInput.length < 2) {
        newInput.unshift('**IGNORE**');
      }

      return buildMessage(wordCollection, initialMessage, newInput);
    } else {
      return buildMessage(wordCollection, '', new Array(2).fill('**IGNORE**'));
    }
  }).then((generatedMessage) => {
    line0 = generatedMessage;
    return buildMessage(wordCollection, '', new Array(2).fill('**IGNORE**'));
  }).then((generatedMessage) => {
    if (database) { database.close(); }
    line1 = generatedMessage;
    apiHandler.moduleRequest.emit('generateMeme', {line0: line0, line1: line1,
      message: message});
    apiHandler.setBotStatus(apiHandler.statusList.done, message);
  }).catch((err) => {
    if (database) { database.close(); }
    console.log(err);
    apiHandler.sendMessage(err.toString(), {isReply: true}, message);
    apiHandler.setBotStatus(apiHandler.statusList.done, message);
  });
}

/* Web Handler */
function getRootPage(req, res) {
  res.render('root', webApp.getOptions(req, {name: NAME, version: VERSION}));

}