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

/* Module Setup */
const NAME = 'Chance Module';
const VERSION = '1.0'
const URI = '/ChanceModule'

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
    return `/roll <#1>d<#2> - Roll <#1> <#2> sided dice\n
/flip - Flip a coin\n\n`;
  },
};

function receiveMessage(receivedEvent) {
  if (receivedEvent.isCommand) {
    switch (receivedEvent.fullCommand[0].toLowerCase()) {
      case '/roll':
        roll(receivedEvent.message);
        break;
      case '/flip':
        flip(receivedEvent.message);
        break;
      default:;
    }
  }
}

function roll(message) {
  var rollType = message.text.split(/\s+/);

  if (rollType.length != 2) {
    apiHandler.sendMessage('Sorry, that is an invalid roll!', {isReply: true},
      message);
    return;
  }

  var rollInfo = rollType[1].split(/d/gi);

  if (rollInfo.length != 2 || (isNaN(parseInt(rollInfo[0])) ||
    isNaN(rollInfo[1])) || parseInt(rollInfo[0]) > 16777215 ||
    parseInt(rollInfo[1]) > 16777215) {
      apiHandler.sendMessage('Sorry, that is an invalid roll!', {isReply: true},
        message);
  }

  var rollSum = 0;

  for(var i=0; i < parseInt(rollInfo[0]); i++) {
    rollSum += Math.floor(Math.random() * (rollInfo[1])) + 1;
  }

  apiHandler.sendMessage(`The result of rolling ${rollInfo[0]} ${rollInfo[1]} ` +
   `sided dice is: ${rollSum}`, {isReply: true}, message);
}

function flip(message) {
  if(Math.random() < .5) {
    apiHandler.sendMessage('Coin toss result: Heads!', {isReply: true}, message);
  } else {
    apiHandler.sendMessage('Coin toss result: Tails!', {isReply: true}, message);
  }
}

/* Web Handler */
function getRootPage(req, res) {
  res.render('root', webApp.getOptions(req, {name: NAME, version: VERSION}));
}