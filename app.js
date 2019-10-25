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

var start;
var nbTotalTweeted = 0;

var checkSpamData = {};

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
  start = Date.now();
  fortnite.user(name, platform)
    .then(stats => {
      if (stats.code === 404) {
        postTweetError(tweetId, userName, stats.error + ". Please try with a valid player.");
      } else {
        createCanvasStats(stats.stats, name, tweetId, userName);
      }
    });
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

function postTweetWithMediaStats(tweetId, userName, player) {
  var filePath = './img/' + player + '.png';
  twitter.postMediaChunked({ file_path: filePath }, function (err, data, response) {
    if (err) {
      console.log(err);
      postTweetError(tweetId, userName, "Sorry, too many people are using the #FortniteStats, please try again in a few moments.");
    } else {
      var params = {
        in_reply_to_status_id: tweetId,
        status: "@" + userName + " Here are your #Fornite statistics.",
        media_ids: [data.media_id_string]
      }
      twitter.post('statuses/update', params, function (err, data, response) {
        if (err) {
          console.log(err);
        } else {
          require("fs").unlink('./img/' + player + ".png", function (err) {
            if (err) {
              console.log(err);
            }
          });
          checkSpamData[userName].nbTweet++;
          nbTotalTweeted++;
          var millis = Date.now() - start;
          console.log("Seconds elapsed = " + millis + " Total tweeted = " + nbTotalTweeted);
          console.log(checkSpamData);
        }
      });
    }
  });
  return false;
}

