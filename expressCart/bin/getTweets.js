// expressCart stuff.
var mongodb = require('mongodb');
var async = require('async');
var path = require('path');
var common = require('../routes/common');
var config = common.getConfig();
var ndb;

// Twit stuff.
var Twit = require('twit')

var T = new Twit({
  consumer_key:         'oVlWXbZ12rcooRWWy1pUXH3rz',
  consumer_secret:      'p958ZUFohLbRgKhf0GmRFybRtxjmfgYzwji36Fw9fSgA6GZRKD',
  access_token:         '2613390788-C1Wpvzp4yV5wxAiHvuVv1AzBRjOAgULKB1WIp0C',
  access_token_secret:  '2iZ8HcyIkfT1Z6k0PpniUC3zXvJ1iXmvaTekfaqLBZi5V',
  timeout_ms:           60*1000,  // optional HTTP request timeout to apply to all requests.
});

var options = { screen_name: 'realDonaldTrump',
                count: 1 };

T.get('statuses/user_timeline', options , function(err, data) {
  for (var i = 0; i < data.length ; i++) {
    // console.log(data[i].text);
    console.log(data[i]);
  }
})


// Data example: 
/*


created_at: 'Thu Jul 20 20:08:58 +0000 2017',
  id: 888128621784838100,
  id_str: '888128621784838144',
  text: 'I am asking all citizens to believe in yourselves, believe in your future, and believe, once more, in America.… https://t.co/a0sQTVdYwL',
  truncated: true,
  entities:
   { hashtags: [],
     symbols: [],
     user_mentions: [],
     urls: [ [Object] ] },
  source: '<a href="https://studio.twitter.com" rel="nofollow">Media Studio</a>',
  in_reply_to_status_id: null,
  in_reply_to_status_id_str: null,
  in_reply_to_user_id: null,
  in_reply_to_user_id_str: null,
  in_reply_to_screen_name: null,
  user:
   { id: 25073877,
     id_str: '25073877',
     name: 'Donald J. Trump',
     screen_name: 'realDonaldTrump',
     location: 'Washington, DC',
     description: '45th President of the United States of America',
     url: null,
     entities: { description: [Object] },
     protected: false,
     followers_count: 34167650,
     friends_count: 45,
     listed_count: 72777,
     created_at: 'Wed Mar 18 13:46:38 +0000 2009',
     favourites_count: 14,
     utc_offset: -14400,
     time_zone: 'Eastern Time (US & Canada)',
     geo_enabled: true,
     verified: true,
     statuses_count: 35322,
     lang: 'en',
     contributors_enabled: false,
     is_translator: false,
     is_translation_enabled: true,
     profile_background_color: '6D5C18',
     profile_background_image_url: 'http://pbs.twimg.com/profile_background_images/530021613/trump_scotland__43_of_70_cc.jpg',
     profile_background_image_url_https: 'https://pbs.twimg.com/profile_background_images/530021613/trump_scotland__43_of_70_cc.jpg',
     profile_background_tile: true,
     profile_image_url: 'http://pbs.twimg.com/profile_images/874276197357596672/kUuht00m_normal.jpg',
     profile_image_url_https: 'https://pbs.twimg.com/profile_images/874276197357596672/kUuht00m_normal.jpg',
     profile_banner_url: 'https://pbs.twimg.com/profile_banners/25073877/1500568149',
     profile_link_color: '1B95E0',
     profile_sidebar_border_color: 'BDDCAD',
     profile_sidebar_fill_color: 'C5CEC0',
     profile_text_color: '333333',
     profile_use_background_image: true,
     has_extended_profile: false,
     default_profile: false,
     default_profile_image: false,
     following: true,
     follow_request_sent: false,
     notifications: false,
     translator_type: 'regular' },
  geo: null,
  coordinates: null,
  place: null,
  contributors: null,
  is_quote_status: false,
  retweet_count: 6954,
  favorite_count: 23557,
  favorited: false,
  retweeted: false,
  possibly_sensitive: false,
  lang: 'en' }


*/



// // check for DB config
// if(!config.databaseConnectionString){
//     console.log('No MongoDB configured. Please see README.md for help');
//     process.exit(1);
// }

// // Connect to the MongoDB database
// mongodb.connect(config.databaseConnectionString, {}, function(err, mdb){
//     if(err){
//         console.log("Couldn't connect to the Mongo database");
//         console.log(err);
//         process.exit(1);
//     }

//     console.log('Connected to: ' + config.databaseConnectionString);
//     console.log('');

//     insertProducts(mdb, function(productErr, report){
//         insertOrders(mdb, function(orderErr, report){
//             insertUsers(mdb, function(userErr, report){
//                 if(productErr || orderErr || userErr){
//                     console.log('There was an error upgrading to MongoDB. Check the console output');
//                 }else{
//                     console.log('MongoDB upgrade completed successfully');
//                     process.exit();
//                 }
//             });
//         });
//     });
// });

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

// function insertOrders(db, callback){
//     var collection = db.collection('orders');
//     ndb = new Nedb(path.join('data', 'orders.db'));
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
//                 console.log('Loaded ' + docs.length + ' user(s) data from the NeDB database');
//                 console.log('');
//             }

//             console.log('Inserting orders into MongoDB...');
//             async.each(docs, function (doc, cb){
//                 console.log('Orders inserted: ' + doc._id);

//                 // delete the old ID and let MongoDB generate new ones
//                 delete doc._id;

//                 collection.insert(doc, function (err){ return cb(err); });
//             }, function (err){
//                 if(err){
//                     console.error('An error happened while inserting user data');
//                     callback(err, null);
//                 }else{
//                     console.log('All orders successfully inserted');
//                     console.log('');
//                     callback(null, 'All orders successfully inserted');
//                 }
//             });
//         });
//     });
// };

// function insertUsers(db, callback){
//     var collection = db.collection('users');
//     ndb = new Nedb(path.join('data', 'users.db'));
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
//                 console.log('Loaded ' + docs.length + ' user(s) data from the NeDB database');
//                 console.log('');
//             }

//             console.log('Inserting users into MongoDB...');
//             async.each(docs, function (doc, cb){
//                 console.log('User inserted: ' + doc.userEmail);

//                 // delete the old ID and let MongoDB generate new ones
//                 delete doc._id;

//                 collection.insert(doc, function (err){ return cb(err); });
//             }, function (err){
//                 if(err){
//                     console.error('An error happened while inserting user data');
//                     callback(err, null);
//                 }else{
//                     console.log('All users successfully inserted');
//                     console.log('');
//                     callback(null, 'All users successfully inserted');
//                 }
//             });
//         });
//     });
// };
