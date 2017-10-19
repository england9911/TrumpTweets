// expressCart stuff.
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

                            setS3ProductThumbs(tweetID, newId, function(err3) {

                                // updateMainImg(db, tweetID, newId, function(err4) {

                                    // if(err4) console.log(err4);
                                    cb();
                                // });
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

    // TODO: Save *just* the filename? we can then use env vars to change the path.
    // TODO: Set up a CNAME for posters.trumptweetposters.com and point it to s3 bucket
    // TODO: Set up a CNAME for media.trumptweetposters.com and point it to s3 thumb bucket

    var productsCol = db.collection('products');

    getSavedThumbs(tweetID, docID, true, function(mainImg, err) {

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

function setS3ProductThumbs(tweetID, docID, cb) {

    // TODO: We have thumbs stored in the root of the bucket. Those need to be moved
    // TODO: into a folder named by the new docID. Then, we need to save that path into
    // TODO: the DB. Don't save the full URL *with* the s3 url. we just want to keep
    // TODO: /docID/thumb.png

    // TODO: MOVE the THREE thumbs into that folder. SAVE just one filename to the DB.

    // TODO: Set up a CNAME for posters.trumptweetposters.com and point it to s3 bucket
    // TODO: Set up a CNAME for media.trumptweetposters.com and point it to s3 thumb bucket



    // If any error is passed to a successive function, the waterfall goes 
    // straight to it's top-level callback.
    async.waterfall([
        function list(next) {

            console.log('wait...');

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

            console.log('-----');
            console.log('download');
            console.log(files);
            console.log();
            // next(null, files);

            var i = 0;

            async.eachSeries(files, function(thumb, callback) {

                console.log(thumb);

                var filenameOrig = tweetID + '--' + i + '.png';
                var fullpath = path.join(__dirname, '/poster-imgs/' + filenameOrig);
                var file = fs.createWriteStream(fullpath);
                var filename = docID + '/' + thumb;


                file.on('open', function() {

                    console.log('open file')

                    const s3Stream = s3.getObject({Bucket:S3_THUMBS, Key: file}).createReadStream();

                    s3Stream.on('open', function(){
                        console.log('open s3 stream')
                        s3Stream.pipe(file).on('close', callback());
                    });




                    // // Upload back to s3 with new path.
                    // s3.putObject({
                    //   Bucket: S3_THUMBS,
                    //   ACL: 'public-read',
                    //   Key: filename,
                    //   Body: file,
                    //   ContentType: 'image/png'
                    // }, (err) => {
                    //   if (err) {
                    //     console.log('error re-uploading to s3:')
                    //     next(err);
                    //   } else {
                    //     console.log('Re-uploaded: ' + filename + ' to s3 successfully.')
                    //     i++;
                    //     callback();
                    //   }
                    // });


                });



                
            }, function(err) {

                if(err) console.log(err);
                console.log('ended.');
                next(null, filenames);
            });


            // async.eachSeries(Object.keys(config), function (key, next){ 
            //   search(config[key].query, function(err, result) { // <----- I added an err here
            //     if (err) return next(err)  // <---- don't keep going if there was an error

            //     var json = JSON.stringify({
            //       "result": result
            //     });
            //     results[key] = {
            //       "result": result
            //     }
            //     next()    /* <---- critical piece.  This is how the forEach knows to continue to
            //                        the next loop.  Must be called inside search's callback so that
            //                        it doesn't loop prematurely.*/
            //   })
            // }, function(err) {
            //   console.log('iterating done');
            // }); 


            // for (var i = 0; i < files.length; i++) {

            //     console.log('file: ' + files[i]);

            //     var filenameOrig = tweetID + '--' + i + '.png';
            //     var fullpath = path.join(__dirname, '/poster-imgs/' + filenameOrig);
            //     var file = fs.createWriteStream(fullpath);
            //     var filename = docID + '/' + files[i];

            //     console.log('new path: ' + filename);

            //     file.on('close', function() {

            //         console.log('file close');

            //         checkIfFile(filePath, function(err, isFile) {

            //             console.log('is file: ' + isFile);

            //             if(isFile) {

            //                 console.log('created temp local file: ' + filePath);

            //                 // Download the image from S3 into a temp local file.
            //                 s3.getObject({
            //                     Bucket: S3_THUMBS,
            //                     Key: files[i]
            //                 }).createReadStream().on('error', function(err){
            //                     console.log('error reading:');
            //                     console.log(err);
            //                 }).pipe(file);

            //                 console.log('after getting object:')

            //                 console.log(file);

            //                 // Upload back to s3 with new path.
            //                 s3.putObject({
            //                   Bucket: S3_THUMBS,
            //                   ACL: 'public-read',
            //                   Key: filename,
            //                   Body: file,
            //                   ContentType: 'image/png',
            //                 }, (err) => {
            //                   if (err) {
            //                     console.log('error re-uploading to s3:')
            //                     next(err);
            //                   } else {
            //                     console.log('Re-uploaded: ' + filename + ' to s3 successfully.')
            //                     if(i == files.length) next(null, filenames);
            //                   }
            //                 });

            //             }
            //             else {

            //                 console.log('File does not exist: ' + filePath);
            //             }


            //         });
            //     });

            // };
        },
        function del(files, next) {
            console.log('-----');
            console.log('delete');
            console.log(files);
            console.log();

            for (var i = 0; i < files.length; i++) {

                console.log('deleting original thumb: ' + files[i]);

                // Delete the existing object.
                s3.deleteObject({Bucket:S3_THUMBS, Key: filename}, function(err, data) {
                   if (err) next(err); // an error occurred
                   console.log('Deleted original: ' + filename);
                   if(i == files.length) {
                        console.log('Finished deleting.');
                        next(null);
                   }
                });
            }

            next(null);
        }
        ], function (err, result) {

            console.log('Finished waterfall, calling back');

            if (err) {
                console.log(err);
            } else {
                console.log('proper success mind');
                // console.log(
                //     'Successfully resized ' + tweetID + '/' + srcKey +
                //     ' and uploaded to ' + dstBucket + '/' + dstKey
                // );
            }

            cb();
        }
    );



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

function checkIfFile(file, cb) {
  fs.stat(file, function fsStat(err, stats) {
    if (err) {
      if (err.code === 'ENOENT') {
        return cb(null, false);
      } else {
        return cb(err);
      }
    }
    return cb(null, stats.isFile());
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

