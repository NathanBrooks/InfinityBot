'use strict';
require('dotenv').config();
var http = require('http');

const module_name = "Meme Generator Module"
const module_version = "1.0"
const module_settings = "/MemeGeneratorModule"

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
       		case "/mg":
       	    	generateMeme(message);
       	    	break;
       		default: ;
    	}
    }
}

function generateMeme(message) {
	var textArr = message.text.split(/\s+/);
	textArr.splice(0,1);
	var searchTerm = "";
	var Line0 = "";
	var Line1 = "";
	var pollingLevel = 0;
	for(var newWord in textArr) {
		if(textArr[newWord] != ":") {
			switch(pollingLevel) {
				case 0:
					searchTerm += textArr[newWord] + " ";
					break;
				case 1:
					Line0 += textArr[newWord] + " ";
					break;
				case 2:
					Line1 += textArr[newWord] + " ";
				default: ;
			}
		} else {
			pollingLevel++;
		}
	}

	http.get('http://version1.api.memegenerator.net/Generators_Search?q=' + searchTerm + '&pageIndex=0&pageSize=1&apiKey=' + process.env.MG_API_KEY, function(res) {
		var body = '';

		res.on('data', function(chunk){
			body += chunk;
		});

		res.on('end', function() {
			var MG_SEARCH = JSON.parse(body);

			if(MG_SEARCH.result.length > 0) {

				var generatorID = MG_SEARCH.result[0].generatorID;
				var imageID = MG_SEARCH.result[0].imageUrl.match(/[^\/]+$/)[0].split('.')[0];
				//var imageID = MG_SEARCH.result[0].imageID;
				http.get('http://version1.api.memegenerator.net/Instance_Create?' +
					'username='+ process.env.MG_USER +'&password='+ process.env.MG_PASS +'&languageCode=en&generatorID=' + generatorID +
					'&imageID='+ imageID +'&text0=' + Line0 + '&text1=' + Line1 + '&apiKey=' + process.env.MG_API_KEY, function(mRes){
					var finalBody = '';
					mRes.on('data', function(chunk){
						finalBody += chunk;
					});

					mRes.on('end', function() {
						var MG_FINAL = JSON.parse(finalBody);
						if(MG_FINAL.success){
                            message.extras.is_reply = true;
							api.sendMessage("http://db3.memegenerator.net/cache/instances/folder621/500x/" + MG_FINAL.result.instanceID + ".jpg" /*MG_FINAL.result.instanceImageUrl*/, message);
						} else {
                            message.extras.is_reply = true;
							api.sendMessage('Sorry, failed to generate your meme',message);
					    }
                    })
				});
            } else {
                message.extras.is_reply = true;
                api.sendMessage('Sorry, failed to generate your meme', message);
            }
		});
	}).on('error', function(e) {
		console.log('got an error in request');
	});
}

function rootpage(req, res) {
    res.render('root', {name: module_name, version: module_version});
}