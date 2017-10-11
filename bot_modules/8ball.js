'use strict';

const util = require('util');

const module_name = "8ball Module"
const module_version = "1.0"
const module_settings = "/8ballModule"

var api;
var app;

var EightBallResultList = [
    "Yes, %s.",
    "It is certain!",
    "Without a doubt!",
    "You can rely on it!",
    "Maybe?",
    "Yes",
    "All signs point to yes!",
    "No...",
    "Are you kidding me, %s?",
    "Did you seriously just ask me that %s?",
    "Alright, see what you did here, %s, is seriously fuck up. Like, I cant even figure out how to answer this without literally vomiting",
    "Fuck no, get out of here with your shit, %s",
    "Aww, poor little %s having to come to me with their problems. \"No\" you bitch!",
    "Yes.\n\n I mean no!",
    "Answer unclear, please send a dollar to @FelixNox for a clearer answer.",
    "My sources say no. They also say you are a terrible person. Thats funny, I didn't even ask them that!",
    "Yes, definitely... unless its no",
    "Yes, %s, but you have to... {The rest of this answer is behind a paywall, send a dollar to @TheBestFoxo}",
    "Maybe, but more importantly, did you know that underground is the only word in the english language that starts with und and ends with und?",
    "HAHAHA. Everyone look at this guy! %s actually thought I would answer him!",
    "For sure!",
    "%s.... I mean, you are my best friend, but I got some bad news for you... No.",
    "Yes.\n\n What? Did you expect something funny? Complain to @TheBestFoxo to add more answers.",
    "Nope."
]

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
            case "/8ball":
                SendEightBallResult(message);
                break;
            default: ;
        }
    }
}

function GetRandomInRange(max) {
  max = Math.floor(max);
  return Math.floor(Math.random() * max);
}

function SendEightBallResult(message){
    var result = EightBallResultList[Math.floor(Math.random() * (EightBallResultList.length-1))];
    if(result.indexOf('%s') >= 0) {
        message.extras.is_reply = true;
        api.sendMessage(util.format(result, message.from_name), message);
    } else {
        message.extras.is_reply = true;
        api.sendMessage(result, message);
    }
}

function rootpage(req, res) {
    res.render('root', {name: module_name, version: module_version});
}