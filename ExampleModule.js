'use strict';

const module_name = "Example Module"                                        // module name (for title of webpage and debug)
const module_version = "1.0"                                                // version number
const module_settings = "/ExampleModule"                                    // root webpage location

var api;
var app;

module.exports = {
    module_name: module_name,
    module_version: module_version,
    module_settings: module_settings,

    init: function(parent_api, parent_app) {
        api = parent_api;
        app = parent_app;

        api.on('messageReceived', handleMessage);                           // attach to infinity bot message api
        app.get(module_settings, rootpage);                                 // attach to infinity bot web server
    },

    free: function() {
        api.removeListener('message', handleMessage);                       // detach when removing

        api = null;
        app = null;
    },

    commandList: function() {
        return '/example - Reply with example message\n\n';
    }
};

function handleMessage(message){
    if('text' in message) {                                                 // check that its a valid message (more of a holdover from when this was just telegram)
        parseCommand(message);
    }
}

function parseCommand(message){
    var paramList = message.text.split(/\s+/);                              // split on spaces to get a list of parameters
    var fullCommand = paramList[0].split(/@/);                              // split the first 'word' to support /command@botname
    if(fullCommand.length == 1 ||                                           // no name was specified
       fullCommand[1].toLowerCase() == global.BotName.toLowerCase()) {      // check if the command was meant for us

        switch(fullCommand[0].toLowerCase()) {                              // just to be safe
            case "/example":
                exampleCommand(message);                                    // always pass original message so ougoing api calls work properly
                break;
            default: ;
        }
    }
}

function exampleCommand(message) {
    // special attributes can be attached to the message.extras attribute
    // they are api specific and will not affect any api not supporting them
    api.sendMessage('example message handled', message);                    // have to pass original message so outgoing api is handled correctly
}