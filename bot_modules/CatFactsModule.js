'use strict';
var request = require('request');
var MongoDB = require('mongodb').MongoClient;

const module_name = "Cat Facts Module"
const module_version = "1.0"
const module_settings = "/CatFactsModule"

var api;
var app;

module.exports = {
    module_name: module_name,
    module_version: module_version,
    module_settings: module_settings,

    init: function(parent_api, parent_app) {
        api = parent_api;
        app = parent_app;

        /* TODO: restart timers */

        api.on('messageReceived', handleMessage);
        app.get(module_settings, rootpage);
    },

    free: function() {
        api.removeListener('messageReceived', handleMessage);

        api = null;
        app = null;
    },

    commandList: function() {
        return '/catfact - send a random Cat Fact\n\n' +
                '/subscribe - subscribe to Cat Facts\n\n' +
                '/unsubscribe - unsubscribe from Cat Facts\n\n';
    }
};

function handleMessage(receivedEvent) {
    if(receivedEvent.isCommand) {
        switch(receivedEvent.fullCommand[0].toLowerCase()) {
            case "/catfact":
                catFact(receivedEvent.message);
                break;
            case "/subscribe":
                subscribe(receivedEvent.message);
                break;
            case "/unsubscribe":
                unsubscribe(receivedEvent.message);
                break;
            case "/ndlte":
                cleanDatabase();
                break;
            case "/debug":
                listUsers();
                break;
            default: ;
        }
    } else {
        checkAnswer(receivedEvent.message);
    }
}

var catFactApi = {
    url:'https://catfact.ninja/fact'
}

function catFact(message, is_reply) {
    request(catFactApi, function(err, res, body) {
        if(err) {
            api.sendMessage(err, {is_reply: is_reply}, message);
        } else if (res && res.statusCode !== 200) {
            api.sendMessage("Failed to get Cat Fact.", {is_reply: is_reply}, message);
        } else {
            var response = JSON.parse(body);
            if(response && 'fact' in response) {
                api.sendMessage("Cat Fact: " + response.fact, {is_reply: is_reply}, message);
            } else {
                api.sendMessage("Received Improper JSON response.", {is_reply: is_reply}, message);
            }
        }
    });
}

function AddUser(message) {
    MongoDB.connect(process.env.MONGO_DATABASE, function(err, db) {
        if(!err) {
            var CatUsers = db.collection('CatUsers');
            CatUsers.update({}, {UID: message.uid, subscription: true, message: message}, {upsert : true});
        } else { console.log(err); }
        if(db) { db.close(); }
    });
}

function RemoveUser(message) {
    MongoDB.connect(process.env.MONGO_DATABASE, function(err, db) {
        if(!err) {
            var CatUsers = db.collection('CatUsers');
            CatUsers.update({UID: message.uid}, {subscription: false}, {upsert : true});
        } else { console.log(err); }
        if(db) { db.close(); }
    });
}

var callMessages = [
    "INCORRECT. Your favorite animal is the cat. Reply unsubscribe to stop.",
    "Command not recognized. Please let us know you are human by completing the following sentence: Your favorite animal is the {blank}.",
    "Command not recognized. You will continue to be subscribed to Cat Facts! Reply cancel to stop.",
]

var responseMessages = [
    "unsubscribe",
    "noResp",
    "cancel",
]

function subscribe(message) {
    api.sendMessage("Thank you for subscribing to Cat Facts! You will receive hourly updates!", {is_reply: true}, message);
    AddUser(message);
    catFact(message, true);
}

var unsubscribeUsers = {};


function unsubCall(message) {
    if(unsubscribeUsers[message.uid] !== undefined) {
        unsubscribeUsers[message.uid]--;
        if(unsubscribeUsers[message.uid] == -1) {
            unsubscribeUsers[message.uid] = undefined;
            RemoveUser(message);
            api.sendMessage("You have sucessfully unsubscribed from Cat Facts :(", {is_reply: true}, message);
        } else {
            api.sendMessage(callMessages[unsubscribeUsers[message.uid]], {is_reply: true}, message);
        }
    } else {
        api.sendMessage("You are not currently unsubscribing and should not receive this message!", {is_reply: true}, message);
    }
}

function checkAnswer(message) {
    if(unsubscribeUsers[message.uid] !== undefined) {
        if(message.text.toLowerCase() === responseMessages[unsubscribeUsers[message.uid]] || responseMessages[unsubscribeUsers[message.uid]] === "noResp") {
            unsubCall(message);
        } else {
            unsubscribeUsers[message.uid] = undefined;
            api.sendMessage("Re-confirming subscription to cat facts! You will continue to receive hourly updates!", {is_reply: true}, message);
            catFact(message, true);
        }
    }
}

function unsubscribe(message) {
    MongoDB.connect(process.env.MONGO_DATABASE, function(err, db) {
        if(!err) {
            db.collection('CatUsers').find({UID: message.uid}).toArray(function(err, result) {
                if(!err) {
                    if(result && result.length > 0) {
                        if(result[0].subscription) {
                            unsubscribeUsers[message.uid] = callMessages.length;
                            unsubCall(message);
                        }
                    } else {
                        api.sendMessage("You are not currently subscribed to Cat Facts! Please send /subscribe to join!", {is_reply: true}, message);
                    }
                }
            });
        }
        if(db) { db.close(); }
    });
}

function massCatFact() {
    MongoDB.connect(process.env.MONGO_DATABASE, function(err, db) {
        if(!err) {
            db.collection('CatUsers', function(err, collection) {
                collection.find().forEach(function(e) {
                    if(e.subscription) {
                        catFact(e.message, false);
                    }
                });
                setTimeout(massCatFact, 3600000);
            });
        } else { console.log(err); }
        if(db) { db.close(); }
    });
}
massCatFact();

function cleanDatabase() {
    MongoDB.connect(process.env.MONGO_DATABASE, function(err, db) {
        if(!err) {
            console.log("deleting");
            db.collection('CatUsers').remove();
        } else { console.log(err); }
        if(db) { db.close(); }
    });
}

function listUsers() {
    console.log('listing users');
    MongoDB.connect(process.env.MONGO_DATABASE, function(err, db) {
        if(!err) {
            db.collection('CatUsers', function(err, collection) {
                collection.find().forEach(function(e) {
                    console.log("User: " + e.UID + " subscription: " + e.subscription);
                });
            });
        } else { console.log(err); }
        if(db) { db.close(); }
    })
}



function rootpage(req, res) {
    res.render('root', app.getOptions(req, {name: module_name, version: module_version}));
}