
/* Libs and APIs */
require('dotenv').config();                                     // used for secure user info
var events   = require('events');                               // events used for inter module communication

/* File Monitor Support */
var chokidar = require('chokidar');                             // file watcher
var path     = require('path');

/* Web Server Support */
var express  = require('express');                              // express web server
var session  = require('express-session');                      // express session handler
var webapp   = express();                                       // main express app handler
var hbs      = require('express-handlebars');                   // express handlebars middlewware
var passport = require('passport');                             // passport support for user credentials
var googleSt = require('passport-google-oauth2').Strategy;      // google oauth2 support for passport

global.BotName = process.env.BOT_NAME;                          // TODO: Get rid of this, just use the process call directly

var module_list = [];                                           // module handles
var help_list = [];                                             // list of commands and descriptions given by modules TODO: use module_list directly

/* Module Comms Handler */
var ApiHandler = new events.EventEmitter();
ApiHandler.setMaxListeners(50);

ApiHandler.Message = function(client_id, text, from_name, content, extras) {
    this.client_id = client_id;
    this.text = text;
    this.from_name = from_name;
    this.content = content;
    this.extras = extras;
}

ApiHandler.ReceivedEvent = function() {
    this.isCommand      = false;
    this.paramList      = [];
    this.fullCommand    = [];
    this.message        = {};
}

ApiHandler.receiveMessage = function(message) {
    var newEvent = new ApiHandler.ReceivedEvent();
    if(message) {
        newEvent.paramList = message.text.split(/\s+/);                              // split on spaces to get a list of parameters
        newEvent.fullCommand = newEvent.paramList[0].split(/@/);                              // split the first 'word' to support /command@botname
        if(newEvent.fullCommand.length == 1 ||                                           // no name was specified
           newEvent.fullCommand[1].toLowerCase() == global.BotName.toLowerCase()) {
            newEvent.isCommand = true;
        } else {
            newEvent.isCommand = false;
        }
        newEvent.message = message;
    }
    this.emit('messageReceived', newEvent);
}

ApiHandler.sendMessage = function(text, extras, message) {
    extras ? extras : extras = {}

    var outgoingMessage = new ApiHandler.Message(message.client_id, text, process.env.BOT_DISPLAY_NAME, message.content, extras)

    this.emit('messageSend', outgoingMessage);
}

/* Master Commands */
ApiHandler.on('messageReceived', function(receivedEvent) {
    if(receivedEvent.isCommand) {
        switch(receivedEvent.fullCommand[0].toLowerCase()) {                              // just to be safe
            case "/help":
                sendHelp(receivedEvent.message);                                    // always pass original message so ougoing api calls work properly
                break;
            default: ;
        }
    }
});

function sendHelp(message) {
    var helpOutput = '\n/help - This help message\n\n';

    for (var i in help_list) {
        if (help_list[i] != '') {
            helpOutput += help_list[i];
        }
    }
    ApiHandler.sendMessage(helpOutput, null, message);
}


/* WEB SUPPORT */
function compileNavbar() {
    var returnVal = "";

    returnVal +=
    '<li class="dropdown">' +
    '    <a href="#" data-toggle="dropdown">Modules<span class="ceret"></span></a>' +
        '<ul class="dropdown-menu">';

    for(var i in module_list) {
        if(!('module_client' in module_list[i]))
            returnVal += "<li><a href=\"" + module_list[i].module_settings + "\">" + module_list[i].module_name + "</a></li>";
    }

    returnVal +=
        '</ul>'+
    '</li>' +
    '<li class="dropdown">' +
    '    <a href="#" data-toggle="dropdown">APIS<span class="ceret"></span></a>' +
        '<ul class="dropdown-menu">';

    for(var i in module_list) {
        if('module_client' in module_list[i])
            returnVal += "<li><a href=\"" + module_list[i].module_settings + "\">" + module_list[i].module_name + "</a></li>";
    }

    returnVal +=
        '</ul>'+
    '</li>';

    return returnVal;
}

/* handlebards support */
handlebars = hbs.create({
    layoutsDir   : 'http/views/layouts',
    defaultLayout: 'main',
    partialsDir  : [
        'http/views/partials',
    ],
    helpers: {
        navbar: compileNavbar,
    }
});

/* OAUTH */
passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

passport.use(new googleSt({
    clientID:       process.env.OAUTH_CLIENT_ID,
    clientSecret:   process.env.OAUTH_CLIENT_SECRET,
    callbackURL:    'http://demonixfox.wtf/auth/google/callback',
    passReqToCallback : true
    },

    function(request, accessToken, refreshToken, profile, done) {
        process.nextTick(function () {
            return done(null, profile);
        });
    }
));

webapp.ensureAdmin = function (req) {
    if(req.isAuthenticated()) {
        return req.user.id == process.env.OAUTH_ADMIN_ID;                               // simple admin check
    }
    return false;
}

webapp.getOptions = function(req, options) {
    if(!options) options = {};
    options.signedIn = req.isAuthenticated();
    if(options.signedIn) {
        options.displayName = req.user.displayName;
    }
    return options;
}

/* webserver setup */

webapp.engine('handlebars', handlebars.engine);
webapp.set('view engine', 'handlebars');
webapp.set('views', 'http/views/layouts');

/* Webserver */
webapp.use('/share',express.static(path.join(__dirname, '/http/fonts')))
webapp.use('/share',express.static(path.join(__dirname, '/http/css')));
webapp.use('/share',express.static(path.join(__dirname, '/http/js')));
webapp.use(session({ secret: 'secret-session', name: 'infinityBot', resave: true, saveUninitialized: true}));
webapp.use(passport.initialize());
webapp.use(passport.session());
webapp.get('/', function(req, res) {
    res.render('home', webapp.getOptions(req));
});

webapp.get('/auth/google', passport.authenticate('google', { scope: [
    'https://www.googleapis.com/auth/plus.login',
    'https://www.googleapis.com/auth/plus.profile.emails.read']
}));

webapp.get( '/auth/google/callback',
        passport.authenticate( 'google', {
            successRedirect: '/',
            failureRedirect: '/login'
}));

webapp.get('/logout', function(req, res){
    req.logout();
    res.redirect('/');
});

webapp.get('/test', function(req, res) {
    if(req.isAuthenticated()) {
        if(webapp.ensureAdmin(req)) {
            res.render('root', webapp.getOptions(req, {name: req.user.displayName, version: 'you are an admin'}));
        } else {
            res.render('root', webapp.getOptions(req, {name: req.user.displayName, version: 'you are not an admin'}));
        }
    } else {
        res.redirect('/');
    }
});


var server = webapp.listen(80, function() {
    var host = server.address().address;
    var port = server.address().port;

    console.log("Web listening @ http://%s:%s", host, port);
})


/* file watcher */
var watcher = chokidar.watch(['./bot_modules', './api_modules'], {
    ignored: /[\/\\]\./,
    persistent: true
});

watcher.on('add', path => {
    module_list[path] = require('./' + path);
    module_list[path].init(ApiHandler, webapp, server);
    help_list[path] = module_list[path].commandList();
    console.log(path + " has been added");
});

watcher.on('unlink', path => {
    delete require.cache[require.resolve('./' + path)];
    module_list[path].free();
    delete module_list[path];
    delete help_list[path];
    console.log(path + " has been removed");
});