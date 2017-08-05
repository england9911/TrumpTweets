// expressCart stuff.
var mongodb = require('mongodb');
var async = require('async');
var path = require('path');
var common = require('../routes/common');
var config = common.getConfig();

// check for DB config
if(!config.databaseConnectionString) {
    console.log('No MongoDB configured. Please see README.md for help');
    process.exit(1);
}

// Connect to the MongoDB database
mongodb.connect(config.databaseConnectionString, {}, function(err, mdb) {

    if(err) {
        console.log("Couldn't connect to the Mongo database");
        console.log(err);
        process.exit(1);
    }

    console.log('Connected to: ' + config.databaseConnectionString);
    console.log('');


    loadTweets(db, function(tweets) {

        console.log('existing...');
        console.log(tweets);
    });



    // insertProducts(mdb, function(exists) {

    // });




});


function insertProducts(db, callback) {

    var products = db.collection('products');
    var tweets = db.collection('tweets');

    console.log(tweets);

    // Load Tweets.


    // Generate poster images.


    // Insert products to expressCart, each product has 3 colour options.

        
    // console.log('Inserting products into MongoDB...');
    // async.each(docs, function (doc, cb) {
    //     console.log('Product inserted: ' + doc.productTitle);

    //     // check for permalink. If it is not set we set the old NeDB _id to the permalink to stop links from breaking.
    //     if(!doc.productPermalink || doc.productPermalink === '') {
    //         doc.productPermalink = doc._id;
    //     }

    //     // delete the old ID and let MongoDB generate new ones
    //     delete doc._id;

    //     collection.insert(doc, function (err) { return cb(err); });
    // }, function (err) {
    //     if(err) {
    //         console.log('An error happened while inserting data');
    //         callback(err, null);
    //     }else{
    //         console.log('All products successfully inserted');
    //         console.log('');
    //         callback(null, 'All products successfully inserted');
    //     }
    // });


};

