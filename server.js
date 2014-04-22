var fs = require("fs");
var config = JSON.parse(fs.readFileSync("config.json"));
var host = config.host;
var port = config.port;
var express = require("express");
var mongo = require("mongodb");
var Twitter = require('twit-stream');
var https = require('https');

var app = express()
  , http = require('http')
  , server = http.createServer(app)
  , io = require('socket.io').listen(server);
  

app.use('/public', express.static(__dirname + '/public'));

app.get("/", function(req, res){
	var content = fs.readFileSync("index.html");
	
	getTweets(function(tweets) {
		var ul = '';
		tweets.forEach(function(tweet) {
				ul += "<li class='tweet'><p class='primary label'><i class='icon-twitter'>  @" + tweet.user.screen_name + ": </p></i><p>" + tweet.text + "<p></li>";
		});
		content = content.toString("utf8").replace("{{INITIAL_TWEETS}}", ul);
		res.setHeader("Content-Type", "text/html");
		res.send(content);
	});
});

server.listen(port, host);

var dbHost = "127.0.0.1";
var dbPort = mongo.Connection.DEFAULT_PORT;
var db = new mongo.Db("nodejs-introduction", new mongo.Server(dbHost, dbPort), {safe: false});
db.open(function(error){
	console.log("We are connected! " + dbHost + ":" + dbPort);
	
	db.collection("tweet", function(error, collection){
		tweetCollection = collection;
	});
});

function getTweets(callback) {
	tweetCollection.find({}, {"limit":10, "sort": {"_id": -1}}, function(error, cursor) {
		cursor.toArray(function(error, tweets){
				callback(tweets);
		});
	});
};

var options = {
	consumer_key: "jWGXQuK5Y4xIP8U079o9x9yz4",
	consumer_secret: "aessInAOZqiZxv9s7JXXyE9qPPOZ1LGYfflOdQl5oZZB6ziXiz",
	oauth_token: "2455687184-H810WAXb0kc8CipFXgczedGQvVlr2w4v5EKs1nD",
	oauth_secret: "rwV1RowQMy4uofblUsVnopBeQbgTThy3LvIPyllrenfP8",
	objectMode: false
};

var stream = new Twitter(options).filter({ track: 'bieber' });

stream
  // Stream is now a object moded stream of Twitter data
  .on('data', function (obj) {
    var t = JSON.parse(obj);
	io.sockets.emit("tweet", t);
	tweetCollection.insert(t, function(error){
		if (error) {
			console.log("Error: ", error.message);
		} else {
			console.log("Inserted tweet into database");
		}
	});
  })
  .on('error', function (err) {
    console.log("Error", err)
});