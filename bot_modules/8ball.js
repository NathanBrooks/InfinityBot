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
const util = require('util');

/* Module Setup */
const NAME = '8ball Module';
const VERSION = "1.0";
const URI = '/8ballModule';

// these will be initialized in module.exports.init
var apiHandler = null;
var webApp = null;

// module specific variables
var eightBallResponses = [
'Yes.',
'No.',
'Maybe?',
'You can rely on it!',
'How should I know?',
'Definitely not.',
'Are you crazy, %s, of course I am going to say no!',
'The fuck are you on about now, %s? No.',
'You are my favorite %s, so yes ^^',
'All signs point to yes!',
'Get out of here with your shit, %s! No!',
'My Sources say no. They also say you are a terrible person. That is funny,' +
  ' I did\'t even ask them that.',
'Maybe, but more importantly, did you know that underground is the only word' +
  ' in the english language that starts with und and ends with und?',
'HAHAHA. Everyone look at this guy! %s actually thought I would answer him!',
]

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
    return '/8ball - Ask the magic 8ball a question\n\n';
  },
}

function receiveMessage(receivedEvent) {
  if (receivedEvent.isCommand) {
    switch (receivedEvent.fullCommand[0].toLowerCase()) {
      case '/8ball':
        sendEightBallAnswer(receivedEvent.message);
        break;
      default:;
    }
  }
}

function getRandomInRage(max) {
  max = Math.floor(max);
  return Math.floor(Math.random() * max);
}

function sendEightBallAnswer(message) {
  var result = eightBallResponses[getRandomInRage(eightBallResponses.length-1)];
  if (result.indexOf('%s') >= 0) {
    apiHandler.sendMessage(util.format(result, message.fromName),
      {isReply: true}, message);
  } else {
    apiHandler.sendMessage(result, {isReply: true}, message);
  }
}

/* Web Handler */
function getRootPage(req, res) {
  res.render('root', webApp.getOptions(req, {name: NAME, version: VERSION}));
}