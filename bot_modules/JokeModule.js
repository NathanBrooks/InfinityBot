'use strict';
var request = require('request');


const module_name = "Joke Module"
const module_version = "1.0"
const module_settings = "/JokeModule"

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
        return '/dadjoke - send a random dad joke\n\n' +
                '/norrisjoke - send a random Chuck Norris joke\n\n';
    }
};

function handleMessage(receivedEvent) {
    if(receivedEvent.isCommand) {
        switch(receivedEvent.fullCommand[0].toLowerCase()) {
            case "/dadjoke":
                sendJoke(dadJokeApi, receivedEvent.message);
                break;
            case "/norrisjoke":
                sendJoke(norrisJokeApi, receivedEvent.message);
                break;
            default: ;
        }
    }
}

const dadJokeApi = {
    url:'https://icanhazdadjoke.com/',
    headers: {
        'Accept' : 'application/json'
    }
};

const norrisJokeApi = {
    url:'https://api.chucknorris.io/jokes/random'
}


function sendJoke(options, message) {
    request(options, function(err, res, body) {
        if(err) {
            api.sendMessage(err, {is_reply:true}, message);
        } else if (res && res.statusCode !== 200) {
            api.sendMessage('Failed to get dad joke.', {is_reply:true}, message);
        } else {
            var response = JSON.parse(body);
            if('value' in response) {
                api.sendMessage(response.value, {is_reply:true}, message); // handle norris resposne
            } else if ('joke' in response) {
                api.sendMessage(response.joke, {is_reply:true}, message); // handle dad response
            } else {
                api.sendMessage('unknown joke json format', {is_reply:true}, message);
            }
        }
    });
}

function rootpage(req, res) {
    res.render('root', app.getOptions(req, {name: module_name, version: module_version}));
}