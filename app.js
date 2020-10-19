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

/*
 * Libs and Apis:
 * chokidar: used for file/folder monitoring
 * events: used for inter module communication
 * express: used for web webServer
 * express-handlebars: express handlebars middleware
 * express-session: express session handler
 * path: used for parsing paths
 * passport: used for managin user credentials
 * passport-google-oauth2: passport google oauth strategy
 * dotenv: used for secure user info
 */

const chokidar = require('chokidar');
const events = require('events');
const express = require('express');
const expressHandlebars = require('express-handlebars');
const expressSession = require('express-session');
const path = require('path');
const passport = require('passport');
const PassportGoogleOauth2 = require('passport-google-oauth2').Strategy;
/** @suppress {extraRequire} initalizes .env data into process.env */
require('dotenv').config();

/* Module Comms Handler */
var apiHandler = new events.EventEmitter();
apiHandler.setMaxListeners(50);
// ties for intermodule communication
apiHandler.moduleRequest = new events.EventEmitter();
apiHandler.moduleRequest.setMaxListeners(50);

apiHandler.Message = class {
  constructor(clientID, uid, text, fromName, content, extras) {
    this.clientID = clientID;
    this.uid = uid;
    this.text = text;
    this.fromName = fromName;
    this.content = content;
    this.extras = extras;
  }
}

apiHandler.ReceivedEvent = class {
  constructor() {
    this.isCommand = false;
    this.paramList = [];
    this.fullCommand = [];
    this.message = [];
  }
}

apiHandler.statusEvent = class {
  constructor(status, message) {
    this.message = message;
    this.status = status;
  }
}

apiHandler.statusList = {
    typing: 'typing',
    done: 'done'
}

apiHandler.receiveMessage = (message) => {
  var newEvent = new apiHandler.ReceivedEvent();
  if(message) {
    var botName = process.env.BOT_NAME.toLowerCase();
    newEvent.paramList = message.text.split(/\s+/);
    newEvent.fullCommand = newEvent.paramList[0].split(/@/);

    newEvent.isCommand = (message.text[0] == '/' &&
        (newEvent.fullCommand.length == 1 ||
        newEvent.fullCommand[1].toLowerCase() == botName));


    newEvent.message = message;
  }
  apiHandler.emit('receiveMessage', newEvent);
}

apiHandler.sendMessage = (text, extras, message) => {
  extras ? extras : extras = {};

  var outgoingMessage = new apiHandler.Message(message.clientID, message.uid,
    text, process.env.BOT_DISPLAY_NAME, message.content, extras);

  apiHandler.emit('sendMessage', outgoingMessage);
}

apiHandler.setBotStatus = (status, message) => {
  var event = new apiHandler.statusEvent(status, message);
  apiHandler.emit('updateStatus', event);
}

/* Master Commands */
var moduleHandles = []; // handles to modules

apiHandler.on('receiveMessage', (receivedEvent) => {
  if(receivedEvent.isCommand) {
    switch(receivedEvent.fullCommand[0].toLowerCase()) {
      case "/help":
        sendHelp(receivedEvent.message);
        break;
      default:
    }
  }
});

function sendHelp(message) {
  //var helpOutput = '\n/help - This help message\n\n';
  var helpOutput = '';
  for (var i in moduleHandles) {
    if (moduleHandles[i].getCommands() != '') {
      helpOutput += moduleHandles[i].getCommands();
    }
  }
  apiHandler.sendMessage(helpOutput, null, message);
}

/* WEB SUPPORT */
var webApp   = express(); // create express webapp
// TODO: use moduleHandles directly

