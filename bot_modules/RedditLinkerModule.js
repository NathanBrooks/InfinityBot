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
const NAME = 'Reddit Linker Module'
const VERSION = '1.0'
const URI = '/RedditLinkerModule'

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
    return '';
  },
};

function receiveMessage(receivedEvent) {
  checkForRedditLink(receivedEvent.message);
}

function checkForRedditLink(message) {
  var linkCount = 0;
  var linkResult = '';
  var textArr = message.text.split(/\s+/);

  for (var newWord in textArr) {
    var match = textArr[newWord].match(/^\/r\/|^r\//i);

    if (match != null && textArr[newWord].indexOf(match[0]) > -1) {
      var subredditName = textArr[newWord].split(/r\//i)[1];

      linkResult += `http://www.reddit.com/r/${subredditName}\n`;
      linkCount++;
    }
  }

  if (linkCount > 0) {
    apiHandler.sendMessage(linkResult, {isReply: true}, message);
  }
}


/* Web Handler */
function getRootPage(req, res) {
  res.render('root', webApp.getOptions(req, {name: NAME, version: VERSION}));
}