'use strict';

const module_name = "Example Module"
const module_version = "0.1"
const module_settings = "/ExampleModule"

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

var inc = 0;

function handleMessage(message){
    inc++;
    console.log("handled message: " + inc);
}
