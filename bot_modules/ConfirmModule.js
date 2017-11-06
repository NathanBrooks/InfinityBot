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

function handleMessage(receivedEvent){
    if(receivedEvent.isCommand) {
        switch(receivedEvent.fullCommand[0].toLowerCase()) {
            case "/confirm":
                confirmed(receivedEvent.message);
                break;
            default: ;
        }
    }
}

function confirmed(message){
    api.sendMessage("I can confirm this!", {is_reply : true, is_reply_to_reply : true}, message);
}

function rootpage(req, res) {
    res.render('root', app.getOptions(req, {name: module_name, version: module_version}));
}