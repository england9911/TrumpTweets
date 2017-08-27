// expressCart stuff.
var mongodb = require('mongodb');
var async = require('async');
var path = require('path');
var common = require('../../routes/common');
var config = common.getConfig();
var fs = require('fs-extra');
var glob = require('glob');


if(!config.databaseConnectionString) {
    console.log('No MongoDB configured. Please see README.md for help');
    process.exit(1);
}


module.exports.insertProducts = function(tweets, callback) {

    mongodb.connect(config.databaseConnectionString, {}, function(err, db) {

        if(err) {
            console.log("Couldn't connect to the Mongo database");
            console.log(err);
            process.exit(1);
        }

        var productsCol = db.collection('products');

        console.log('Inserting products....')

        async.each(tweets, function (tweet, cb) {

            var opts = '{"Poster Colour":{"optName":"Poster Colour","optLabel":"Poster Colour","optType":"select","optOptions":["blue","red","white"]},"Frame":{"optName":"Frame","optLabel":"Framed","optType":"select","optOptions":["Yes","No"]}}'
            var insertThis = false;

            // TODO: multiple product images, one is main
            // TODO: options changed, show diff image?

            // TODO: Sync with Printful API. ******************

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
            // common.getImages(prodid, req, res, function (images){});



            // Check if this tweet has already been stored as a product.
            productsCol.findOne({'productTitle': tweet.tweet_id}, function (err, result) {

                if(err) {
                    console.info(err.stack);
                }

                if(!result) {

                    productsCol.insert(doc, function (err2, newDoc) {

                        if(err2) {

                            console.error(colors.red('Error inserting document: ' + err));
                            cb(err2);

                        } else {

                            // Get the new document ID.
                            var newId = newDoc.ops[0]._id;

                            // Construct folder path.
                            var productImgsPath = path.join(__dirname, '../../public/uploads', newId.toString());
                            
                            // Create folder for product images.
                            fs.ensureDir(productImgsPath, function(err3) {

                                if(err3) console.log(err3);

                                // Get thumbnails for this product/tweet id from their temp location.
                                getGeneratedThumbs(tweet.tweet_id, newId, function(thumbFiles) {

                                    // console.log("");
                                    // console.log('thumbs for this product:');
                                    // console.log(thumbFiles);

                                    // Move thumbnails into new folder.
                                    moveThumbs(thumbFiles, function(err3){

                                        console.log('matt callback');

                                        if(err) {
                                            console.err(err3);
                                        } 

                                        cb();
                                    });
                                });
                            });

                            

                            

                            




                            // // create lunr doc
                            // var lunrDoc = {
                            //     productTitle: doc.productTitle,
                            //     productTags: doc.productTags,
                            //     productDescription: doc.productDescription,
                            //     id: newId
                            // };

                            // // add to lunr index
                            // productsIndex.add(lunrDoc);

                            // cb();

                        }
                    });
                }
                else {
                    cb();
                }
            });



            // TODO: Find out how to use one thumbnail as the main image.



        }, function (err) {

            if(err) {
                console.log('An error happened while inserting product data');
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

        // callback(false);


    });


    

}


function getGeneratedThumbs(tweetID, docID, callback) {

    globPath = path.join(__dirname, '../posters/poster-imgs/thumbs');
    globPath = globPath + '/**';

    glob(globPath, {nosort: true}, function (er, files) {

        var fileList = [];

        for(var i = 0; i < files.length; i++) {

            if(fs.lstatSync(files[i]).isDirectory() === false) {

                var iPath = files[i].substring(6);
                var iCheck = iPath.indexOf(tweetID);

                console.log(files[i]);

                // Does this filename contain the tweet id?
                if(iCheck !== -1) {

                    var file = {
                        id: i,
                        filename: path.parse(files[i]).base,
                        docID: docID,
                        tweetID: tweetID,
                        path: files[i]
                    };

                    fileList.push(file);
                }
            }
        }
    });
}

function moveThumbs(thumbs, cb) {

    if(!thumbs || thumbs.length < 1) return cb('thumbs was not defined');

    async.each(thumbs, function(thumb, callback) {

        var docIdStr = thumb.docID.toString();
        var to = path.join(__dirname, '../../public/uploads', docIdStr, thumb.filename);
        var from = thumb.path;

        // Check thumb is ready
        thumbReady(from, function(success){

            if(success) {

                // Copy file
                fs.move(from, to, { overwrite: true }, err => {
                    if (err) return console.error(err)
                    else {
                        callback(null);
                    }
                }) 

            } 
            else {
                console.log('THERE WAS A PROBLEM MOVING: ' + from);
            }
        });

    }, function(er) {
        
        if(er) {
            console.log('An error happened while moving thumbs');
            cb(er);
        } else {
            console.log('All thumbs moved successfully');
            cb(null);
        }
    });
}

function thumbReady(path, cb) {

    fs.stat(path, function(err, stat) {
        if(err == null) {
            return cb(true);
        } else if(err.code == 'ENOENT') {
            return cb(false);
        } else {
            console.log('Some other error: ', err.code);
            return cb(false);
        }
    });
}

