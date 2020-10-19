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
const {google} = require('googleapis');
const youtube = google.youtube({
    version: 'v3',
    auth: 'AIzaSyDwx1AGUCahF_d-J_UqUHEQejQokmCwPKY'
});

/* Module Setup */
const NAME = "Youtube Module"
const VERSION = "1.0"
const URI = "/YoutubeModule"

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
    return '/youtube <term/phrase> - Get random result from search term\n\n'
         + '/youtube - get randomly generated youtube video of format IMG ####\n\n';
  }
};

function receiveMessage(receivedEvent) {
  if (receivedEvent.isCommand) {
    switch (receivedEvent.fullCommand[0].toLowerCase()) {
      case '/youtube':
        if (receivedEvent.paramList.length >= 2) {
            getYoutube(receivedEvent.message, false);
        } else {
            getYoutube(receivedEvent.message, true);
        }
        break;
      default:;
    }
  }
}

function getRandomInRanage(max) {
    max = Math.floor(max);
    return Math.floor(Math.random() * max);
}

function getYoutube(message, random) {
    var searchQuery = '';

    if(random) {
        searchQuery = 'IMG ' + getRandomInRanage(9999);
    } else {
        searchQuery = message.text.substr(message.text.indexOf(' ') + 1);
    }

    youtube.search.list({
        part: 'snippet',
        maxResults: 50,
        safeSearch: 'none',
        type: 'video',
        q: searchQuery
    }, (err, data) => {
        if(err) {
            apiHandler.sendMessage(err, {isReply: true}, message);
        } else if (data) {
            var selectedVideo =
                data.data.items[getRandomInRanage(data.data.items.length)];

            var response = 'Please enjoy "' + selectedVideo.snippet.title + '"'
                + ' by ' + selectedVideo.snippet.channelTitle + '\n\n'
                + 'https://www.youtube.com/watch?v=' + selectedVideo.id.videoId;

            apiHandler.sendMessage(response, {isReply: true}, message);
        } else {
            apiHandler.sendMessage('No error, but youtube didn\'t '
                + ' respond either...', {isReply: true}, message);
        }
    });
}

/* Web Handler */
function getRootPage(req, res) {
  res.render('root', app.getOptions(req, {name: NAME, version: VERSION}));
}