function postTweetWithMediaStatus(dataStatus) {
  if (dataStatus.status == false) {
    var filePath = './img/offline.png';
  } else {
    var filePath = './img/online.png';
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

function postTweetError(tweetId, userName, errorMessage) {
  var params = {
    in_reply_to_status_id: tweetId,
    status: "@" + userName + " " + errorMessage,
  }
  twitter.post('statuses/update', params, function (err, data, response) {
    if (err) {
      console.log(err);
    };
  });
  return false;
}

function checkTweet() {
  var stream = twitter.stream('statuses/filter', { track: '#FortniteStats' })
  stream.on('tweet', function (tweet) {
    var dataUser = checkTweetRegex(tweet.text);
    if (dataUser === false) {
      postTweetError(tweet.id_str, tweet.user.screen_name, 'Invalid platform. Supported platforms are: pc / xbox / psn.');
    } else {
      if(!checkSpamData[tweet.user.screen_name]){
        checkSpamData[tweet.user.screen_name] = { 'nbTweet': 0, 'first_tweet': Date.now() };
      }
      if(!checkSpam(tweet.user.screen_name)){
        getStats(dataUser.name, dataUser.platform, tweet.id_str, tweet.user.screen_name);
      } else {
        postTweetError(tweet.id_str, tweet.user.screen_name, "Please do not spam ! You can use #FortniteStats 4 times every 5 minutes.");
      }
    }
  });
}

function checkTweetRegex(tweet) {
  var regex = /(#\w+)\s([\w ]+)+\s(\w+)/;
  var pseudo = tweet.replace(regex, "$2");
  var platform = tweet.replace(regex, "$3");
  if ((platform === 'pc') || (platform === 'xbox') || (platform === 'psn')) {
    var dataUser = { 'name': pseudo, 'platform': platform };
  } else {
    return false;
  }
  return dataUser;
}

function checkSpam(userName) {
  console.log(checkSpamData[userName].nbTweet);
  console.log(Date.now() - checkSpamData[userName].first_tweet);
  if( (checkSpamData[userName].nbTweet==2 ) && ((Date.now() - checkSpamData[userName].first_tweet)<300000) ){
    return true;
  } else {
    return false;
  }
}

function fontFile(name) {
  return path.join(__dirname, '/font/', name);
}

function createCanvasStats(dataStats, player, tweetId, userName) {
  var canvas = Canvas.createCanvas(1920, 1080);
  var ctx = canvas.getContext('2d');

  var Image = Canvas.Image;
  var img = new Image();
  img.src = './img/stats.jpg';

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  var gradient = ctx.createLinearGradient(0, 0, 100, 0);
  gradient.addColorStop(0, '#ff4b4b');
  gradient.addColorStop(1, '#f73030');
  ctx.fillStyle = gradient;
  ctx.textAlign = 'center';
  ctx.font = '60pt Roboto';
  ctx.fillText(player, canvas.width / 4.35, canvas.height / 2.95);
  ctx.font = '48pt Roboto';

  ctx.fillText(dataStats.lifetime.wins, canvas.width / 1.965, canvas.height / 3.1);
  ctx.fillText(((dataStats.lifetime.wins / dataStats.lifetime.matches) * 100).toFixed(2), canvas.width / 1.545, canvas.height / 3.1);
  ctx.fillText(dataStats.lifetime.kills, canvas.width / 1.279, canvas.height / 3.1);
  ctx.fillText(dataStats.lifetime.kd, canvas.width / 1.097, canvas.height / 3.1);

  ctx.textAlign = 'start';

  ctx.fillText(dataStats.solo.wins, canvas.width / 10.65, canvas.height / 1.6);
  ctx.fillText(((dataStats.solo.wins / dataStats.solo.matches) * 100).toFixed(2), canvas.width / 4.9, canvas.height / 1.6);
  ctx.fillText(dataStats.solo.kills, canvas.width / 10.65, canvas.height / 1.3);
  ctx.fillText(dataStats.solo.kd, canvas.width / 4.9, canvas.height / 1.3);
  ctx.fillText(dataStats.solo.kills_per_match, canvas.width / 10.65, canvas.height / 1.1);
  ctx.fillText(dataStats.solo.matches, canvas.width / 4.9, canvas.height / 1.1);

  ctx.fillText(dataStats.duo.wins, canvas.width / 2.44, canvas.height / 1.6);
  ctx.fillText(((dataStats.duo.wins / dataStats.duo.matches) * 100).toFixed(2), canvas.width / 1.9, canvas.height / 1.6);
  ctx.fillText(dataStats.duo.kills, canvas.width / 2.44, canvas.height / 1.3);
  ctx.fillText(dataStats.duo.kd, canvas.width / 1.9, canvas.height / 1.3);
  ctx.fillText(dataStats.duo.kills_per_match, canvas.width / 2.44, canvas.height / 1.1);
  ctx.fillText(dataStats.duo.matches, canvas.width / 1.9, canvas.height / 1.1);

  ctx.fillText(dataStats.squad.wins, canvas.width / 1.375, canvas.height / 1.6);
  ctx.fillText(((dataStats.squad.wins / dataStats.squad.matches) * 100).toFixed(2), canvas.width / 1.19, canvas.height / 1.6);
  ctx.fillText(dataStats.squad.kills, canvas.width / 1.375, canvas.height / 1.3);
  ctx.fillText(dataStats.squad.kd, canvas.width / 1.19, canvas.height / 1.3);
  ctx.fillText(dataStats.squad.kills_per_match, canvas.width / 1.375, canvas.height / 1.1);
  ctx.fillText(dataStats.squad.matches, canvas.width / 1.19, canvas.height / 1.1);

  var base64Data = canvas.toDataURL().replace(/^data:image\/png;base64,/, "");
  require("fs").writeFile('./img/' + player + ".png", base64Data, 'base64', function (err) {
    if (err) {
      throw err
    }
    postTweetWithMediaStats(tweetId, userName, player);
  });
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
      //getStore();
      //getStats("Ninja", "pc", 151615, "FrTeyz");
      //statusCode: 403
      //support@tracker.network
      //for (var i = 0; i < 10; i++) {
      //getStats("Ninja", "pc", 1615, "FrTeyz");
      //}
    })
}