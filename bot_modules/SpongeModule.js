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
const https = require('https');

/* Module Setup */
const NAME = "Sponge Module"
const VERSION = "1.0"
const URI = "/Sponge"

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
    return '/sponge <text> - spongify the text mockingly\n\n';
  }
};

function receiveMessage(receivedEvent) {
  if (receivedEvent.isCommand) {
    switch (receivedEvent.fullCommand[0].toLowerCase()) {
      case '/sponge':
        sendSponge(receivedEvent.message);
      default:;
    }
  } else {
    if(getRandomInRage(1000) < 2) {
      randomSponge(receivedEvent.message);
    }
  }
}

function requestPost(options) {
  return new Promise((resolve, reject) => {
    request.post(options).on('response', (res) => {
      var body = '';

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        var parsedJson = {};
        try {
          resolve(JSON.parse(body));
        } catch(e) {
          reject(e);
        }
      });
    });
  });
}

function requestGet(uri) {
  return new Promise((resolve, reject) => {
    request.get(uri).on('response', (res) => {
      var body = '';

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        var parsedJson = {};
        try {
          resolve(JSON.parse(body));
        } catch(e) {
          reject(e);
        }
      });
    });
  })
}

const IMGAPIGETMEMES = 'https://api.ImgFlip.com/get_memes';

const IMGAPIGENERATE = {
  url: 'https://api.imgflip.com/caption_image',
  form: {
    template_id: '',
    username: process.env.IMGFLIP_USER,
    password: process.env.IMGFLIP_PASS,
    text0: '',
    text1: '',
  }
}

function getRandomInRage(max) {
  max = Math.floor(max);
  return Math.floor(Math.random() * max);
}

function randomCapitals(input) {
  var output = '';
  for(var i=0; i<input.length; i++) {
    if(Math.random() > .5) {
      output += input.charAt(i).toUpperCase();
    } else {
      output += input.charAt(i).toLowerCase();
    }
  }
  return output;
}

/* mocking spongebob memeId: 102156234 */

function generateSponge(content) {
  var options = Object.assign(IMGAPIGENERATE);
  options.form.template_id = 102156234;

  // have to use boxes to preserve capitals
  options.form.boxes = [
    {text: ''},
    {text: content.input}
  ];

  requestPost(options).then((generatedInfo) => {
    if(generatedInfo.success) {
        apiHandler.sendMessage(generatedInfo.data.url, {isReply: true},
          content.message);
    } else {
        apiHandler.sendMessage('failed to generate meme', {isReply: true},
          content.message);
    }
  }).catch((err) => {
    apiHandler.sendMessage(err.toString(), {isReply: true}, content.message);
  });
}

function sendSponge(message) {
  var input;
  if('replyToText' in message.extras) {
    input = message.extras.replyToText;
  } else {
    input = message.text.substr(message.text.indexOf(' ') + 1);
  }

  var content = {
    input: randomCapitals(input),
    message: message,
  };

  generateSponge(content);
}

function randomSponge(message) {
  var content = {
    input: randomCapitals(message.text),
    message: message,
  };

  generateSponge(content);
}

/* Web Handler */
function getRootPage(req, res) {
  res.render('root', webApp.getOptions(req, {name: NAME, version: VERSION}));

}
