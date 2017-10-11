'use strict';

const module_name = "Shame Module"
const module_version = "1.0"
const module_settings = "/ShameModule"

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
        return '/shame <username> - Shames that user\n\n';
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
            case "/shame":
                shamed(message);
                break;
            default: ;
        }
    }
}


function shamed(message){
   var shameShep = message.text.split(/\s+/);
   if(shameShep.length > 1) {
	api.sendMessage('For shame ' + shameShep[1] + '. For Shame.', message);
   }
}

function rootpage(req, res) {
    res.render('root', {name: module_name, version: module_version});
}