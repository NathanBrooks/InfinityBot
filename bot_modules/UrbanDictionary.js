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
var http = require('http');

/* Module Setup */
const NAME = 'Urban Dictionary Module';
const VERSION = '1.0';
const URI = '/UrbanDictionaryModule';

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
    return '/define <term/phrase> - Look up <term/phrase> on Urban' +
      ' Dictionary\n\n';
  },
};

const URBANAPI = 'http://api.urbandictionary.com/v0/define?term=';

function receiveMessage(receivedEvent) {
  if (receivedEvent.isCommand) {
    switch (receivedEvent.fullCommand[0].toLowerCase()) {
      case '/define':
        defineMessage(receivedEvent.message);
        break;
      default:;
    }
  }
}

function httpGet(uri) {
  return new Promise((resolve, reject) => {
    http.get(uri, (res) => {
      var body = '';

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        var parsedJson = {};
        try {
          parsedJson = JSON.parse(body);
        } catch(e) {
          reject(e);
        }

        resolve(parsedJson);
      });
    });
  });
}

function getUrbanDicitonary(term) {
  return new Promise((resolve, reject) => {
    httpGet(URBANAPI + term).then((response) => {
      if(response.list && response.list.length > 0) {
        var word = response.list[0].word;
        var definition = response.list[0].definition;
        var example = response.list[0].example;

        resolve(word + ':\n\n' + definition + '\n\nExample:\n\n' + example);
      } else {
        reject('invalid response.')
      }
    }).catch((error) => {
      reject(error);
    });
  });
}

function defineMessage(message) {
  var searchTerm  = message.text.substr(message.text.indexOf(' ') + 1)
    .replace(/\s/g, '+');

  getUrbanDicitonary(searchTerm).then((response) => {
    apiHandler.sendMessage(response, {isReply: true}, message);
  }).catch((error) => {
    apiHandler.sendMessage(error.toString(), {isReply: true}, message);
  })
}

/* Web Handler */
function getRootPage(req, res) {
  res.render('root', webApp.getOptions(req, {name: NAME, version: VERSION}));
}