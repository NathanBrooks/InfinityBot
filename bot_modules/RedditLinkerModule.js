'use strict';

const module_name = "Reddit Linker Module"
const module_version = "1.1"
const module_settings = "/RedditLinkerModule"

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
        return 'reddit linker - Identifies subreddits mentioned and provides a link to it\n\n';
    }
};

function handleMessage(message) {
    if('text' in message) {
        var linkCount = 0;
        var linkResult = "";
        var textArr = message.text.split(/\s+/);
        for(var newWord in textArr) {
	    var match = textArr[newWord].match(/^\/r\/|^r\//i);
            if(match != null && textArr[newWord].indexOf(match[0]) > -1) {
                linkResult += "http://www.reddit.com/r/" + textArr[newWord].split(/r\//i)[1] + "\n";
                linkCount++;
            }
        }

        if (linkCount > 0) {
            message.extras.is_reply = true;
            api.sendMessage(linkResult, message);
        }
    }
}

function rootpage(req, res) {
    res.render('root', {name: module_name, version: module_version});
}