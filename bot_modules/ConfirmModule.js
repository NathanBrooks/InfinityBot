'use strict';

const module_name = "Confirmation Module"
const module_version = "0.1"
const module_settings = "/ConfirmationModule"

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

var inc = 0;




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
            case "/confirm":
                confirmed(message);
                break;
            default: ;
        }
    }
}


function confirmed(message){
    if('reply_to_message' in message) {
        global.SendMessage("I can confirm this!", message.chat.id, message.reply_to_message.message_id);
    } else {
        global.SendMessage("I can confirm this!", message.chat.id, message.message_id);
    }
}

function rootpage(req, res) {
    res.render('Confirm', {name: module_name, version: module_version});
}