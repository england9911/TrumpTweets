var config = require('./config');
var tweets = require('./tweets/getTweets');
// var posters = require('./posters/makePoster');
// var products = require('./products/insertProducts');

tweets.importTweets();