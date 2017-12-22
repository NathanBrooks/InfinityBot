const module_name = 'Telegram Api'
const module_version = '1.0'
const module_settings = '/TelegramAPI'
const client_id = 'Telegram'

var api;
var app;

module.exports = {
    module_name: module_name,
    module_version: module_version,
    module_settings: module_settings,
    module_client: client_id,

    init: function(parent_api, parent_app) {
        api = parent_api;
        app = parent_app;

        api.on('messageSend', sendMessage);
        app.get(module_settings, rootpage);
    },

    free: function() {
        api.removeListener('messageSend', sendMessage);

        api = null;
        app = null;
    },

    commandList: function() {
        return '';
    }
}

var telegramApi = require('telegram-bot-api');

var telegram = new telegramApi({
        token: process.env.TEL_API_KEY,
        updates: {
            enabled: true
    }
});

telegram.on('message', function(message) {
    if('text' in message) {
        var newMessage = new api.Message(client_id, client_id + message.from.id + message.chat.id, message.text, message.from.first_name, message, {});
        Object.freeze(newMessage);
        api.receiveMessage(newMessage);
    }
});

function sendMessage(message) {
    if(message.client_id == client_id) {
        /* handle extras */
        var reply = false;
        var reply_to = 0;
        if('is_reply' in message.extras && message.extras.is_reply) {
            reply = true;
            reply_to = message.content.message_id;
        }

        if('is_reply_to_reply' in message.extras && message.extras.is_reply_to_reply && 'reply_to_message' in message.content) {
            reply = true;
            reply_to = message.content.reply_to_message.message_id;
        }
        if (message.text.split(/\s/) <= 1) {
            telegram.sendMessage({
                chat_id: message.content.chat.id,
                text: "<Empty Message>",
                reply_to_message_id: (reply ? reply_to : undefined)
            });
        } else {
            var i = 0;
            while(i != message.text.length) {
                var tmp = i;
                i = Math.min(i + 4096, message.text.length);
                telegram.sendMessage({
                    chat_id: message.content.chat.id,
                    text: message.text.substring(tmp, i),
                    reply_to_message_id: (reply ? reply_to : undefined)
                });
            }
        }
    }
}

function rootpage(req, res) {
    res.render('root', app.getOptions(req, {name: module_name, version: module_version}));
}