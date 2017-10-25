// expressCart stuff.
var mongodb = require('mongodb');
var async = require('async');
var path = require('path');
var decode = require('decode-html');
var moment = require('moment-timezone');
var common = require('../../routes/common');
var config = common.getConfig();

var Twit = require('twit');
var assert = require('assert');
var tconfig = require('./twitConf.js');

var T = new Twit(tconfig);

var tweetOptions = { screen_name: 'realDonaldTrump',
                     count: 1,
                     tweet_mode: 'extended' };

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
    var updatedTweets = 0;
    var insertedTweets = 0;

    // Take the tweets from the Twit response and save or update information.
    async.each(tweets, function (tweet, cb) {

        var tweetext = decode(tweet.full_text.replace(/(?:https?|ftp):\/\/[\n\S]+/g, '').trim());
        tweetext = tweetext.replace(/^\./, '');

        var tweetUnix = moment(tweet.created_at, 'ddd MMM DD HH:mm:ss Z YYYY');
        var tweetDateTimezone = moment.tz(tweetUnix, 'US/Eastern').format('dddd, MMMM Do YYYY, h:mm a');

        var tweetvalues = {
            "created_at":tweet.created_at,
            "tweet_local_date":tweetDateTimezone,
            "tweet_id":tweet.id.toString(),
            "text":tweetext,
            "retweet_count":tweet.retweet_count,
            "favorite_count":tweet.favorite_count,
            "screen_name":tweet.user.screen_name,
            "posters_generated":false
        };

        if(!isReplyRetweet(tweet)) {

            tweetExists(tweetsCol, tweet.id, function(exists) {

                if(exists) {
                    var idtweet = { tweet_id: tweet.id.toString() };

                    // Update the retweet_count and favorite_count only.
                    tweetsCol.updateOne(
                        idtweet,
                        { $set: {
                            "retweet_count":tweet.retweet_count,
                            "favorite_count":tweet.favorite_count,
                        } },
                        function(err, res) {
                            console.log('1 record updated');
                            updatedTweets++;
                            if (err) return cb(err);
                            return cb();
                        }
                    );
                }
                else {
                    tweetsCol.insert(
                        tweetvalues,
                        function (err) {
                            if(!err) insertedTweets++;
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
            console.log('Inserted: ' + insertedTweets + ' tweets, updated: ' + updatedTweets + ' tweets.');
            console.log('');
            if(insertedTweets === 0) {
              if(updatedTweets > 0 || updatedTweets === 0) {
                console.log('Exiting, no need to generate anything.');
                process.exit(1);
              }
            }
            callback(null, 'Inserted: ' + insertedTweets + ' tweets, updated: ' + updatedTweets + ' tweets.');
        }
        db.close();
    });
};

// @function: Do we already have this tweet saved in our database?
// ---------------------------------------------------------------
function tweetExists(tweetsCol, id, cb) {

    if (typeof id === 'number') {
        id = id.toString();
    }

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
        // var cursor = tweetsCol.find({ 'posters_generated': false });

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

