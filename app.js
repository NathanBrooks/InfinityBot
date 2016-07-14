require('dotenv').config();

var telegram = require('telegram-bot-api');
var HashMap = require('hashmap');

var groupMap = new HashMap();
var BotName = process.env.BOT_NAME
var api = new telegram({
        token: process.env.TEL_API_KEY,
        updates: {
            enabled: true
    }
});



api.on('message', function(message)
{
    if('text' in message) {
        if(message.text[0] == '/') {
            parseCommand(message);
        } else {
            buildChain(message);
        }
    }
});

function parseCommand(message) {
    var paramList = message.text.split(/\s+/);
    var fullCommand = paramList[0].split(/@/);
	if(fullCommand.length == 1 || 									// no name was specified 
 	   fullCommand[1].toLowerCase() == BotName.toLowerCase()) {     // check if the command was meant for us
    	
    	switch(fullCommand[0]) {
       		case "/generate":
       	    	if(paramList.length > 1) {
       	        	generateGroupSeed(message);
       	    	} else {
       	        	generateGroupMessage(message);
       	    	}
       	    	break;
       		case "/words":
       	   		getWordWeights(message);
       	   		break;
       		default: ;
    	}
    }
}

function buildChain(message) {
        var group = {};
        if(groupMap.has(message.chat.id)) {
            group = groupMap.get(message.chat.id);
        } else {
            group = new HashMap();
            groupMap.set(message.chat.id, group);
        }

        var word1 = "\n";
        var word2 = "\n";
        var textArr = message.text.split(/\s+/);
        for(var newWord in textArr) {
            var tmpWord = textArr[newWord];
            var list = {};

            if(group.has(word1 + word2)) {
                list = group.get(word1 + word2);
            } else {
                list.markov_total = 0;
            }

            updateProbability(list, tmpWord);
            group.set(word1 + word2, list);

            word1 = word2.toLowerCase();
            word2 = tmpWord.toLowerCase();
        }

        if(group.has(word1 + word2)) {
            var list = group.get(word1 + word2);
        } else {
            var list = {}
            list.markov_total = 0;
        }
        updateProbability(list, '\n');
        group.set(word1 + word2, list);
}

function updateProbability(list, word) {
    var oldTotal = list.markov_total;
    list.markov_total += 1;

    if(!("word_dict" in list)) {
        list.word_dict = [];
    }

    var i;
    var found = false;
    for(i=0; i<list.word_dict.length; i++) {
        var count = list.word_dict[i].value * oldTotal;
        
        if(list.word_dict[i].key == word) { 
            found = true;
            count += 1;
        }

        list.word_dict[i].value = (count / list.markov_total);
    }

    if(!found) {
        var count = 1;
        list.word_dict.push({
            key: word,
            value: (count / list.markov_total)
        })
    }

}

function generateGroupMessage(message) {
    var result = "";
    
    if(groupMap.has(message.chat.id)) {
        result = generateMessage(groupMap.get(message.chat.id));
    } else {
        result = "Sorry your chat doesnt have any map!"
    }
    
    SendMessage(result, message.chat.id, message.message_id);
}

function generateGroupSeed(message) {
    var result = "";

    var paramList = message.text.split(/\s+/);
    
    var wordList = groupMap.get(message.chat.id); 

    var word1 = '\n';
    var word2 = '\n';

    if(paramList.length == 2) {
        word2 = paramList[1].toLowerCase();
    } else if(paramList.length == 3) {
        word1 = paramList[1].toLowerCase();
        word2 = paramList[2].toLowerCase();
    }

    if(groupMap.has(message.chat.id)) {
        result = word1 + " " + word2 + " " + generateMessage(wordList, word1, word2);
    } else {
        result = "Sorry your chat doesnt have any map!"
    }

    SendMessage(result, message.chat.id, message.message_id)
}

function generateMessage(chatMap, in1, in2) {
    var last_word = "";
    var result = "";
    
    in1 = in1 == null ? '\n' : in1;
    in2 = in2 == null ? '\n' : in2;

    word1 = in1;
    word2 = in2;
    
    while(last_word != "\n") {
        var list = chatMap.get(word1 + word2);
        var rnd = Math.random();
        var total = 0;
        if(list) {
            var i;
            for(i=0; i<list.word_dict.length; i++) {
                total += list.word_dict[i].value;
                if(rnd < total) {
                    result += (list.word_dict[i].key + " ");
                    word1 = word2.toLowerCase();
                    word2 = list.word_dict[i].key.toLowerCase();
                    last_word = word2.toLowerCase();
                    break;
                }
            }
        } else {
            last_word = "\n";
        }
    }

    return result;
}

function getWordWeights(message) {
    var paramList = message.text.split(/\s+/);
    
    var wordList = groupMap.get(message.chat.id); 

    var word1 = '\n';
    var word2 = '\n';

    if(paramList.length == 2) {
        word2 = paramList[1].toLowerCase();
    } else if(paramList.length == 3) {
        word1 = paramList[1].toLowerCase();
        word2 = paramList[2].toLowerCase();
    }
    if(wordList) {
    	SendMessage(printList(WordList.get(word1+word2), message.chat.id, message.message_id));
    } else {
    	SendMessage(printList("Combination does not exist!", message.chat.id, message.message_id));
    }

}

function printList(list) {
    var i;
    result = "Word List:\n";
    if(typeof list != 'undefined') {
        for(i=0; i<list.word_dict.length; i++) {
        result += "{ " + list.word_dict[i].key + " : " + list.word_dict[i].value + "}\n";
        }
    }
    return result;
}

function SendMessage(message, chat_id, reply) {
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
