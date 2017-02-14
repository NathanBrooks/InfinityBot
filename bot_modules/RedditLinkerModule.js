'use strict';

const module_name = "Reddit Linker Module"
const module_version = "1.1"
const module_settings = "/RedditLinkerModule"

var api;
var app;

module.exports = {
	moudle_name: module_name,
	module_version: module_version,
	module_settings: module_settings,

    init: function(parent_api, parent_app) {
        api = parent_api;
        app = parent_app;

        api.on('message', handleMessage);
    },

    free: function() {
        api.removeListener('message', handleMessage);

        api = null;
        app = null;
    }
};

function handleMessage(message) {
    if('text' in message) {
        var linkCount = 0;
        var linkResult = "";
        var textArr = message.text.split(/\s+/);
        for(var newWord in textArr) {
	    var match = textArr[newWord].match(/^\/r\/|^r\//i);
            if(textArr[newWord].indexOf(match[0]) > -1) {
                linkResult += "http://www.reddit.com/r/" + textArr[newWord].split(/r\//i)[1] + "\n";
                linkCount++;
            }
        }

        if (linkCount > 0) global.SendMessage(linkResult, message.chat.id, message.message_id);
    }
}
