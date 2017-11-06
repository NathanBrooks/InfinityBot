'use strict';

const module_name = "Chance Module"
const module_version = "1.1"
const module_settings = "/ChanceModule"

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
        return '/roll <#1>d<#2> - Roll <#1> <#2> sided dice\n\n'
        + '/flip - Flip a coin\n\n';
    }
};

function handleMessage(receivedEvent) {
    if(receivedEvent.isCommand) {
        switch(receivedEvent.fullCommand[0].toLowerCase()) {
            case "/roll":
                roll(receivedEvent.message);
                break;
            case "/flip":
                flip(receivedEvent.message);
                break;
            default: ;
        }
    }
}

function flip(message) {
    if(Math.random() < .5) {
        api.sendMessage('Coin toss result: Heads!', {is_reply : true}, message);
    } else {
        api.sendMessage('Coin toss result: Tails!', {is_reply : true}, message);
    }
}

function roll(message) {
    var rollType = message.text.split(/\s+/);

    if(rollType.length != 2) {
        api.sendMessage('sorry, that is an invalid roll!', {is_reply : true}, message);
        return;
    }

    var rollInfo = rollType[1].split(/d/gi);

    if(rollInfo.length != 2 || (isNaN(parseInt(rollInfo[0])) || isNaN(parseInt(rollInfo[1]))) || parseInt(rollInfo[0]) > 16777215 || parseInt(rollInfo[1]) > 16777215) {
        api.sendMessage('sorry, that is an invalid roll!', {is_reply : true}, message);
        return;
    }

    var rollSum = 0;

    for(var i=0; i<parseInt(rollInfo[0]); i++) {
        rollSum += Math.floor(Math.random() * (rollInfo[1])) + 1;
    }

    api.sendMessage('The result of rolling ' + rollInfo[0] + ' ' + rollInfo[1] + ' sided dice is: ' + rollSum, {is_reply : true}, message);
}

function rootpage(req, res) {
    res.render('root', app.getOptions(req, {name: module_name, version: module_version}));
}