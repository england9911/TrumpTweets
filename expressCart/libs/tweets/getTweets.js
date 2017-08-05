
// Check for DB config
if(!config.databaseConnectionString) {
    console.log('No MongoDB configured. Please see README.md for help');
    process.exit(1);
}

function importTweets() {

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
                    console.log('There was an error importing tweets. Check the console output');
                } else {
                    console.log('Tweets imported successfully');
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

    // Take the tweets from the Twit response and save or update information about them in our DB.
    async.each(tweets, function (tweet, cb) {

        var tweetvalues = { 
            "created_at":tweet.created_at,
            "tweet_id":tweet.id, 
            "text":tweet.text.replace(/(?:https?|ftp):\/\/[\n\S]+/g, ''), 
            "retweet_count":tweet.retweet_count, 
            "favorite_count":tweet.favorite_count,
            "screen_name": tweet.user.screen_name };

        tweetExists(tweetsCol, tweet.id, function(exists) {

            if(exists) {

                var myquery = { tweet_id: tweet.id };
                
                // If we already have the tweet, update the retweet_count and favorite_count only.
                tweetsCol.updateOne(myquery, tweetvalues, function(err, res) {

                    if (err) throw err;
                    console.log("1 record updated");
                    db.close();
                });
            }
            else {

                // Insert a new tweet.
                tweetsCol.insert(
                    tweetvalues,
                    function (err) { return cb(err); }
                );

                // TODO: Post a reply to the original tweet advertising the new poster.
                // TODO: This will need a new Twitter account!
            }
        });
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
    });
};

// Have we already saved this tweet id?
function tweetExists(tweetsCol, id, cb) {

    tweetsCol.find({ tweet_id:id }).toArray( function(err, results) {

        if (err) throw err;

        if(results.length > 0) {
            cb(true);
        }
        else {
            cb(false);
        }
    });
};

// Load existing tweets.
function loadTweets(db, callback) {

    var tweets = [];
    var tweetsCol = db.collection('tweets');
    var cursor = tweetsCol.find({});
    
    // Loop through the existing saved tweets.
    // Execute the each command, triggers for each document (row).
    cursor.each(function(err, item, cb) {

        // If the item is null then the cursor is exhausted/empty and closed.
        if(item == null) {

            // If there is no error and the cursor is empty, close the DB connection.
            cursor.toArray(function(err, items) {

                assert.equal(null, err);
                db.close();
            });
        }
        else {

            tweets.push(item); 
        }
    }, function (err) {

        if(err) {
            console.error('An error happened while loading existing tweets');
            callback(err, null);
        } else {
            console.log('All existing tweets successfully loaded');
            console.log('');
            callback(null, 'All existing tweets successfully loaded');
        }
    });


    if (tweets.length > 0) {
        callback(tweets);
    } else {
        callback(err);
    }
};

