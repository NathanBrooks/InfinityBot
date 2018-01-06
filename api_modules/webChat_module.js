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
const socketIo = require('socket.io');

/* module setup */
const NAME = 'Web Chat Api';
const VERSION = '1.0';
const URI = '/WebChatAPI';
const CLIENTID = 'WebChat';

// these will be initialized in module.exports.init
var apiHandler = null;
var webApp = null;

module.exports = {
  name: NAME,
  version: VERSION,
  uri: URI,
  clientID: CLIENTID,

  init: (parentBotApi, parentWebApp, parentServer) => {
    apiHandler = parentBotApi;
    webApp = parentWebApp;

    apiHandler.on('sendMessage', sendMessage);
    webApp.get(URI, getRootPage);
    webApp.get(URI + '/chat', getChatPage);

    // setup sockets for chat page
    var io = socketIo.listen(parentServer);
    io.sockets.on('connection', handleSocket);
  },

  free: () => {
    apiHandler.removeListener('sendMessage', sendMessage);
    apiHandler = null;
  },

  getCommands: () => {
    return '';
  }
}

function handleSocket(socket) {
  socket.emit('message', {message: 'Welcome to ' +
      process.env.BOT_DISPLAY_NAME});
  socket.on('send', (data) => {
    if(data && 'message' in data) {
      var newMessage = new apiHandler.Message(CLIENTID, 0, data.message,
          'Web User', socket, {});
      Object.freeze(newMessage); // so that no modules change it
      apiHandler.receiveMessage(newMessage);
    }
  });
}

function sendMessage(message) {
  if(message.clientID == CLIENTID) {
    var socket = message.content;
    var output = 'Empty Message';

    if(message.text.length > 1) {
      output = message.text;
    }

    socket.emit('message', {message: output});
  }
}

/* Web Handler */
function getRootPage(req, res) {
  res.render('root', webApp.getOptions(req, {name: NAME, version: VERSION}));
}

function getChatPage(req, res) {
  res.render('WebChatAPI/chat', webApp.getOptions(req));
}