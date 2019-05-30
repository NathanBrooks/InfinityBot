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

/* module requirements */
const request = require('request');
const https = require('https');

/* module setup */
const NAME = 'Translate Module';
const VERSION = '1.0';
const URI = '/translate';

// these will be initialized in module.exports.init
var apiHandler = null;
var webApp = null;

var baseRequest = 'http://words.bighugelabs.com/api/2/' + process.env.THESAURUS_KEY;

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
    return '/translate (reply to text) - translates the message multiple ' +
      'times\n\n';
  }
};

function receiveMessage(receivedEvent) {
  if(receivedEvent.isCommand) {
    switch(receivedEvent.fullCommand[0].toLowerCase()) {
      case '/translate':
        translateMessage(receivedEvent.message);
      default :;
    }
  }
}

const TRANSLATION_URI = 'https://translate.yandex.net/api/v1.5/tr.json/translate?key=' + process.env.TRANSLATE_KEY;

function getTranslation(text, code) {
  return new Promise((resolve, reject) => {
    var uri = TRANSLATION_URI + '&text=' + encodeURI(text) + '&lang=' + code;
    console.log(code);
    https.get(uri, (res) => {
      var body = '';

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        var parsedJson = {};
        try {
          parsedJson = JSON.parse(body);
          resolve(parsedJson.text[0]);
        } catch(e) {
          reject(e);
        }
      });
    });
  });
}

const langList = [
'az',
'ml',
'sq',
'mt',
'am',
'mk',
'en',
'mi',
'ar',
'mr',
'hy',
'mhr',
'af',
'mn',
'eu',
'de',
'ba',
'ne',
'be',
'no',
'bn',
'pa',
'my',
'pap',
'bg',
'fa',
'bs',
'pl',
'cy',
'pt',
'hu',
'ro',
'vi',
'ru',
'ht',
'ceb',
'gl',
'sr',
'nl',
'si',
'sk',
'el',
'sl',
'ka',
'sw',
'gu',
'su',
'da',
'tg',
'he',
'th',
'yi',
'tl',
'id',
'ta',
'ga',
'tt',
'it',
'te',
'is',
'tr',
'es',
'udm',
'kk',
'uz',
'kn',
'uk',
'ca',
'ur',
'ky',
'fi',
'zh',
'fr',
'ko',
'hi',
'xh',
'hr',
'km',
'cs',
'lo',
'sv',
'la',
'gd',
'lv',
'et',
'lt',
'eo',
'lb',
'jv',
'mg',
'ja',
'ms'
];


function generateTranslation(text, timesRemaining) {
  console.log(text);
  /*
  if(timesRemaining == 0) {
    return text;
  } else {
    if (timesRemaining == 1) {
      console.log('only 1 remaining');
      return getTranslation(text, 'en').then((translatedText) => {
        console.log(translatedText);
        return translatedText;
      });
    } else {
      return getTranslation(text, langList[Math.floor(Math.random() * langList.length - 1)])
        .then((translatedText) => {
          return generateTranslation(translatedText, timesRemaining - 1);
        });
    }
  }
  */

  if(timesRemaining == 0) {
    return getTranslation(text, 'en').then((translatedText) => {
        return translatedText;
    });
  } else {
    if(timesRemaining % 2 == 0) {
        return getTranslation(text, 'en').then((translatedText) => {
          return generateTranslation(translatedText, timesRemaining - 1);
        });
    } else {
      return getTranslation(text, langList[Math.floor(Math.random() * langList.length - 1)])
        .then((translatedText) => {
          return generateTranslation(translatedText, timesRemaining - 1);
        });
    }
  }
}

function translateMessage(message) {
  if('replyToText' in message.extras) {
    apiHandler.setBotStatus(apiHandler.statusList.typing, message);

    generateTranslation(message.extras.replyToText, 5)
      .then((translatedText) => {
        apiHandler.sendMessage(translatedText, {isReply: true}, message);
        apiHandler.setBotStatus(apiHandler.statusList.done, message);
      })
      .catch((err) => {
        apiHandler.sendMessage(err, {isReply: true}, message);
      });

  }
}

/* Web Handler */
function getRootPage(req, res) {
  res.render('root', webApp.getOptions(req, {name: NAME, version: VERSION}));
}