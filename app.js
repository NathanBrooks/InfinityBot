require('dotenv').config();

/* libs and apis */
var Telegram = require('telegram-bot-api');
var chokidar = require('chokidar');

/* initialize telegram api */

var BotName = process.env.BOT_NAME
var api = new Telegram({
        token: process.env.TEL_API_KEY,
        updates: {
            enabled: true
    }
});

/* telegram api helpers */
global.SendMessage = function SendMessage(message, chat_id, reply) {
    if (message.split(/\s/) <= 1) {
        api.sendMessage({
            chat_id: chat_id,
            text: "<Empty Message>",
            disable_web_page_preview: true,
            reply_to_message_id: (reply != null ? reply : undefined)
        });
    } else {
        var i = 0;
        while(i != message.length) {
            var tmp = i;
            i = Math.min(i + 4096, message.length);
            api.sendMessage({
                chat_id: chat_id,
                text: message.substring(tmp, i),
                disable_web_page_preview: "true",
                reply_to_message_id: (reply != null ? reply : undefined)
            });
        }
    }
}

/* file watcher stuff */

var module_list = [];

var watcher = chokidar.watch('./bot_modules', {
    ignored: /[\/\\]\./,
    persistent: true
});

watcher.on('add', path => {
    module_list[path] = require('./' + path);
    module_list[path].init(api, null);
    console.log(path + " has been added");
});

watcher.on('unlink', path => {
    module_list[path].free();
    module_list.splice(module_list.indexOf(path), 1);
    console.log(path + " has been removed");
});
