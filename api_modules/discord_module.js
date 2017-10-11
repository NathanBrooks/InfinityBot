const module_name = 'Discord Api'
const module_version = '1.0'
const module_settings = '/DiscordAPI'
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

const Discord = require('discord.js');
const speak = require('simple-tts');
const fs = require('fs');
const discord_client = new Discord.Client();

discord_client.login(process.env.DISCORD_API_KEY);

discord_client.on('message', function(message) {
    if(message.author.id != discord_client.user.id) {
        message.guild.members.get(discord_client.user.id).setNickname(process.env.BOT_DISPLAY_NAME);
    	if(message.content.toLowerCase() == '/joinchannel' && message.member.voiceChannel) {
    		var voiceChannel = message.member.voiceChannel;
    		voiceChannel.join();
    	} else if (message.content.toLowerCase() == '/leavechannel' && message.member.voiceChannel && message.member.voiceChannel.connection) {
    		message.member.voiceChannel.leave();
    	}
    	var newMessage = new api.Message(client_id, message.content, message.author.username, message, {});
    	api.receiveMessage(newMessage);
    }
});

function sendMessage(message) {
    if(message.client_id == client_id) {
	    /* handle extras */
	    var reply = false;
	    if('is_reply' in message.extras && message.extras.is_reply) {
	        reply = true;
	    }


		var voiceChannel = message.content.member.voiceChannel;
		if(voiceChannel && voiceChannel.connection) {
	    	message.content.channel.send(message.text, {tts: true});
			//speak(" \"" + message.text.replace(/[\\"']/g, ' ').replace(/\u0000/g, '') + " \"", {format:'mp3', filename:'./' + message.content.id, lang:'en-uk-rp'});
			//var dispatcher = voiceChannel.connection.playFile('./' + message.content.id + '.mp3');
			//dispatcher.on('end', function(end){
			//	fs.unlinkSync('./' + message.content.id + '.mp3');
			//});
		} else {
			if(reply) {
	    		message.content.reply(message.text);
			} else {
	    		message.content.channel.send(message.text);
			}
		}
    }
}

function rootpage(req, res) {
    res.render('root', {name: module_name, version: module_version});
}