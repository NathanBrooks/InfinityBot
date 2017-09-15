'use strict';

var http = require('http');

const module_name = "Admin Control"
const module_version = "1.0"
const module_settings = "/AdminControl"

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
        parseCommand(message);
    }
}

function parseCommand(message){
    var paramList = message.text.split(/\s+/);
    var fullCommand = paramList[0].split(/@/);
    if(fullCommand.length == 1 ||                                   // no name was specified
       fullCommand[1].toLowerCase() == global.BotName.toLowerCase()) {     // check if the command was meant for us

        switch(fullCommand[0].toLowerCase()) {
            case "/define":
                defineMessage(message);
                break;
            default: ;
        }
    }
}

function defineMessage(message) {
    var searchTerm = message.text.substr(message.text.indexOf(' ') + 1).replace(/\s/g, '+');
    http.get('http://api.urbandictionary.com/v0/define?term=' + searchTerm, function(res) {
        var body='';
        res.on('data', function(chunk) {
            body += chunk;
        });

        res.on('end', function() {
            var UD_SEARCH = JSON.parse(body);

            if(UD_SEARCH.list.length > 0) {
                var word = UD_SEARCH.list[0].word;
                var definition = UD_SEARCH.list[0].definition;
                var example = UD_SEARCH.list[0].example;

                global.SendMessage(word + ":\n\n" + definition + "\n\nExample:\n\n" + example, message.chat.id);
            } else {
                global.SendMessage('Could not define that word!', message.chat.id);
            }
        });
    });
}


function rootpage(req, res) {
    res.render('AdminControl', {name: module_name, version: module_version});
}