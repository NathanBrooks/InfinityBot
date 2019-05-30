window.onload = function() {
    var commands = [];
    var commandIndex = -1;
    var socket = io.connect('http://www.demonixfox.wtf:80');
    var field = document.getElementById('field');
    var sendButton = document.getElementById('send');
    var text = document.getElementById('text');
    var content = document.getElementById('content');

    socket.on('message', handleMessage);

    function handleMessage(data) {
        if(data.message) {
            content.innerHTML += data.message.replace(/\n/g, '<br/>') + '<hr/>';
            content.scrollTop = content.scrollHeight;
        } else {
            console.log('there is a problem' + data);
        }
    }

    function sendMessage() {
        var text = field.value;
        field.value = '';
        if(commands.length == 0 || (commands.length > 0 && commands[0] != text))
        {
            commands.unshift(text);
        }
        commandIndex = -1;
        if (text != '') {
            socket.emit('send', { message: text });
        }
    }

    sendButton.onclick = sendMessage;

    $('#field').keydown(function(e) {
        console.log(e.which);
        console.log(commands.length);
        console.log(commandIndex);
        switch(e.which) {
            case 13: // enter
                sendMessage();
                break;
            case 38: // up
                if(commandIndex + 1 < commands.length) {
                    commandIndex++;
                    field.value = commands[commandIndex];
                }
                break;
            case 40: // down
                if(commandIndex - 1 >= 0 && commands.length >= 1) {
                    commandIndex--;
                    field.value = commands[commandIndex];
                }
                break;
        }
    });
}