function compileNavbar() {
  var returnVal = "";

  returnVal = `<li class='dropdown'>
  <a href='#' data-toggle='dropdown'>Modules<span class='ceret'></span></a>
<ul class='dropdown-menu'>`;


  for (var i in moduleHandles) {
    if (!('clientID' in moduleHandles[i])) {
      returnVal += `<li><a href=' ${moduleHandles[i].uri} '>
      ${moduleHandles[i].name}</a></li>`;
    }
  }

  returnVal += `</ul>
</li>
<li class='dropdown'>
  <a href='#' data-toggle='dropdown'>APIS<span class='ceret'</span></a>
  <ul class='dropdown-menu'>`;

  for (var i in moduleHandles) {
    if ('clientID' in moduleHandles[i]) {
      returnVal += `<li><a href=' ${moduleHandles[i].uri} '>
      ${moduleHandles[i].name}</a></li>`;
    }
  }

  returnVal += `</ul>
</li>`;

  return returnVal
}

/* handlebards support */
var handlebars = expressHandlebars.create({
  layoutsDir: 'http/views/layouts',
  defaultLayout: 'main',
  partialsDir: [
    'http/views/partials',
  ],
  helpers: {
    navbar: compileNavbar,
  }
});

/* OAUTH */
passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((obj, done) => {
  done(null, obj);
});

passport.use(new PassportGoogleOauth2({
  clientID: process.env.OAUTH_CLIENT_ID,
  clientSecret: process.env.OAUTH_CLIENT_SECRET,
  callbackURL: 'http://demonixfox.wtf/auth/google/callback',
  passReqToCallback: true,
  },

  (request, accessToken, refreshToken, profile, done) => {
    process.nextTick(() => {
      return done(null, profile);
    });
  }
));

webApp.ensureAdmin = (req) => {
  if (req.isAuthenticated()) {
    return req.user.id == process.env.OAUTH_ADMIN_ID;
  } else {
    return false;
  }
}

webApp.getOptions = (req, options) => {
  if(!options) { options = {}; }

  options.signedIn = req.isAuthenticated();
  if(options.signedIn) {
    options.displayName = req.user.displayName;
  }

  return options;
}

/* webserver setup */
webApp.engine('handlebars', handlebars.engine);
webApp.set('view engine', 'handlebars');
webApp.set('views', 'http/views/layouts');

/* Webserver */
webApp.use('/share',express.static(path.join(__dirname, '/http/fonts')))
webApp.use('/share',express.static(path.join(__dirname, '/http/css')));
webApp.use('/share',express.static(path.join(__dirname, '/http/js')));
webApp.use(expressSession({ secret: 'secret-session', name: 'infinityBot',
    resave: true, saveUninitialized: true}));
webApp.use(passport.initialize());
webApp.use(passport.session());

webApp.get('/', (req, res) => {
  res.render('home', webApp.getOptions(req));
});

webApp.get('/auth/google', passport.authenticate('google', {scope: [
  'https://www.googleapis.com/auth/plus.login',
  'https://www.googleapis.com/auth/plus.profile.emails.read',
  ]})
);

webApp.get('/auth/google/callback', passport.authenticate('google', {
  successRedirect: '/',
  failureRedirect: '/login',
}));

webApp.get('/logout', (req, res) => {
  req.logout();
  res.redirect('/');
});

webApp.get('/test', (req, res) => {
  if (req.isAuthenticated()) {
    if (webApp.ensureAdmin(req)) {
      res.render('root', webApp.getOptions(req, {name: req.user.displayName,
        version: 'you are an admin'}));
    } else {
      res.render('root', webApp.getOptions(req, {name: req.user.displayName,
        version: 'you are not an admin'}));
    }
  }
});

/* initialize the webServer */
/*
var webServer = webApp.listen(8080, () => {
  var host = webServer.address().address;
  var port = webServer.address().port;

  console.log('Web listening @ http://%s:%s', host, port);
})
*/
var webServer = {};

/* module monitor */
var watcher = chokidar.watch(['./bot_modules', './api_modules'], {
  ignored: /[\/\\]\./,
  persistent: true,
});

watcher.on('add', (path) => {
  moduleHandles[path] = require('./' + path);
  moduleHandles[path].init(apiHandler, webApp, webServer);
  console.log(path + ' has been added');
});

watcher.on('unlink', (path) => {
  delete require.cache[require.resolve('./' + path)];
  moduleHandles[path].free();
  delete moduleHandles[path];
  console.log(path + ' has been removed');
});
