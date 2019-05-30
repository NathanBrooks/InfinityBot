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

/* module requirements */
const request = require('request');
const https = require('https');
const thesaurus = require('thesaurus');

/* module setup */
const NAME = 'Thesaurize Module';
const VERSION = '1.0';
const URI = '/Thesaurize';

// these will be initialized in module.exports.init
var apiHandler = null;
var webApp = null;

var baseRequest = 'http://words.bighugelabs.com/api/2/' + process.env.THESAURUS_KEY;

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
    return '/thesaurize <text> - replaces text with thesaurized text\n\n';
  }
};

function receiveMessage(receivedEvent) {
  if(receivedEvent.isCommand) {
    switch(receivedEvent.fullCommand[0].toLowerCase()) {
      case '/thesaurize':
        thesaurizeMessage(receivedEvent.message);
      default :;
    }
  }
}

function getSynonym(word) {
  return new Promise((resolve, reject) => {
    var wordList = thesaurus.find(word)
    if(wordList.length == 0 || (Math.random() < .4)) {
      return resolve(word);
    } else {
      return resolve(wordList[
        Math.floor(Math.random() * wordList.length)
      ]);
    }
  });
}

function generateSynonymMessage(textArray, generatedMessage) {
  if(textArray.length == 0) {
    return generatedMessage;
  } else {
    return getSynonym(textArray[0]).then((newWord) => {
      generatedMessage += newWord + ' ';
      textArray.shift();
      return generateSynonymMessage(textArray, generatedMessage);
    });
  }
}

function generateSimilarMessage(textArray, generatedMessage) {
  if(textArray.length == 0) {
    return generatedMessage;
  } else {
    return getSimilar(textArray[0]).then((newWord) => {
      generatedMessage += newWord + ' ';
      textArray.shift();
      return generateSynonymMessage(textArray, generatedMessage);
    });
  }
}

function thesaurizeMessage(message) {
  apiHandler.setBotStatus(apiHandler.statusList.typing, message);

  if('replyToText' in message.extras) {
    var wordList = message.extras.replyToText.split(' ');
    generateSynonymMessage(wordList, '').then((generatedMessage) => {
      apiHandler.sendMessage(generatedMessage, {isReply: true}, message);
      apiHandler.setBotStatus(apiHandler.statusList.done, message);
    });
  } else { // this has to be some command, skip first entry in command list
    var wordList = message.text.split(' ');
    wordList.shift();
    generateSynonymMessage(wordList, '').then((generatedMessage) => {
      apiHandler.sendMessage(generatedMessage, {isReply: true}, message);
      apiHandler.setBotStatus(apiHandler.statusList.done, message);
    });
  }
}

/* Web Handler */
function getRootPage(req, res) {
  res.render('root', webApp.getOptions(req, {name: NAME, version: VERSION}));
}