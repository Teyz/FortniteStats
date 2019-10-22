const Twitter = require('twit');
const config = require('./config.js');
const axios = require('axios');
const Client = require('fortnite');
const Canvas = require('canvas');
const path = require('path');

var twitter = new Twitter(config);
var fortnite = new Client('8d2c9df7-ca0a-4e83-8044-58b23fa32870');

var isFtnStatusTweetedOn = true;
var isFtnStatusTweetedOff = false;

twitter.get('account/verify_credentials', {
  include_entities: false,
  skip_status: true,
  include_email: false
}, onAuthenticated)

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

function getStats(name, platform, tweetId, userName) {
  fortnite.user(name, platform)
    .then(stats => {
      if (stats.code === 404) {
        postTweetError(tweetId, userName, stats.error + ". Please try with a valid player.");
      } else {
        var dataStats =
        {
          'tweetId': tweetId,
          'userName': userName,
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
            'matches': stats.stats.solo.matches
          },
          'duo':
          {
            'wins': stats.stats.duo.wins,
            'win': (stats.stats.duo.wins / stats.stats.duo.matches) * 100,
            'kills': stats.stats.duo.kills,
            'kd': stats.stats.duo.kd,
            'kills_match': stats.stats.duo.kills_per_match,
            'matches': stats.stats.duo.matches
          },
          'squad':
          {
            'wins': stats.stats.squad.wins,
            'win': (stats.stats.squad.wins / stats.stats.squad.matches) * 100,
            'kills': stats.stats.squad.kills,
            'kd': stats.stats.squad.kd,
            'kills_match': stats.stats.squad.kills_per_match,
            'matches': stats.stats.squad.matches
          }
        };
        createCanvasStats(dataStats);
      }
    });
}

function checkTweet() {
  var stream = twitter.stream('statuses/filter', { track: '#FortniteStats' })
  stream.on('tweet', function (tweet) {
    var text = tweet.text;
    var tweetId = tweet.id_str;
    var userName = tweet.user.screen_name;
    var dataUser = checkTweetRegex(text);
    if (dataUser === false) {
      postTweetError(tweetId, userName, 'Invalid platform. Supported platforms are: pc / xbox / psn.');
    } else {
      getStats(dataUser.name, dataUser.platform, tweetId, userName);
    }
  });
}

function postTweetWithMediaStats(tweetId, userName, player) {
  var filePath = './' + player + '.png';
  twitter.postMediaChunked({ file_path: filePath }, function (err, data, response) {
    if (err) throw err;
    var params = {
      in_reply_to_status_id: tweetId,
      status: "@" + userName + " Here are your statistics.",
      media_ids: [data.media_id_string]
    }
    twitter.post('statuses/update', params, function (err, data, response) {
      if (err) throw err;
      require("fs").unlink(player + ".png", function (err) {
        if (err) throw err;
      });
    });
  });
  return false;
}

function postTweetError(tweetId, userName, errorMessage) {
  var params = {
    in_reply_to_status_id: tweetId,
    status: "@" + userName + " " + errorMessage,
  }
  twitter.post('statuses/update', params, function (err, data, response) {
    if (err) throw err;
  });
  return false;
}

function checkTweetRegex(tweet) {
  var regex = /(#\w+)\s([\w ]+)+\s(\w+)/;
  var pseudo = tweet.replace(regex, "$2");
  var platform = tweet.replace(regex, "$3");
  if ( (platform === 'pc') || (platform === 'xbox') || (platform === 'psn') ) {
    var dataUser = { 'name': pseudo, 'platform': platform };
  } else {
    return false;
  }
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

function fontFile(name) {
  return path.join(__dirname, '/font/', name);
}

function createCanvasStats(dataStats) {
  console.log(dataStats);

  var canvas = Canvas.createCanvas(1920, 1080);
  var ctx = canvas.getContext('2d');

  var Image = Canvas.Image;
  var img = new Image();
  img.src = 'stats.jpg';

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  var gradient = ctx.createLinearGradient(0, 0, 100, 0);
  gradient.addColorStop(0, '#ff4b4b');
  gradient.addColorStop(1, '#f73030');
  ctx.fillStyle = gradient;
  ctx.textAlign = 'center';
  ctx.font = '60pt Roboto';
  ctx.fillText(dataStats.player, 440, 375);

  var base64Data = canvas.toDataURL().replace(/^data:image\/png;base64,/, "");
  require("fs").writeFile(dataStats.player + ".png", base64Data, 'base64', function (err) {
    if (err) {
      throw err
    }
    postTweetWithMediaStats(dataStats.tweetId, dataStats.userName, dataStats.player);
  });
}

function postTweetWithMediaStatus(dataStatus) {
  if (dataStatus.status == false) {
    var filePath = './offline.png';
  } else {
    var filePath = './online.png';
  }
  twitter.postMediaChunked({ file_path: filePath }, function (err, data, response) {
    if (err) throw err;
    var params = { status: dataStatus.message, media_ids: [data.media_id_string] }
    twitter.post('statuses/update', params, function (err, data, response) {
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
  twitter.get('account/verify_credentials', { skip_status: true })
    .catch(function (err) {
      console.log('caught error', err.stack)
    })
    .then(function (result) {
      // setInterval(() => {
      //   getStatus();
      // }, 2000);
      Canvas.registerFont(fontFile('ROBOTO-BLACK.TTF'), { family: 'Roboto' });
      checkTweet();
    })
}