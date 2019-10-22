const Twitter = require('twit');
const config = require('./config.js');
const axios = require('axios');
const Client = require('fortnite');
const Blob = require('blob');
const FileSaver = require('file-saver');

var T = new Twitter(config);
var fortnite = new Client('8d2c9df7-ca0a-4e83-8044-58b23fa32870');

var isFtnStatusTweetedOn = true;
var isFtnStatusTweetedOff = false;

T.get('account/verify_credentials', {
  include_entities: false,
  skip_status: true,
  include_email: false
}, onAuthenticated)

function postTweet(tweet) {
  T.post('statuses/update', { status: tweet }, function (error, tweet, response) {
    if (error) throw error;
    console.log(tweet);
  });
}

function getStore() {
  fortnite.store()
    .then(store => {
      var dataStore = {};
      for (let i = 0; i < store.length; i++) {
        dataStore[i] = { 'name': store[i].name, 'price': store[i].vbucks, 'rarity': store[i].rarity, 'image': store[i].image };
      }
      console.log(dataStore);
    });
}

function checkRarity() {
}

function getStats(name, platform) {
  fortnite.user(name, platform)
    .then(stats => {
      var dataStats =
      {
        'player': name,
        'lifetime':
        {
          'wins': stats.stats.lifetime.wins,
          'win': (stats.stats.lifetime.wins / stats.stats.lifetime.matches) * 100,
          'kills': stats.stats.lifetime.kills,
          'kd': stats.stats.lifetime.kd
        },
        'solo':
        {
          'wins': stats.stats.solo.wins,
          'win': (stats.stats.solo.wins / stats.stats.solo.matches) * 100,
          'kills': stats.stats.solo.kills,
          'kd': stats.stats.solo.kd,
          'kills_match': stats.stats.solo.kills_per_match,
          'matches:': stats.stats.solo.matches
        },
        'duo':
        {
          'wins': stats.stats.duo.wins,
          'win': (stats.stats.duo.wins / stats.stats.duo.matches) * 100,
          'kills': stats.stats.duo.kills,
          'kd': stats.stats.duo.kd,
          'kills_match': stats.stats.duo.kills_per_match,
          'matches:': stats.stats.duo.matches
        },
        'squad':
        {
          'wins': stats.stats.squad.wins,
          'win': (stats.stats.squad.wins / stats.stats.squad.matches) * 100,
          'kills': stats.stats.squad.kills,
          'kd': stats.stats.squad.kd,
          'kills_match': stats.stats.squad.kills_per_match,
          'matches:': stats.stats.squad.matches
        }
      };
      createCanvasStats(dataStats);
    });
}

function checkTweet() {
  var stream = T.stream('statuses/filter', { track: '#FortniteStats' })
  stream.on('tweet', function (tweet) {
    var text = tweet.text;
    var tweetId = tweet.id_str;
    var userName = tweet.user.screen_name;
    var dataUser = checkTweetRegex(text);
    getStats(dataUser.name, dataUser.platform);
    //replyTweet(tweetId, userName);
  });
}

function replyTweet(tweetId, userName) {
  T.post('statuses/update', {
    in_reply_to_status_id: tweetId,
    status: "@" + userName + " Wohoh"
  }, function (err, data, response) {
    console.log(data);
  })
}

function checkTweetRegex(tweet) {
  var regex = /(#\w+)\s([\w ]+)+\s(\w+)/;
  var pseudo = tweet.replace(regex, "$2");
  var platform = tweet.replace(regex, "$3");
  var dataUser = { 'name': pseudo, 'platform': platform };
  return dataUser;
}

function getStatus() {
  axios.get("https://lightswitch-public-service-prod06.ol.epicgames.com/lightswitch/api/service/bulk/status?serviceId=Fortnite")
    .then(function (data) {
      if (isFtnStatusTweetedOn) {
        if (data.data[0].status === 'DOWN') {
          var dataStatus = { 'status': false, 'message': "#Fornite servers are currently Offline." };
          postTweetWithMediaStatus(dataStatus);
          isFtnStatusTweetedOff = true;
          isFtnStatusTweetedOn = false;
        }
      }
      else if (isFtnStatusTweetedOff) {
        if (data.data[0].status === 'UP') {
          var dataStatus = { 'status': true, 'message': "#Fornite servers are currently Online." };
          postTweetWithMediaStatus(dataStatus);
          isFtnStatusTweetedOff = false;
          isFtnStatusTweetedOn = true;
        }
      }
    })
}

function createCanvasStats(dataStats) {
  console.log(dataStats);
  var Canvas = require('canvas');
  var path = require('path');

  function fontFile (name) {
    return path.join(__dirname, '/font/', name);
  }
  
  Canvas.registerFont(fontFile('ROBOTO-BLACK.TTF'), {family: 'Roboto'});

  var canvas = Canvas.createCanvas(1920, 1080);
  var ctx = canvas.getContext('2d');

  var Image = Canvas.Image;
  var img = new Image();
  img.src = 'stats.jpg';

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  var gradient = ctx.createLinearGradient(0,0,100,0);
  gradient.addColorStop(0, '#ff4b4b');
  gradient.addColorStop(1, '#f73030');
  ctx.fillStyle = gradient;
  ctx.textAlign = 'center';
  ctx.font = '60pt Roboto';
  ctx.fillText(dataStats.player, 440, 375);

  var base64Data = canvas.toDataURL().replace(/^data:image\/png;base64,/, "");
  require("fs").writeFile(dataStats.player + ".png", base64Data, 'base64', function (err) {
    console.log(err);  
  });
}

function postTweetWithMediaStatus(dataStatus) {
  console.log("Début");
  if (dataStatus.status == false) {
    var filePath = './offline.png';
  } else {
    var filePath = './online.png';
  }
  T.postMediaChunked({ file_path: filePath }, function (err, data, response) {
    console.log("Tweet chargé");
    if (err) throw err;
    var params = { status: dataStatus.message, media_ids: [data.media_id_string] }
    T.post('statuses/update', params, function (err, data, response) {
      console.log("Tweet posté");
      if (err) throw err;
    });
  });
  return false;
}

function onAuthenticated(err, res) {
  if (err) {
    throw err
  }
  console.log("App started successfully 🤲🤲");
  T.get('account/verify_credentials', { skip_status: true })
    .catch(function (err) {
      console.log('caught error', err.stack)
    })
    .then(function (result) {
      // setInterval(() => {
      //   getStatus();
      // }, 2000);
      getStats("Snutle","pc");
    })
}