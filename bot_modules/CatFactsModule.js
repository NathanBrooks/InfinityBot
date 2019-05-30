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
var request = require('request');

/* Module Setup */
const NAME = 'Cat Facts Module'
const VERSION = '1.0'
const URI = '/CatFactsModule'

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
    return '/catfact - send a random Cat Fact\n\n';
  },
};

function receiveMessage(receivedEvent) {
  if (receivedEvent.isCommand) {
    switch (receivedEvent.fullCommand[0].toLowerCase()) {
      case '/catfact':
        sendCatFact(receivedEvent.message);
        break;
      default:;
    }
  }
}

const CATFACTAPI = {
    url:'https://catfact.ninja/fact'
}

function getCatFact() {
  return new Promise((resolve, reject) => {
    request(CATFACTAPI, (err, res, body) => {
      if (err) {
        reject(err);
      } else if (res && res.statusCode !== 200) {
        reject('Failed to get CatFact.');
      } else {
        try {
          var parsedResponse = JSON.parse(body);
          if(parsedResponse && 'fact' in parsedResponse) {
            resolve(parsedResponse.fact);
          } else {
            reject('Invalid response from cat facts.');
          }
        } catch (e) {
          reject(e);
        }
      }
    });
  });
}

function sendCatFact(message) {
  getCatFact().then((fact) => {
    apiHandler.sendMessage('Cat Fact: \n\n' + fact, {isReply: true}, message);
  }).catch((err) => {
    apiHandler.sendMessage(err.toString(), {isReply: true}, message);
  });
}

/* Web Handler */
function getRootPage(req, res) {
  res.render('root', webApp.getOptions(req, {name: NAME, version: VERSION}));
}