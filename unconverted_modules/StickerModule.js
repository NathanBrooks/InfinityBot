'use strict';

const module_name = "Sticker Module"
const module_version = "0.1"
const module_settings = "/StickerModule"

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

var stickers = {};
stickers['lewd'] = "CAADAQAD2QEAAjjiewy_RmjC8TKefwI";

var probs = {};
probs['lewd'] = .2;


function sendStickerProb(stickerString, chat_id, reply) {
    if(Math.random() < probs[stickerString]) {
        if(reply != null) {
            global.SendSticker(stickers[stickerString], chat_id, reply);
        } else {
            global.SendSticker(stickers[stickerString], chat_id);
        }
    }
}

function handleMessage(message){
    if('text' in message) {
        parseMessage(message);
    }
}

function parseMessage(message) {
    var lewdSearch = message.text.match(/lewd|lood|kinky/gi);
    if (lewdSearch != null) {
        if('reply_to_message' in message) {
            sendStickerProb('lewd', message.chat.id, message.reply_to_message.message_id);
        } else {
            sendStickerProb('lewd', message.chat.id, message.message_id);
        }
    }
}


function rootpage(req, res) {
    res.render('root', {name: module_name, version: module_version});
}