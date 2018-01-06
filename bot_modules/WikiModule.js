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
const https = require('https');

/* Module Setup */
const NAME = "Wikipedia Module"
const VERSION = "1.0"
const URI = "/WikipediaModule"

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
    return '/wiki <term/phrase> - Get wikipedia extract of <term/phrase>\n\n';
  }
};

function receiveMessage(receivedEvent) {
  if (receivedEvent.isCommand) {
    switch (receivedEvent.fullCommand[0].toLowerCase()) {
      case '/wiki':
        getWiki(receivedEvent.message);
        break;
      default:;
    }
  }
}

const WIKIAPI = 'https://en.wikipedia.org/w/api.php?format=json&action=query&indexpageids=1&redirects=1&prop=extracts&exintro=&explaintext=&titles=';

function getWiki(message) {
  var topicURI = encodeURI(message.text.substr(message.text.indexOf(' ') + 1));
  https.get(WIKIAPI + topicURI, (res) => {
    var body = '';

    res.on('data', (chunk) => {
      body += chunk;
    });

    res.on('end', () => {
      var results = JSON.parse(body);
      var answer = 'Could not find an entry for that.';

      if (results) {
        if ('query' in results && 'pageids' in results.query &&
            results.query.pageids.length > 0) {
          answer = results.query.pages[results.query.pageids[0]].title +
          '\n\n' +
          results.query.pages[results.query.pageids[0]].extract;
        }
      }

      apiHandler.sendMessage(answer, {isReply: true}, message);
    });
  });
}


/* Web Handler */
function getRootPage(req, res) {
  res.render('root', app.getOptions(req, {name: NAME, version: VERSION}));
}