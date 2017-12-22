'use strict';

const util = require('util');
var https = require('https');
var amazon = require('amazon-product-api');

var client = amazon.createClient({
    awsId: process.env.AWS_ID,
    awsSecret: process.env.AWS_SECRET,
    awsTag: process.env.AWS_TAG
});

const module_name = "BTC Module"
const module_version = "1.0"
const module_settings = "/BTCModule"

var api;
var app;
var funny_objects = [
    "dildos",
    "cat stickers",
    "car keys",
    "cokes",
    "drink umbrellas",
    "body pillows",
    "sword art body pillows",
    "college textbooks",
    "rubber chickens",
    "dog collars",
    "squeeky toys",
    "bags of dog food",
    "Googles",
    "tea bags",
    "porn",
    "noose",
];

var funny_requests = [
    "BTC is worth: $%s\n\nWhich you could use to buy %s %s.",
    "BTC is worth: $%s\n\nThats as many as %s %s, and that is terrible.",
    "BTC is worth: $%s\n\nYou could use that money to buy %s %s and be set for life!",
    "BTC is worth: $%s\n\nYou could use that money to feed the starving kids in africa, or just spend it on %s %s."
];

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
        return '/btc - get the current BTC value in USD\n\n';
    }
};

function handleMessage(receivedEvent) {
    if(receivedEvent.isCommand) {
        switch(receivedEvent.fullCommand[0].toLowerCase()) {
            case "/btc":
                getBTC(receivedEvent.message);
                break;
            default: ;
        }
    }
}

function GetRandomInRange(max) {
  max = Math.floor(max);
  return Math.floor(Math.random() * max);
}


function getBTC(message) {
    https.get("https://blockchain.info/ticker", function(res) {
        var body = '';

        res.on('data', function(chunk) {
            body += chunk;
        });

        res.on('end', function() {
            if(res && res.statusCode != 200) {
                api.sendMessage('failed to get BTC value.', {is_reply: true}, message);
            } else {
                var data = JSON.parse(body);
                var value = data.USD.last;
                var saying = funny_requests[Math.floor(Math.random() * (funny_requests.length-1))];
                var object = funny_objects[Math.floor(Math.random() * (funny_objects.length-1))];

                client.itemSearch({
                    keywords: object,
                    responseGroup: 'ItemAttributes,Offers'
                }).then(function(results) {
                    if("length" in results && results.length > 0) {
                        var chosenItem = results[Math.floor(Math.random() * (results.length-1))];
                        var priceFlt = parseFloat(chosenItem.OfferSummary[0].LowestNewPrice[0].Amount[0])/100;
                        api.sendMessage(util.format(saying, value.toLocaleString('en'), Math.floor(value/priceFlt).toLocaleString('en'), object) + "\n\n" + chosenItem.DetailPageURL, {is_reply:true}, message);
                    } else {
                        console.log("didn't get an amazon hit...");
                        console.log(results);
                    }
                }).catch(function(err){
                    console.log('err');
                    console.log(err);
                    api.sendMessage(err.Error, {is_reply: true}, message);
                });
            }
        });
    });
}

function rootpage(req, res) {
    res.render('root', app.getOptions(req, {name: module_name, version: module_version}));
}