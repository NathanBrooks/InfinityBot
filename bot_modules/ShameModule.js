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

function handleMessage(receivedEvent) {
    if(receivedEvent.isCommand) {
        switch(receivedEvent.fullCommand[0].toLowerCase()) {
            case "/shame":
                shamed(receivedEvent.message);
                break;
            default: ;
        }
    }
}

function shamed(message){
   var shameShep = message.text.split(/\s+/);
   if(shameShep.length > 1) {
	api.sendMessage('For shame ' + shameShep[1] + '. For Shame.', null, message);
   }
}

function rootpage(req, res) {
    res.render('root', app.getOptions(req, {name: module_name, version: module_version}));
}