
/* libs and apis */
require('dotenv').config();
var chokidar = require('chokidar');
var path     = require('path');
var express  = require('express');
var session  = require('express-session');
var webapp   = express();
var hbs      = require('express-handlebars');
var events   = require('events');
var passport = require('passport');
var googleSt = require('passport-google-oauth2').Strategy;

/* API Handler */
var ApiHandler = new events.EventEmitter();
ApiHandler.setMaxListeners(50);

ApiHandler.Message = function(client_id, text, from_name, content, extras) {
    this.client_id = client_id;
    this.text = text;
    this.from_name = from_name;
    this.content = content;
    this.extras = extras;
}

ApiHandler.receiveMessage = function(message) {
    this.emit('messageReceived', message);
}

ApiHandler.sendMessage = function(text, extras, message) {
    extras ? extras : extras = {}

    var outgoingMessage = new ApiHandler.Message(message.client_id, text, process.env.BOT_DISPLAY_NAME, message.content, extras)

    this.emit('messageSend', outgoingMessage);
}

global.BotName = process.env.BOT_NAME;

var module_list = [];
var help_list = [];

/* master commands */
ApiHandler.on('messageReceived', function(message) {
    if('text' in message) {
        var paramList = message.text.split(/\s+/);                              // split on spaces to get a list of parameters
        var fullCommand = paramList[0].split(/@/);                              // split the first 'word' to support /command@botname
        if(fullCommand.length == 1 ||                                           // no name was specified
           fullCommand[1].toLowerCase() == global.BotName.toLowerCase()) {      // check if the command was meant for us

            switch(fullCommand[0].toLowerCase()) {                              // just to be safe
                case "/help":
                    sendHelp(message);                                    // always pass original message so ougoing api calls work properly
                    break;
                default: ;
            }
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


var server = webapp.listen(80, function() {                                      // I really don't like that I made this global, but I don't want to update every modules init function
    var host = server.address().address;                                            // should actually be safe to pass in init because nothing else is looking at it...
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