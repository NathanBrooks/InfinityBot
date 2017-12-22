const module_name = 'Web Chat Api'
const module_version = '1.0'
const module_settings = '/WebChatAPI'
const client_id = 'WebChat'

var api;
var app;
var server;

module.exports = {
    module_name: module_name,
    module_version: module_version,
    module_settings: module_settings,
    module_client: client_id,

    init: function(parent_api, parent_app, parent_server) {
        api = parent_api;
        app = parent_app;
        server = parent_server;

        api.on('messageSend', sendMessage);
        app.get(module_settings, rootpage);
        app.get(module_settings + '/chat', chatpage);


        /* setup sockets */
        var io = require('socket.io').listen(server);
        io.sockets.on('connection', handleSocket);
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

function handleSocket (socket) {
    socket.emit('message', { message: 'Welcome to ' + process.env.BOT_DISPLAY_NAME });
    socket.on('send', function(data) {
        if(data && 'message' in data) {
            var newMessage = new api.Message(client_id, 0, data.message, 'Web User', socket, {});
            Object.freeze(newMessage);
            api.receiveMessage(newMessage);
        }
    });
};

function sendMessage(message) {
    if (message.client_id == client_id) {
        var socket = message.content;

        var output = 'Empty Message';
        if (message.text.length > 1) {
            output = message.text;
        }


        socket.emit('message', { message: output });
    }
}

function rootpage(req, res) {
    res.render('root', app.getOptions(req, {name: module_name, version: module_version}));
}

function chatpage(req, res) {
    res.render('WebChatAPI/chat', app.getOptions(req));
}