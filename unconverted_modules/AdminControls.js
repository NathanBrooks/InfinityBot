'use strict';

const util = require('util');

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

var MongoDB = require('mongodb').MongoClient;

function handleMessage(message){
    if('text' in message) {
        //console.log(message);
        UpdateChatList(message);
        if(message.text[0] == '/' && message.from.id == process.env.ADMIN_ID) {
            parseCommand(message);
        }
    }
}

function UpdateChatList(message) {
    MongoDB.connect(process.env.MONGO_DATABASE, function(err, db) {
        if(!err) {
            db.collection('ChatList', function(err, collection) {
                if(!err) {
                    collection.update({chat_id: message.chat.id}, {chat_id : message.chat.id}, {upsert: true});
                } else {
                    console.log("Error accessing ChatList collection: " + err);
                }
            });
        } else {
            console.log("Error connecting to database: " + err);
        }
    });
}

function parseCommand(message){
    var paramList = message.text.split(/\s+/);
    var fullCommand = paramList[0].split(/@/);
    if(fullCommand.length == 1 ||                                   // no name was specified
       fullCommand[1].toLowerCase() == global.BotName.toLowerCase()) {     // check if the command was meant for us

        switch(fullCommand[0].toLowerCase()) {
            case "/adminsend":
                AdminSend(message.text.substr(message.text.indexOf(' ') + 1));
                break;
            default: ;
        }
    }
}

function AdminSend(messageText) {
    MongoDB.connect('mongodb://localhost:27017/testDB', function(err, db) {
        if(!err) {
            db.collection('ChatList', function(err, collection) {
                if(!err) {
                    collection.find().toArray(function(err, result) {
                        if(!err) {
                            for(var i in result) {
                                global.SendMessage(messageText, result[i].chat_id);
                            }
                        } else {
                            console.log("Error converting collection to array: " + err);
                        }
                    })
                } else {
                    console.log("Error accessing ChatList collection: " + err);
                }
            });
        } else {
            console.log("Error connecting to the database: " + err);
        }
    });
}

function rootpage(req, res) {
    res.render('root', {name: module_name, version: module_version});
}