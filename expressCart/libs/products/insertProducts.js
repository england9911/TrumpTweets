// expressCart stuff.
var mongodb = require('mongodb');
var async = require('async');
var path = require('path');
var common = require('../../routes/common');
var config = common.getConfig();


if(!config.databaseConnectionString) {
    console.log('No MongoDB configured. Please see README.md for help');
    process.exit(1);
}


module.exports.insertProducts = function(tweets, callback) {

    mongodb.connect(config.databaseConnectionString, {}, function(err, mdb) {

        if(err) {
            console.log("Couldn't connect to the Mongo database");
            console.log(err);
            process.exit(1);
        }

        console.log('GONNA INSERT PRODUCTS NOW>>>>')

        console.log(tweets)





        // TODO: Post a reply to the original tweet advertising the new poster.
        // TODO: This will need a new Twitter account!
        // TODO: Post Facebook status with poster + link.
        // TODO: Instagram post.

        callback(false);


    });


    

}



