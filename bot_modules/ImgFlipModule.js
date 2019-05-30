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
const NAME = "ImgFlip Module"
const VERSION = "1.0"
const URI = "/ImgFlipModule"

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
    apiHandler.moduleRequest.on('generateMeme', generateMeme);
    webApp.get(URI, getRootPage);
  },

  free: () => {
    apiHandler.removeListener('receiveMessage', receiveMessage);

    apiHandler = null;
    webApp = null;
  },

  getCommands: () => {
    return '';
  }
};

function receiveMessage(receivedEvent) {
  if (receivedEvent.isCommand) {
    switch (receivedEvent.fullCommand[0].toLowerCase()) {
      default:;
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

function getRandomMemeId() {
  return new Promise((resolve, reject) => {
    requestGet(IMGAPIGETMEMES).then((result) => {
      if(result.success && result.data && result.data.memes) {
        var memeList = result.data.memes;
        resolve(memeList[getRandomInRage(memeList.length-1)].id);
      } else {
        reject('Bad response getting meme list.');
      }
    }).catch((err) => {
        reject(err);
    });
  });
}

function generateMeme(content) {
  getRandomMemeId().then((memeID) => {
    var options = Object.assign(IMGAPIGENERATE);
    options.form.template_id = memeID;
    options.form.text0 = content.line0;
    options.form.text1 = content.line1;
    return requestPost(options);
  }).then((generatedInfo) => {
    if(generatedInfo.success) {
        apiHandler.sendMessage(generatedInfo.data.url, {isReply: true},
          content.message);
    } else {
        apiHandler.sendMessage('failed to generate meme', {isReply: true},
          content.message);
    }
  }).catch((err) => {
    console.log(err);
    apiHandler.sendMessage(err.toString(), {isReply: true}, content.message);
  });
}

/* Web Handler */
function getRootPage(req, res) {
  res.render('root', webApp.getOptions(req, {name: NAME, version: VERSION}));

}