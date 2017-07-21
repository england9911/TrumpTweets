// expressCart stuff.
var mongodb = require('mongodb');
var async = require('async');
var path = require('path');
var common = require('../routes/common');
var config = common.getConfig();

// Twit stuff.
var Twit = require('twit');
var assert = require('assert');


var T = new Twit({
  consumer_key:         'oVlWXbZ12rcooRWWy1pUXH3rz',
  consumer_secret:      'p958ZUFohLbRgKhf0GmRFybRtxjmfgYzwji36Fw9fSgA6GZRKD',
  access_token:         '2613390788-C1Wpvzp4yV5wxAiHvuVv1AzBRjOAgULKB1WIp0C',
  access_token_secret:  '2iZ8HcyIkfT1Z6k0PpniUC3zXvJ1iXmvaTekfaqLBZi5V',
  timeout_ms:           60*1000,  // optional HTTP request timeout to apply to all requests.
});

var options = { screen_name: 'realDonaldTrump',
                count: 3 };





// check for DB config
if(!config.databaseConnectionString){
    console.log('No MongoDB configured. Please see README.md for help');
    process.exit(1);
}

// Connect to the MongoDB database
mongodb.connect(config.databaseConnectionString, {}, function(err, mdb){
    if(err){
        console.log("Couldn't connect to the Mongo database");
        console.log(err);
        process.exit(1);
    }

    console.log('Connected to: ' + config.databaseConnectionString);
    console.log('');

    // console.log(mdb);

    T.get('statuses/user_timeline', options , function(err, data) {
      // for (var i = 0; i < data.length ; i++) {
      //   console.log('-----');
      //   console.log(data[i].id);
      //   console.log(data[i].text);
      //   console.log('ret:' + data[i].retweet_count);
      //   console.log('fav: ' + data[i].favorite_count);
      //   console.log('-----');
      // }

        // console.log(data);
        insertTweets(mdb, data, function(tweetErr, report) {

            if(tweetErr) {
                console.log('There was an error importing tweets. Check the console output');
            } else {
                console.log('Tweets imported successfully');
                // process.exit();
            }
        });
    });



    // If new tweet, save a new product.


    // Store:
    //  id
    //  text
    //  retweet_count
    //  favorite_count

    // insertProducts(mdb, function(productErr, report){
    //             if(productErr){
    //                 console.log('There was an error upgrading to MongoDB. Check the console output');
    //             } else {
    //                 console.log('MongoDB upgrade completed successfully');
    //                 process.exit();
    //             }
    // });
});

function insertTweets(db, tweets, callback) {

    // console.log('Tweets:');
    // console.log(tweets);

    // var cursor = db.collection('tweets').find( );
    
    // cursor.each(function(err, doc) {

    //   if (doc != null) {
    //      console.dir(doc);
    //   } 
    // });

    // console.log('-----');

    // Get DB collection (table) 'tweets'.
    var tweetsDb = db.tweets;
    console.log('tweetsDb DOCS...');

    var tweetsCol = db.collection('tweets');

    // Peform a simple find and return all the documents
    tweetsCol.find().toArray(function(err, docs) {

        console.log(docs);
    });

    // TODO: Do this with a cursor instead - best practice for large datasets.
    // Grab a cursor using the find
    var cursor = tweetsCol.find({});
    
    // Fetch the first object off the cursor
    cursor.nextObject(function(err, item) {

        // console.log(item);
    });


    // console.log(docs);
        console.log('----');


    async.each(tweets, function (tweet, cb) {

        console.log('Inserting tweet: ' + tweet.text);

        // Check if this tweet is saved already.


        // If we already have the tweet, update the retweet_count and favorite_count only.


        // tweetsDb.insert(tweet, function (err){ return cb(err); });


        tweetsCol.insert({ 
            "created_at":tweet.created_at,
            "tweet_id":tweet.id, 
            "text":tweet.text.replace(/(?:https?|ftp):\/\/[\n\S]+/g, ''), 
            "retweet_count":tweet.retweet_count, 
            "favorite_count":tweet.favorite_count },
            function (err){ return cb(err); });

    }, 
    function (err) {

        // Callback func.
        // console.log('ERR: ' + err);

        if(err) {
            console.log('An error happened while inserting tweet data');
            callback(err, null);
        } else {
            console.log('All tweets successfully inserted');
            console.log('');
            callback(null, 'All tweets successfully inserted');
        }
    });

};

// function insertProducts(db, callback){
//     var collection = db.collection('products');
//     ndb = new Nedb(path.join(path.join('data', 'products.db')));
//     ndb.loadDatabase(function (err){
//         if(err){
//             console.error('Error while loading the data from the NeDB database');
//             console.error(err);
//             process.exit(1);
//         }

//         ndb.find({}, function (err, docs){
//             if(docs.length === 0){
//                 console.error('The NeDB database contains no data, no work required');
//                 console.error('You should probably check the NeDB datafile path though!');
//             }else{
//                 console.log('Loaded ' + docs.length + ' products(s) data from the NeDB database');
//                 console.log('');
//             }

//             console.log('Inserting products into MongoDB...');
//             async.each(docs, function (doc, cb){
//                 console.log('Product inserted: ' + doc.productTitle);

//                 // check for permalink. If it is not set we set the old NeDB _id to the permalink to stop links from breaking.
//                 if(!doc.productPermalink || doc.productPermalink === ''){
//                     doc.productPermalink = doc._id;
//                 }

//                 // delete the old ID and let MongoDB generate new ones
//                 delete doc._id;

//                 collection.insert(doc, function (err){ return cb(err); });
//             }, function (err){
//                 if(err){
//                     console.log('An error happened while inserting data');
//                     callback(err, null);
//                 }else{
//                     console.log('All products successfully inserted');
//                     console.log('');
//                     callback(null, 'All products successfully inserted');
//                 }
//             });
//         });
//     });
// };

