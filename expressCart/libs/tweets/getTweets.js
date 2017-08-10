// expressCart stuff.
var mongodb = require('mongodb');
var async = require('async');
var path = require('path');
var decode = require('decode-html');
var common = require('../../routes/common');
var config = common.getConfig();

// Tweet stuff.
var Twit = require('twit');
var assert = require('assert');

var T = new Twit({
  consumer_key:         'oVlWXbZ12rcooRWWy1pUXH3rz',
  consumer_secret:      'p958ZUFohLbRgKhf0GmRFybRtxjmfgYzwji36Fw9fSgA6GZRKD',
  access_token:         '2613390788-C1Wpvzp4yV5wxAiHvuVv1AzBRjOAgULKB1WIp0C',
  access_token_secret:  '2iZ8HcyIkfT1Z6k0PpniUC3zXvJ1iXmvaTekfaqLBZi5V',
  timeout_ms:           60*1000,  // optional HTTP request timeout to apply to all requests.
});

var tweetOptions = { screen_name: 'realDonaldTrump',
                     count: 3 };

// Check for DB config
if(!config.databaseConnectionString) {
    console.log('No MongoDB configured. Please see README.md for help');
    process.exit(1);
}

// @function: Load tweets from Twitter API, add to our database.
// -------------------------------------------------------------
module.exports.importTweets = function(callback) {

    // Connect to the MongoDB database
    mongodb.connect(config.databaseConnectionString, {}, function(err, mdb) {

        if(err) {
            console.log("Couldn't connect to the Mongo database");
            console.log(err);
            process.exit(1);
        }

        console.log('Connected to: ' + config.databaseConnectionString);
        console.log('');

        T.get('statuses/user_timeline', tweetOptions , function(err, data) {

            insertTweets(mdb, data, function(tweetErr, report) {

                if(tweetErr) {
                    console.log(tweetErr);
                    callback(false);
                } else {
                    callback(true);
                }
            });
        });
    });
}

// @function: Perform database actions for the retrieved tweets.
// -------------------------------------------------------------
// @params:
// db: the intialised db connection.
// tweets: array of tweet objects pulled from the live feed.
// callback: function to run after completion.
function insertTweets(db, tweets, callback) {

    // Load the tweets collection (table).
    var tweetsCol = db.collection('tweets');

    // Take the tweets from the Twit response and save or update information.
    async.each(tweets, function (tweet, cb) {

        var tweetext = decode(tweet.text.replace(/(?:https?|ftp):\/\/[\n\S]+/g, '').trim());
        tweetext = tweetext.replace(/^\./, '');
        var tweetvalues = { 
            "created_at":tweet.created_at,
            "tweet_id":tweet.id, 
            "text":tweetext, 
            "retweet_count":tweet.retweet_count, 
            "favorite_count":tweet.favorite_count,
            "screen_name":tweet.user.screen_name,
            "posters_generated": false };

        if(!isReplyRetweet(tweet)) {

            tweetExists(tweetsCol, tweet.id, function(exists) {

                if(exists) {
                    var myquery = { tweet_id: tweet.id };
                    
                    // Update the retweet_count and favorite_count only.
                    tweetsCol.updateOne(myquery, tweetvalues, function(err, res) {

                        console.log('1 record updated');
                        if (err) return cb(err);
                        return cb();
                    });
                }
                else {
                    tweetsCol.insert(
                        tweetvalues,
                        function (err) { 
                            return cb(err); 
                        }
                    );
                }
            });
        } 
        else {
            cb();
        };
    }, 
    function (err) {
        if(err) {
            console.log('An error happened while inserting tweet data');
            callback(err, null);
        } 
        else {
            console.log('All tweets successfully inserted');
            console.log('');
            callback(null, 'All tweets successfully inserted');
        }
        db.close();
    });
};

// @function: Do we already have this tweet saved in our database?
// ---------------------------------------------------------------
function tweetExists(tweetsCol, id, cb) {

    tweetsCol.find({ tweet_id:id }).toArray(function(err, results) {

        if (err) throw err;

        if(results.length > 0) {
            return cb(true);
        }
        else {
            return cb(false);
        }
    });
};

// @function: Is this tweet a reply or retweet?
// -------------------------------------------------------------
function isReplyRetweet(tweet) {
  if ( tweet.retweeted_status
    || tweet.in_reply_to_status_id
    || tweet.in_reply_to_status_id_str
    || tweet.in_reply_to_user_id
    || tweet.in_reply_to_user_id_str
    || tweet.in_reply_to_screen_name )
    return true
}

// @function: Load existing tweets.
// -------------------------------------------------------------
module.exports.loadTweets = function(callback) {

    mongodb.connect(config.databaseConnectionString, {}, function(err, db) {

        var tweetsCol = db.collection('tweets');
        var cursor = tweetsCol.find({ 'posters_generated': false });

        tweetsCol.find().toArray(function (err, items) {
            
             if (err) {
                callback(err, null);
             } else {
                callback(null, items);
             }

             db.close();
        });
    });
};

