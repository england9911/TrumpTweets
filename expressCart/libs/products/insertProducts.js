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



        async.each(tweets, function (doc, cb) {

            var opts = '{"Poster Colour":{"optName":"Poster Colour","optLabel":"Poster Colour","optType":"select","optOptions":["blue","red","white"]},"Frame":{"optName":"Frame","optLabel":"Framed","optType":"select","optOptions":["Yes","No"]}}'
            
            // TODO: productImage = thumbnails - how to find the names? we have the tweet_id which makes up part of the filename.
            // TODO: make function to get image paths from a tweet_id
            // TODO: multiple product images, one is main
            // TODO: options changed, show diff image?

            // TODO: Sync with Printful API.

            var doc = {
                productPermalink: tweet.tweet_id,
                productTitle: tweet.tweet_id,
                productPrice: "30",
                productDescription: "All posters are on museum quality archival matte paper, and can be sent framed or unframed.",
                productPublished: new Date(),
                productTags: "donald trump, twitter, tweet, trump twitter",
                productOptions: opts,
                productAddedDate: new Date(),
                productImage: "/uploads/placeholder.png"
            };

            // Product images get made by putting images into a folder under public/uploads/product_id/
            // Product images loaded with:
            // common.getImages(prodid, req, res, function (images){
            // });

            db.products.insert(doc, function (err, newDoc) {

                if(err) {

                    console.error(colors.red('Error inserting document: ' + err));
                    cb(err);

                } else {

                        // get the new ID
                        // var newId = newDoc._id;
                        // if(config.databaseType !== 'embedded'){
                        //     newId = newDoc.insertedIds;
                        // }

                        // // create lunr doc
                        // var lunrDoc = {
                        //     productTitle: doc.productTitle,
                        //     productTags: doc.productTags,
                        //     productDescription: doc.productDescription,
                        //     id: newId
                        // };

                        // // add to lunr index
                        // productsIndex.add(lunrDoc);

                        cb();

                    }
                });
            });

            // TODO: Create new dir under /public/uploads/product_id/
            // TODO: Add all the thumbnails to this dir.
            // TODO: Find out how to use one thumbnail as the main image.



        }, function (err) {

            if(err) {
                console.log('An error happened while inserting data');
                callback(err, null);
            } else {
                console.log('All products successfully inserted');
                console.log('');
                callback(null, 'All products successfully inserted');
            }
        });

        // ------------------------------------------------------------------------

        



        // ------------------------------------------------------------------------
        







        // TODO: Post a reply to the original tweet advertising the new poster.
        // TODO: This will need a new Twitter account!
        // TODO: Post Facebook status with poster + link.
        // TODO: Instagram post.

        callback(false);


    });


    

}



