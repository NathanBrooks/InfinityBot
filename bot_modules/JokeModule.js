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
const request = require('request');

/* Module Setup */
const NAME = "Joke Module"
const VERSION = "1.1"
const URI = "/JokeModule"

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
    return ` /dadjoke - send a random dad joke\n
/norrisjoke - send a random Chuck Norris joke\n\n`;
  }
};

const DADJOKEAPI = {
    url:'https://icanhazdadjoke.com/',
    headers: {
        'Accept' : 'application/json'
    }
};

const NORRISJOKEAPI = {
    url:'https://api.chucknorris.io/jokes/random'
}

function receiveMessage(receivedEvent) {
  if (receivedEvent.isCommand) {
    switch (receivedEvent.fullCommand[0].toLowerCase()) {
      case '/dadjoke':
        sendJoke(DADJOKEAPI, receivedEvent.message);
        break;
      case '/norrisjoke':
        sendJoke(NORRISJOKEAPI, receivedEvent.message);
        break;
      default:;
    }
  }
}

function sendJoke(options, message) {
  request(options, (err, res, body) => {
    if (err) {
      console.log(err);
    } else if (res && res.statusCode !== 200) {
      console.log('failed to get joke.');
    } else {
      var response = JSON.parse(body);
      var joke = 'Joke capture failed.';

      if ('value' in response) { // norris joke
        joke = response.value;
      }

      if ('joke' in response) { // dad joke
        joke = response.joke;
      }
      apiHandler.sendMessage(joke, {isReply: true}, message);
    }
  });
}

/* Web Handler */
function getRootPage(req, res) {
  res.render('root', webApp.getOptions(req, {name: NAME, version: VERSION}));
}