'use strict';

const module_name = "Confirmation Module"
const module_version = "1.0"
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

        api.on('messageReceived', handleMessage);
        app.get(module_settings, rootpage);
    },

    free: function() {
        api.removeListener('messageReceived', handleMessage);

        api = null;
        app = null;
    },

    commandList: function() {
        return '/confirm - Confirm something (reply to a message to confirm that message)\n\n';
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
    message.extras.is_reply_to_reply = true;
    message.extras.is_reply = true;
    api.sendMessage("I can confirm this!", message);
}

function rootpage(req, res) {
    res.render('root', {name: module_name, version: module_version});
}