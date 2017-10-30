// expressCart stuff.
// require('dotenv').config()
var mongodb = require('mongodb');
var async = require('async');
var path = require('path');
var common = require('../../routes/common');
var config = common.getConfig();
var fs = require('fs-extra');
var glob = require('glob');
var moment = require('moment-timezone');
var AWS = require('aws-sdk');
var sleep = require('sleep');
var pconfig = require('./../printful/printConf.js');
var PrintfulClient = require('./../printful/printfulclient.js');
var printful = new PrintfulClient(pconfig.printful_api_key);

if(!config.databaseConnectionString) {
    console.log('No MongoDB configured. Please see README.md for help');
    process.exit(1);
}

const S3_BUCKET = process.env.S3_BUCKET_NAME;
const S3_THUMBS = process.env.S3_THUMBS;
const s3 = new AWS.S3();

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
            var tweetUnix = moment(tweet.created_at, 'ddd MMM DD HH:mm:ss Z YYYY');
            var monthYear = tweetUnix.format('MMMM YYYY');
            var tweetID = tweet.tweet_id.toString();

            var doc = {
                productPermalink: tweetID,
                productTitle: tweet.text,
                productPrice: "34.99",
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

                            setS3ProductThumbs(tweetID, newId, function(err3, newThumb) {

                                updateMainImg(db, newThumb, tweetID, function(err4) {

                                    if(err4) console.log(err4);
                                    cb();
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

function updateMainImg(db, newThumb, tweetID, cb) {

    // TODO: Save *just* the filename? we can then use env vars to change the path.
    // TODO: Set up a CNAME for posters.trumptweetposters.com and point it to s3 bucket
    // TODO: Set up a CNAME for media.trumptweetposters.com and point it to s3 thumb bucket

    var productsCol = db.collection('products');

    productsCol.updateOne(
        { "productPermalink":tweetID },
        { $set: { "productImage":newThumb } },
        function(err,res) {
            if(err) {
                return cb('Unable to set: ' + newThumb + ' as main image. Please try again.');
            }
            else {
                console.log('Set main product image: ' + newThumb);
                return cb(null);
            }
        }
    ); 
}


// We have thumbs stored in the root of the bucket. Those need to be moved
// into a folder named by the new docID. Then, we need to save that path into
// the DB. Don't save the full URL *with* the s3 url. we just want to keep
// /docID/thumb.png

// TODO: MOVE the THREE thumbs into that folder. SAVE just one filename to the DB.

// TODO: Set up a CNAME for posters.trumptweetposters.com and point it to s3 bucket
// TODO: Set up a CNAME for media.trumptweetposters.com and point it to s3 thumb bucket
function setS3ProductThumbs(tweetID, docID, cb) {

    // If any error is passed to a successive function, the waterfall goes 
    // straight to it's top-level callback.
    async.waterfall([
        function list(next) {

            console.log('wait for thumbnail creation by Lambda function.');

            // The generated thumbs aren't available for a good few seconds. Wait for 
            // lambda to do it's thing.
            sleep.sleep(30);

            console.log("waited. bucket: " + S3_THUMBS)

            s3.listObjects({
                Bucket: S3_THUMBS,
                Delimiter: "/",
                Prefix: "thumb-" + tweetID
            }, function(err, data) {

                if(err) next(err);
                else if (data.Contents.length === 0) {
                    next('NO IMAGES RETURNED!', null);
                }

                var bucketContents = data.Contents;
                var rootFiles = [];
                for (var i = 0; i < bucketContents.length; i++) {
                    rootFiles.push(bucketContents[i].Key);
                }

                next(null, rootFiles);
            });
        },
        function download(files, next) {

            var i = 0;
            var newThumbs = [];

            // Pass each file to the renameThumb function. Return full array of new 
            // filenames with docID in the path.
            async.mapSeries(files, function(item, callback) {
                console.log('map....')
                renameThumb(tweetID, docID, item, callback);
            }, function(err, newThumbs) {
                console.log('map next.')
                next(null, files, newThumbs);
            });
        },
        function del(files, newThumbs, next) {

            console.log(files);
            console.log(newThumbs);
            console.log('deleting original thumbs..');
            console.log();

            var i = 1;

            async.eachSeries(files, function(thumb, callback3) {

                // Delete the existing object.
                s3.deleteObject({Bucket:S3_THUMBS, Key: thumb}, function(err, data) {
                    if (err) next(err); 

                    if(i == files.length) {
                        var rand = randomIntFromInterval(1, newThumbs.length);
                        newThumb = newThumbs[rand];
                        console.log('Choose random thumb for database: ' + newThumb);
                        next(null, newThumb);
                    }
                    else {
                        i++;
                        callback3();
                    }
                });
            });
        }
        ], function (err, newThumb) {

            if (err) {
                console.log(err);
            } else {
                console.log('Renamed thumbs successfully. Save this one: ' + newThumb);
                cb(null, newThumb);
            }
        }
    );
}

// Take the tweet thumb, and add the product docID to it's path 
// for future reference in the app.
function renameThumb(tweetID, docID, item, cb) {

    console.log('-----');
    
    var ts = Math.round((new Date()).getTime() / 1000);
    var filenameLoc = tweetID + '--' + ts + '.png';
    var fullpath = path.join(__dirname, '../posters/poster-imgs/' + filenameLoc);
    var filename = docID + '/' + item;

    console.log(filename);
    

    const s3Stream = s3.getObject({Bucket:S3_THUMBS, Key: item}).createReadStream();
    const fileStream = fs.createWriteStream(fullpath);
    s3Stream.on('error', function() {

    });
    fileStream.on('error', function() {

    });
    // This is what gets called when the object has been written 
    // locally with pipe().
    fileStream.on('close', () => {
        // console.log('Created local file: ' + filename + ' successfully.');
    });

    s3Stream.pipe(fileStream).on('close', function() {

        const fileBuffer = fs.createReadStream(fullpath);

        // Upload back to s3 with new path.
        s3.putObject({
          Bucket: S3_THUMBS,
          ACL: 'public-read',
          Key: filename,
          Body: fileBuffer,
          ContentType: 'image/png'
        }, function(err2, data) {
            if(err2) console.log(err2);
            console.log('Re-uploaded file: ' + filename + ' to s3 successfully.');
            var fullUrl = 'https://' + S3_THUMBS + '.s3.amazonaws.com/' + filename;
            console.log(fullUrl);
            debugger;
            cb(null, fullUrl);
        });
    });
}

function randomIntFromInterval(min, max) {
    return Math.floor(Math.random()*(max-min+1)+min);
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

        if(fileList.length == 0) return cb(null, true);
        else if(single == true) return cb(fileList[0], null);
        return cb(fileList, null);
    });
}


// Each product has it's ID, which is used as part of image filenames.
// Thumbs are stored in a separate s3 bucket.
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
