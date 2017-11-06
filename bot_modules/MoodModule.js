'use strict';
var request = require('request');
var util = require('util');

const module_name = "Mood Module"
const module_version = "0.1"
const module_settings = "/MoodModule"

var api;
var app;

module.exports = {
    module_name: module_name,
    module_version: module_version,
    module_settings: module_settings,

    init: function(parent_api, parent_app) {
        api = parent_api;
        app = parent_app;

        api.on('messageReceived', handleMessage);
        app.get(module_settings, rootpage);
    },

    free: function() {
        api.removeListener('messageReceived', handleMessage);

        api = null;
        app = null;
    },

    commandList: function() {
        return '/Mood - Respond with current mood and stats\n\n';
    }
};

function handleMessage(receivedEvent){
    if(receivedEvent.isCommand) {
        checkMood(receivedEvent.message);
        switch(receivedEvent.fullCommand[0].toLowerCase()) {
            case "/mood":
                sendCurrentMood(receivedEvent.message);
                break;
            default: ;
        }
    } else {
        updateMood(receivedEvent.message);
        checkMood(receivedEvent.message);
    }
}

var Responses = [];
Responses['pos'] = [
    "You are the best, %s!"
]
Responses['neg'] = [
    "You are the worst, %s!"
]

var iCurrentMood = 0.0; // (-5,5) = neutral, (6,10) = positive, (-6, -10) = negative
var sCurrentMood = 'neutral';
const moodSize = 1.0;
const moodScale = .05;


var apiHeaders = {
    'User-Agent':   'Chat Bot/1.0',
    'Content-Type': 'application/json'
}

var apiOptions = function(text) {
    this.url='http://text-processing.com/api/sentiment/',
    this.method = 'POST',
    this.headers = apiHeaders,
    this.form = { 'text' : text }
};

function sendCurrentMood(message) {
    var response = "\nCurrent Mood: " + sCurrentMood + "\n" +
    "i: " + iCurrentMood;
    api.sendMessage(response, {is_reply : true}, message);
}

function runningAverage(avg, input) {
    avg -= avg / samples;
    avg += input / samples;

    return avg;
}

function checkMood(message) {
    if(sCurrentMood != 'neutral') {
        if(Math.random() < (Math.abs(Math.abs(iCurrentMood) - moodSize/2)) * moodScale) {
            var result = Responses[sCurrentMood][Math.floor(Math.random() * (Responses[sCurrentMood].length-1))];

            // send message
            if(result.indexOf('%s') >= 0)
                api.sendMessage(util.format(result, message.from_name), {is_reply : true}, message);
            else
                api.sendMessage(util.format(result, message.from_name), {is_reply : true}, message);
        }
    }
}

function updateMood(message) {
    var newOptions = new apiOptions(message.text);

    request(newOptions, function(err, resp, body) {
        if(!err && resp.statusCode == 200) {
            var  moodInfo = JSON.parse(body);
            if(moodInfo) {
                if('probability' in moodInfo && 'label' in moodInfo) {
                    switch(moodInfo.label) {
                        case 'pos':
                            iCurrentMood = Math.min(iCurrentMood + moodInfo.probability[moodInfo.label], moodSize);
                            if(iCurrentMood > moodSize/2) sCurrentMood = 'pos';
                            break;
                        case 'neutral':
                            if(iCurrentMood > 0)
                                iCurrentMood -= moodInfo.probability[moodInfo.label];
                            else if(iCurrentMood < 0)
                                iCurrentMood += moodInfo.probability[moodInfo.label];
                            if(iCurrentMood <= moodSize/2 && iCurrentMood >= -moodSize/2) sCurrentMood = 'neutral';
                            break;
                        case 'neg':
                            iCurrentMood = Math.max(iCurrentMood - moodInfo.probability[moodInfo.label], -moodSize);
                            if(iCurrentMood < -moodSize/2) sCurrentMood = 'neg';
                            break;
                    }
                } else {
                    console.log('failed to get mood info');
                }
            }
        }
    });
}

function rootpage(req, res) {
    res.render('root', {name: module_name, version: module_version});
}