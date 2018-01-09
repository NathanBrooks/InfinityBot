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
const util = require('util');

/* Module Setup */
const NAME = 'Mood Module';
const VERSION = '1.1';
const URI = '/MoodModule';

// these will be initialized in module.exports.init
var apiHandler = null;
var webApp = null;

// module specific variables
const RESPONSES = {
  'pos': [
    'You are the best, %s',
    `You make everyone's day better, %s`
  ],
  'neg': [
    'You are the worst, %s',
    'Fuck you, %s'
  ]
};

const APIHEADERS = {
  'User-Agent':   'Chat Bot/1.0',
  'Content-Type': 'application/json'
}

const MOODSIZE = 1.0;
const MOODSCALE = .05;
var currentMood = 0.0;
var currentMoodString = 'neutral';


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
    return '/mood - Respond with current mood and stats\n\n';
  }
};

function receiveMessage(receivedEvent) {

}

var apiOptions = (text) => {
  var optionsObject = {}

  optionsObject.url='http://text-processing.com/api/sentiment/';
  optionsObject.method = 'POST';
  optionsObject.headers = APIHEADERS;
  optionsObject.form = { 'text' : text };

  return optionsObject;
}

function sendCurrentMood(message) {
  var response = '\nCurrent Mood: ' + currentMoodString + '\n' +
    'i: ' + currentMood;

  apiHandler.sendMessage(response, {isReply: true}, message);
}

function checkMood(message) {
  if (currentMoodString != 'neutral') {
    if (Math.random() < (Math.abs(Math.abs(currentMood) - MOODSIZE / 2)) *
        moodScale) {
      // get message
      var result = RESPONSES[currentMoodString][Math.floor(Math.random() *
        (RESPONSES[currentMoodString].length-1))];

      // send message
      api.sendMessage(util.format(result, message.fromName), {isReply: true},
        message);
    }
  }
}

function updateMood(message) {
  var newOptions = new apiOptions(message.text);

  request(newOptions, (err, resp, body) => {
    if (err) {
      console.log('failed to get mood info');
    } else if (resp.statusCode == 200) {
      // parse the json response
      var moodInfo = JSON.parse(body);

      // update info
      if(moodInfo) {
        if ('probability' in moodInfo && 'label' in moodInfo) {
          switch (moodInfo.label) {
            case 'pos': // positive message
              currentMood = Math.min(currentMood +
                moodInfo.probability[moodInfo.label], MOODSIZE);
              if (currentMood > MOODSIZE / 2) { // if we are over threshold
                currentMoodString = 'pos';
              }
              break;
            case 'neutral': // neutral message
              // move towards center of spectrum
              if (currentMood > 0) {
                currentMood -= moodInfo.probability[moodInfo.label];
              } else if (currentMood < 0) {
                currentMood += moodInfo.probability[moodInfo.label];
              }
              // if we are over threshold, change
              if (currentMood <= MOODSIZE / 2 && currentMood >= -MOODSIZE / 2) {
                currentMoodString = 'neutral';
              }
              break;
            case 'neg': // negative message
              currentMood = Math.max(currentMood -
                moodInfo.probability[moodInfo.label], -MOODSIZE);
              if (currentMood < -MOODSIZE/2) { // if we are over threshold
                currentMoodString = 'neg';
              }
              break;
            default:;
          }
        }
      } else {
        console.log('failed to parse mood info');
      }
    }
  });
}

/* Web Handler */
function getRootPage(req, res) {
  res.render('root', webApp.getOptions(req, {name: NAME, version: VERSION}));
}