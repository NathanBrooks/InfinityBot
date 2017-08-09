require('dotenv').config();

/* libs and apis */
var Telegram = require('telegram-bot-api');
var chokidar = require('chokidar');
var path     = require('path');
var express  = require('express');
var webapp   = express();
var hbs      = require('express-handlebars');

/* initialize telegram api */
global.BotName = process.env.BOT_NAME;
var api = new Telegram({
        token: process.env.TEL_API_KEY,
        updates: {
            enabled: true
    }
});

/* telegram api helpers */
var module_list = [];

global.SendMessage = function SendMessage(message, chat_id, reply) {
    if (message.split(/\s/) <= 1) {
        api.sendMessage({
            chat_id: chat_id,
            text: "<Empty Message>",
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
                reply_to_message_id: (reply != null ? reply : undefined)
            });
        }
    }
}

global.SendSticker = function SendSticker(sticker_id, chat_id, reply) {
    api.sendSticker({
        chat_id: chat_id,
        sticker: sticker_id,
        reply_to_message_id: (reply != null ? reply : undefined)
    });
}


function compileNavbar() {
	var returnVal = "";
	for(var i in module_list) {
		returnVal += "<li><a href=\"" + module_list[i].module_settings + "\">" + module_list[i].module_name + "</a></li>";
	}
	return returnVal;
}

/* handlebars support */
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

webapp.engine('handlebars', handlebars.engine);
webapp.set('view engine', 'handlebars');
webapp.set('views', 'http/views/layouts');

/* Webserver */
webapp.use('/share',express.static(path.join(__dirname, '/http/fonts')))
webapp.use('/share',express.static(path.join(__dirname, '/http/css')));
webapp.use('/share',express.static(path.join(__dirname, '/http/js')));
webapp.get('/', function(req, res) {
	res.render('home');
});

var server = webapp.listen(80, function() {
	var host = server.address().address;
	var port = server.address().port;

	console.log("Web listening @ http://%s:%s", host, port);
})

/* file watcher */
var watcher = chokidar.watch('./bot_modules', {
    ignored: /[\/\\]\./,
    persistent: true
});

watcher.on('add', path => {
    module_list[path] = require('./' + path);
    module_list[path].init(api, webapp);
    console.log(path + " has been added");
});

watcher.on('unlink', path => {
	delete require.cache[require.resolve('./' + path)];
    module_list[path].free();
    delete module_list[path];
    console.log(path + " has been removed");
});
