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

/* Module Requirements */
const util = require('util');
const https = require('https');
const amazonProductApi = require('amazon-product-api');

/* Module Setup */
const NAME = "BTC Module"
const VERSION = "1.0"
const URI = "/BTCModule"

// these will be initialized in module.exports.init
var apiHandler = null;
var webApp = null;

// module specific variables
const BLOCKCHAINAPI = 'https://blockchain.info/ticker';

class AmazonItem {
  constructor(name, price, url) {
    this.name = name;
    this.price = price;
    this.url = url;
  }
}

const FUNNYOBJECTS = [
    'dildos',
    'cat stickers',
    'car keys',
    'cokes',
    'drink umbrellas',
    'body pillows',
    'sword art body pillows',
    'college textbooks',
    'rubber chickens',
    'dog collars',
    'squeeky toys',
    'bags of dog food',
    'tea bags',
    'porn',
    'noose',
];

const FUNNYREQUESTS = [
    'BTC is worth: $%s\n\nWhich you could use to buy %s %s.',
    'BTC is worth: $%s\n\nThats as many as %s %s, and that is terrible.',
    'BTC is worth: $%s\n\nYou could use that money to buy %s %s and be set ' +
    'for life!',
    'BTC is worth: $%s\n\nYou could use that money to feed the starving kids ' +
    'in africa, or just spend it on %s %s.'
];

var amazonClient = amazonProductApi.createClient({
    awsId: process.env.AWS_ID,
    awsSecret: process.env.AWS_SECRET,
    awsTag: process.env.AWS_TAG
});

module.exports = {
  name: NAME,
  version: VERSION,
  uri: URI,

  init: (parentBotApi, parentWebApp) => {
    apiHandler = parentBotApi;
    webApp = parentWebApp;

    apiHandler.on('receiveMessage', receiveMessage);
    webApp.get(URI, getRootPage);
  },

  free: () => {
    apiHandler.removeListener('receiveMessage', receivedMessage);

    apiHandler = null;
    webApp = null;
  },

  getCommands: () => {
    return '/btc - get the current BTC value in USD\n\n';
  }
};

function receiveMessage(receivedEvent) {
  if (receivedEvent.isCommand) {
    switch(receivedEvent.fullCommand[0].toLowerCase()) {
      case '/btc':
        sendBTC(receivedEvent.message);
        break;
      default:;
    }
  }
}

function httpsGet(uri) {
  return new Promise((resolve, reject) => {
    https.get(uri, (res) => {
      var body = '';

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        var parsedJson = {};
        try {
          parsedJson = JSON.parse(body);
        } catch(e) {
          reject(e);
        }

        resolve(parsedJson);
      });
    });
  });
}

function getRandomInRange(min, max) {
  max = Math.floor(max);
  min = Math.floor(min);

  return min + Math.floor(Math.random() * max);
}

function amazonSearch(item) {
  return amazonClient.itemSearch({
    keywords: item,
    responseGroup: 'ItemAttributes,Offers'
  });
};

function getAmazonItem(item) {
  /*
  return new Promise((resolve, reject) => {
    amazonSearch(item).catch((error) => {
      console.log(error.Error[0].Message);
      reject(error);
    }).then((results) => {
      if (results && results.length > 0) {
        var chosenItem = results[getRandomInRange(0, results.length-1)];
        var priceFlt = parseFloat(chosenItem.OfferSummary[0].LowestNewPrice[0]
          .Amount[0])/100;
        // TODO: promise rejection happens if one of these isn't defined
        // and I am not sure why it isn't handled by the sendBTC catch.
        resolve(new AmazonItem(item, priceFlt, chosenItem.DetailPageURL));
      } else {
        reject('Failed to get Amazon results...');
      }
    });
  });
  */

  return new Promise((resolve, reject) => {
    var price = Math.random() * 3000.0;
    resolve(new AmazonItem(item, price, ''));
  });
}

function sendBTC(message) {
  var saying = FUNNYREQUESTS[getRandomInRange(0, FUNNYREQUESTS.length-1)];
  var object = FUNNYOBJECTS[getRandomInRange(0, FUNNYOBJECTS.length-1)];
  var btcValue = 0;
  var amazonPrice = 0;
  var amazonUrl = 'http://www.amazon.com';

  httpsGet(BLOCKCHAINAPI).catch((error) => {
    apiHandler.sendMessage(error.toString(), {isReply: true}, message);
  }).then((blockchainResult) => {
    if(blockchainResult) {
      btcValue = blockchainResult.USD.last;
      return getAmazonItem(object);
    } else {
      apiHandler.sendMessage('Failed to get bitcoin value.',
        {isReply:true}, message);
    }
  }).catch((error) => {
    apiHandler.sendMessage(error.toString(), {isReply: true}, message);
  }).then((amazonItem) => {
    if(amazonItem) {
      var answer = util.format(saying, btcValue.toLocaleString('en'),
        Math.floor(btcValue/amazonItem.price).toLocaleString('en'),
        object) + '\n\n' + amazonItem.url;

      apiHandler.sendMessage(answer, {isReply: true}, message);
    } else {
      apiHandler.sendMessage('Failed to get amazon item.',
        {isReply: true}, message);
    }
  });
}

/* Web Handler */
function getRootPage(req, res) {
  res.render('root', webApp.getOptions(req, {name: NAME, version: VERSION}));
}