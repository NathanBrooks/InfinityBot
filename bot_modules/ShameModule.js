'use strict';

const module_name = "Shame Module"
const module_version = "0.1"
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
            case "/shame":
                shamed(message);
                break;
            default: ;
        }
    }
}


function shamed(message){
console.log('shaming');
   var shameShep = message.text.split(/\s+/);
   if(shameShep.length > 1) {
	   console.log('sending');
	global.SendMessage('For shame ' + shameShep[1] + '. For Shame.', message.chat.id);
   }
}

function rootpage(req, res) {
    res.render('Shame', {name: module_name, version: module_version});
}