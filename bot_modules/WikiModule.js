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
    },

    commandList: function() {
        return '/wiki <term/phrase> - Get wikipedia extract of <term/phrase>\n\n';
    }
};

function handleMessage(receivedEvent) {
    if(receivedEvent.isCommand) {
        switch(receivedEvent.fullCommand[0].toLowerCase()) {
            case "/wiki":
                wiki(receivedEvent.message);
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

                        api.sendMessage(answer, {is_reply : true}, message);
                        return
                    }
                }
            }

            api.sendMessage("Could not find an entry for that", {is_reply : true}, message);
        });
    });
}

function rootpage(req, res) {
    res.render('root', app.getOptions(req, {name: module_name, version: module_version}));
}