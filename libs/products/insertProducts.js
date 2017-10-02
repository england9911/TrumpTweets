// expressCart stuff.
var mongodb = require('mongodb');
var async = require('async');
var path = require('path');
var common = require('../../routes/common');
var config = common.getConfig();
var fs = require('fs-extra');
var glob = require('glob');
var moment = require('moment-timezone');
var pconfig = require('./../printful/printConf.js');
var PrintfulClient = require('./../printful/printfulclient.js');
var printful = new PrintfulClient(pconfig.printful_api_key);

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

        console.log('Inserting products..')

        async.each(tweets, function (tweet, cb) {

            var opts = '{"Poster Colour":{"optName":"Poster Colour","optLabel":"Poster Colour","optType":"select","optOptions":["blue","red","white"]},"Frame":{"optName":"Frame","optLabel":"Framed","optType":"select","optOptions":["Yes","No"]}}'
            var insertThis = false;

            // TODO: multiple product images, one is main
            // TODO: options changed, show diff image?
            // TODO: Sync with Printful API. ******************

            var tweetUnix = moment(tweet.created_at, 'ddd MMM DD HH:mm:ss Z YYYY');
            var monthYear = tweetUnix.format('MMMM YYYY');
            var tweetID = tweet.tweet_id.toString();

            var doc = {
                productPermalink: tweetID,
                productTitle: tweet.text,
                productPrice: "30",
                productDescription: "<p>Originally posted at: " + tweet.tweet_local_date + ".</p><p>All posters are on museum quality archival matte paper, and can be sent framed or unframed.</p>",
                productPublished: "true",
                productTags: "donald trump, twitter, tweet, trump twitter, " + monthYear,
                productOptions: opts,
                productAddedDate: new Date(),
                productImage: "/uploads/placeholder.png"
            };

            // Check if this tweet has already been stored as a product.
            productsCol.findOne({'productPermalink': tweetID}, function (err, result) {

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
                            var newId = newDoc.ops[0]._id.toString();

                            // Construct folder path.
                            var productImgsPath = path.join(__dirname, '../../public/uploads', newId);
                            
                            // Create folder for product images.
                            fs.ensureDir(productImgsPath, function(err3) {

                                if(err3) console.error(err3);

                                // Get thumbnails for this product/tweet id from their temp location.
                                getGeneratedThumbs(tweetID, newId, function(thumbFiles) {

                                    // Move thumbnails into new folder.
                                    moveThumbs(thumbFiles, function(err3) {

                                        if(err3) console.error(err3);

                                        updateMainImg(db, tweetID, newId, function(err4) {

                                            if(err4) console.error(err4);
                                            cb();
                                        });
                                    });
                                });
                            });
                        }
                    });
                }
                else {
                    cb();
                }
            });

        }, function (err) {

            if(err) {
                console.log('An error happened while inserting product data');
                callback(err, null, null);
            } else {
                console.log('All products successfully inserted');
                console.log('');
                callback(null, 'All products successfully inserted', null);
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

function updateMainImg(db, tweetID, docID, cb) {

    var productsCol = db.collection('products');

    getSavedThumbs(tweetID, docID, true, function(mainImg, err){

        if(err) return cb('Unable to get a product image for: ' + tweetID); 

        var mainImgCut = mainImg.path.split('/public').pop();

        productsCol.updateOne(
            { "productPermalink":tweetID },
            { $set: { "productImage":mainImgCut } },
            function(err,res) { 
                if(err) {
                    return cb('Unable to set: ' + mainImgCut + ' as main image. Please try again.');
                }
                else {
                    console.log('Set main product image: ' + mainImgCut);
                    return cb();
                }
            }
        );
    });
}

function getSavedThumbs(tweetID, docID, single, cb) {

    globPath = path.join(__dirname, '../../public/uploads/' + docID + '/**');

    glob(globPath, {nosort: true}, function (er, files) {

        var fileList = [];

        for(var i = 0; i < files.length; i++) {

            if(fs.lstatSync(files[i]).isDirectory() === false) {

                var iPath = files[i];
                var iCheck = iPath.indexOf(tweetID);

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

        // console.log(fileList);

        if(fileList.length == 0) return cb(null, true);
        else if(single == true) return cb(fileList[0], null);
        return cb(fileList, null);
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

        return callback(fileList);
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
            console.log('Product thumbs moved successfully');
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

