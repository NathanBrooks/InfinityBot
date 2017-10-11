'use strict';
require('dotenv').config();
var https = require('https');

const module_name = "Wikipedia Module"
const module_version = "1.0"
const module_settings = "/WikipediaModule"

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
    }
};

function handleMessage(message) {
	if('text' in message) {
        if(message.text[0] == '/') {
            parseCommand(message);
        }
    }
}

function parseCommand(message) {
    var paramList = message.text.split(/\s+/);
    var fullCommand = paramList[0].split(/@/);
	if(fullCommand.length == 1 || 									// no name was specified
 	   fullCommand[1].toLowerCase() == global.BotName.toLowerCase()) {     // check if the command was meant for us

    	switch(fullCommand[0].toLowerCase()) {
       		case "/wiki":
                wiki(message);
       	    	break;
       		default: ;
    	}
    }
}

function wiki(message) {
    var topicURI = encodeURI(message.text.substr(message.text.indexOf(' ') + 1));
    https.get('https://en.wikipedia.org/w/api.php?format=json&action=query&indexpageids=1&redirects=1&prop=extracts&exintro=&explaintext=&titles=' + topicURI, function(res) {
        var body = '';

        res.on('data', function(chunk) {
            body += chunk;
        });

        res.on('end', function() {
            var results = JSON.parse(body);

            if(results) {
                if('query' in results && 'pageids' in results.query && results.query.pageids.length > 0) {
                    if ('pages' in results.query) {
                        var answer = results.query.pages[results.query.pageids[0]].title +
                        '\n\n' +
                        results.query.pages[results.query.pageids[0]].extract;

                        message.extras.is_reply = true;
                        api.sendMessage(answer, message);
                        return
                    }
                }
            }

            message.extras.is_reply = true;
            api.sendMessage("Could not find an entry for that", message);
        });
    });
}

function rootpage(req, res) {
    res.render('root', {name: module_name, version: module_version});
}