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

/* Module requirements */

/* Module Setup */
const NAME = 'Shame Module';
const VERSION = '1.0';
const URI = '/ShameModule';

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
    return '/shame <username> - Shames that user\n\n';
  },
};

function receiveMessage(receivedEvent) {
  if (receivedEvent.isCommand) {
    switch(receivedEvent.fullCommand[0].toLowerCase()) {
      case '/shame':
        shameUser(receivedEvent.message);
        break;
      default:;
    }
  }
}

function shameUser(message) {
  var shameShep = message.text.split(/\s+/);
  if (shameShep.length > 1) {
    apiHandler.sendMessage(`For shame ${shameShep[1]}. For Shame.`,
      null, message);
  }
}

/* Web Handler */
function getRootPage(req, res) {
  res.render('root', webApp.getOptions(req, {name: NAME, version: VERSION}));
}