// This code is largely borrowed from: github.com/louischatriot/nedb-to-mongodb

// This code moves your data from NeDB to MongoDB
// You then need to ensure your MongoDB Database has been created.

// ** IMPORTANT **
// There are no duplication checks in place. Please only run this script once.
// ** IMPORTANT **

var Nedb = require('nedb');
var mongodb = require('mongodb');
var async = require('async');
var path = require('path');
var common = require('../routes/common');
var config = common.getConfig();
var ndb;

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

    insertProducts(mdb, function(productErr, report){
        insertOrders(mdb, function(orderErr, report){
            insertUsers(mdb, function(userErr, report){
                if(productErr || orderErr || userErr){
                    console.log('There was an error upgrading to MongoDB. Check the console output');
                }else{
                    console.log('MongoDB upgrade completed successfully');
                    process.exit();
                }
            });
        });
    });
});

function insertProducts(db, callback){
    var collection = db.collection('products');
    ndb = new Nedb(path.join(path.join('data', 'products.db')));
    ndb.loadDatabase(function (err){
        if(err){
            console.error('Error while loading the data from the NeDB database');
            console.error(err);
            process.exit(1);
        }

        ndb.find({}, function (err, docs){
            if(docs.length === 0){
                console.error('The NeDB database contains no data, no work required');
                console.error('You should probably check the NeDB datafile path though!');
            }else{
                console.log('Loaded ' + docs.length + ' products(s) data from the NeDB database');
                console.log('');
            }

            console.log('Inserting products into MongoDB...');
            async.each(docs, function (doc, cb){
                console.log('Product inserted: ' + doc.productTitle);

                // check for permalink. If it is not set we set the old NeDB _id to the permalink to stop links from breaking.
                if(!doc.productPermalink || doc.productPermalink === ''){
                    doc.productPermalink = doc._id;
                }

                // delete the old ID and let MongoDB generate new ones
                delete doc._id;

                collection.insert(doc, function (err){ return cb(err); });
            }, function (err){
                if(err){
                    console.log('An error happened while inserting data');
                    callback(err, null);
                }else{
                    console.log('All products successfully inserted');
                    console.log('');
                    callback(null, 'All products successfully inserted');
                }
            });
        });
    });
};

function insertOrders(db, callback){
    var collection = db.collection('orders');
    ndb = new Nedb(path.join('data', 'orders.db'));
    ndb.loadDatabase(function (err){
        if(err){
            console.error('Error while loading the data from the NeDB database');
            console.error(err);
            process.exit(1);
        }

        ndb.find({}, function (err, docs){
            if(docs.length === 0){
                console.error('The NeDB database contains no data, no work required');
                console.error('You should probably check the NeDB datafile path though!');
            }else{
                console.log('Loaded ' + docs.length + ' user(s) data from the NeDB database');
                console.log('');
            }

            console.log('Inserting orders into MongoDB...');
            async.each(docs, function (doc, cb){
                console.log('Orders inserted: ' + doc._id);

                // delete the old ID and let MongoDB generate new ones
                delete doc._id;

                collection.insert(doc, function (err){ return cb(err); });
            }, function (err){
                if(err){
                    console.error('An error happened while inserting user data');
                    callback(err, null);
                }else{
                    console.log('All orders successfully inserted');
                    console.log('');
                    callback(null, 'All orders successfully inserted');
                }
            });
        });
    });
};

function insertUsers(db, callback){
    var collection = db.collection('users');
    ndb = new Nedb(path.join('data', 'users.db'));
    ndb.loadDatabase(function (err){
        if(err){
            console.error('Error while loading the data from the NeDB database');
            console.error(err);
            process.exit(1);
        }

        ndb.find({}, function (err, docs){
            if(docs.length === 0){
                console.error('The NeDB database contains no data, no work required');
                console.error('You should probably check the NeDB datafile path though!');
            }else{
                console.log('Loaded ' + docs.length + ' user(s) data from the NeDB database');
                console.log('');
            }

            console.log('Inserting users into MongoDB...');
            async.each(docs, function (doc, cb){
                console.log('User inserted: ' + doc.userEmail);

                // delete the old ID and let MongoDB generate new ones
                delete doc._id;

                collection.insert(doc, function (err){ return cb(err); });
            }, function (err){
                if(err){
                    console.error('An error happened while inserting user data');
                    callback(err, null);
                }else{
                    console.log('All users successfully inserted');
                    console.log('');
                    callback(null, 'All users successfully inserted');
                }
            });
        });
    });
};
