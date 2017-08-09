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

        api.on('message', handleMessage);
        app.get(module_settings, rootpage);
    },

    free: function() {
        api.removeListener('message', handleMessage);

        api = null;
        app = null;
    }
};


function handleMessage(message){
    if('text' in message) {
        if(message.text[0] == '/') {
            parseCommand(message);
        }
    }
}

function parseCommand(message){
    var paramList = message.text.split(/\s+/);
    var fullCommand = paramList[0].split(/@/);
    if(fullCommand.length == 1 ||                                   // no name was specified
       fullCommand[1].toLowerCase() == global.BotName.toLowerCase()) {     // check if the command was meant for us

        switch(fullCommand[0].toLowerCase()) {
            case "/roll":
                roll(message);
                break;
            case "/flip":
                flip(message);
                break;
            default: ;
        }
    }
}

function flip(message) {
    if(Math.random() < .5) {
        global.SendMessage('Coin toss result: Heads!', message.chat.id, message.message_id);
    } else {
        global.SendMessage('Coin toss result: Tails!', message.chat.id, message.message_id);
    }
}

function roll(message) {
    var rollType = message.text.split(/\s+/);

    if(rollType.length != 2) {
        global.SendMessage('sorry, that is an invalid roll!', message.chat.id, message.message_id);
        return;
    }

    var rollInfo = rollType[1].split(/d/gi);

    if(rollInfo.length != 2 || (isNaN(parseInt(rollInfo[0])) || isNaN(parseInt(rollInfo[1]))) || parseInt(rollInfo[0]) > 16777215 || parseInt(rollInfo[1]) > 16777215) {
        global.SendMessage('sorry, that is an invalid roll!', message.chat.id, message.message_id);
        return;
    }

    var rollSum = 0;

    for(var i=0; i<parseInt(rollInfo[0]); i++) {
        rollSum += Math.floor(Math.random() * (rollInfo[1])) + 1;
    }

    global.SendMessage('The result of rolling ' + rollInfo[0] + ' ' + rollInfo[1] + ' sided dice is: ' + rollSum, message.chat.id, message.message_id);
}

/*
function handleMessage(message) {
    if('text' in message) {
        var linkCount = 0;
        var linkResult = "";
        var textArr = message.text.split(/\s+/);
        for(var newWord in textArr) {
	    var match = textArr[newWord].match(/^\/r\/|^r\//i);
            if(match != null && textArr[newWord].indexOf(match[0]) > -1) {
                linkResult += "http://www.reddit.com/r/" + textArr[newWord].split(/r\//i)[1] + "\n";
                linkCount++;
            }
        }

        if (linkCount > 0) global.SendMessage(linkResult, message.chat.id, message.message_id);
    }
}
*/

function rootpage(req, res) {
    res.render('Chance', {name: module_name, version: module_version});
}