/*
 * Copyright 2018 Nathan Tyler Brooks
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 *
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

/* module requirements */
const discord = require('discord.js');
const fs = require('fs');

/* module setup */
const NAME = 'Discord Api';
const VERSION = '1.1';
const URI = '/DiscordAPI';
const CLIENTID = 'Discord';

// these will be initialized
var apiHandler = null;
var webApp = null;

module.exports = {
  name: NAME,
  version: VERSION,
  uri: URI,
  clientID: CLIENTID,

  init: (parentBotApi, parentWebApp) => {
    apiHandler = parentBotApi;
    webApp = parentWebApp;

    apiHandler.on('sendMessage', sendMessage);
    apiHandler.on('updateStatus', updateStatus);
    webApp.get(URI, getRootPage);
  },

  free: () => {
    apiHandler.removeListener('sendMEssage', sendMessage);

    apiHandler = null;
    webApp = null;
  },

  getCommands: () => {
    return '';
  }
}

var discordClient = new discord.Client();
discordClient.login(process.env.DISCORD_API_KEY);

var toggleFlag = false;

discordClient.on('message', (message) => {
  if(message.author.id + message.channel.id == process.env.BOT_DISCORD_UID) {
    return;
  }

  var strippedMessage = {
    'messageID': message.id,
    'channelID': message.channel.id
  }

  if(message.content == "testing" && !toggleFlag && false) {
    console.log("begin collection");
    toggleFlag = true;

    if (discordClient.channels.cache.has(message.channel.id)) {
      var messageManager = discordClient.channels.cache.get(message.channel.id).messages;
      var previousMessageId = "373724322168176641";

      function recursiveGet(lastMessageId) {
        return messageManager.fetch(
          {limit: 100, before: lastMessageId}).then((result) => {
            var finalMessage;
            result.forEach((msg) => {
              console.log(msg.content + " : " + JSON.stringify(msg.createdAt) + " :: ID::" + msg.id);

              if(msg.content[0] == '/' || msg.content[0] == '<') {
                console.log("skipping command");
              } else {
                var newStrippedMessage = {
                  'messageID': message.id,
                  'channelID': msg.channel.id
                }

                var newMessage = new apiHandler.Message(CLIENTID, CLIENTID +
                  msg.author.id + msg.channel.id, msg.content,
                  msg.author.username, newStrippedMessage, {});
                  apiHandler.receiveMessage(newMessage);
              }

              finalMessage = msg;
            });
            if(result.size == 100) {
              recursiveGet(finalMessage.id);
            } else {
              console.log("DONE!!!!!!!!!!!");
            }
          }).catch(console.err);
      }


      recursiveGet(previousMessageId);
    }
  }

  var newMessage = new apiHandler.Message(CLIENTID, CLIENTID +
      message.author.id + message.channel.id, message.content,
      message.author.username, strippedMessage, {});

  Object.freeze(newMessage); // freeze so that no modules change it
  apiHandler.receiveMessage(newMessage);
});

function sendMessage(message) {
  if(message.clientID == CLIENTID) {
    /* handle extras */
    var reply = false
    if ('isReply' in message.extras && message.extras.isReply) {
      reply = true;
    }

    if (discordClient.channels.cache.has(message.content.channelID)) {
      discordClient.channels.cache.get(message.content.channelID).messages.fetch(
          message.content.messageID).then((result) => {
            var output = 'Empty Message';
            if (message.text.length > 0) {
              output = message.text
            }

            if(reply) {
              result.reply(message.text);
            } else {
              result.channel.send(message.text);
            }
          }).catch(console.err);
    }
  }
}

function updateStatus(event) {
  if (event.message.clientID == CLIENTID) {
    var message = event.message;
    var channel = discordClient.channels.cache.get(message.content.channelID);

    if (channel) {
      switch (event.status) {
        case apiHandler.statusList.typing:
          channel.startTyping();
          break;
        case apiHandler.statusList.done:
          channel.stopTyping();
          break;
        default:;
      }
    }
  }
}

/* Web Handler */
function getRootPage(req, res) {
  res.render('root', webApp.getOptions(req, {name: NAME, version: VERSION}));
}