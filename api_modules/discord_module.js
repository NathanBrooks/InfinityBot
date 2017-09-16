const module_name = 'Discord Api'
const module_version = '1.0'
const module_settings = '/Discord'
const client_id = 'Discord'

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
    },

    free: function() {
        api.removeListener('messageSend', sendMessage);

        api = null;
        app = null;
    }
}

const Discord = require('discord.js')
const discord_client = new Discord.Client();

discord_client.login(process.env.DISCORD_API_KEY);

discord_client.on('message', function(message) {
    var newMessage = new api.Message(client_id, message.content, message.author.username, message, {});
    api.receiveMessage(newMessage);
});

function sendMessage(message) {
    if(message.client_id == client_id) {
	    /* handle extras */
	    var reply = false;
	    if('is_reply' in message.extras && message.extras.is_reply) {
	        reply = true;
	    }

	    /*
	    var reply_to = 0;
	    if('is_reply_to_reply' in message.extras && message.extras.is_reply_to_reply && 'reply_to_message' in message.content) {
	        reply = true;
	        reply_to = message.content.reply_to_message.message_id;
	    }
		*/

		if(reply) {
    		message.content.reply(message.text);
		} else {
    		message.content.channel.send(message.text);
		}
    }
}
