// require('dotenv').config()

var sharp = require('sharp')
var fs = require('fs')
var path = require('path')
var mongodb = require('mongodb')
var async = require('async')
var OpenType = require('opentype.js')
var Canvas = require('canvas')
var Image = Canvas.Image
var emojiStrip = require('emoji-strip')
var CanvasTextWrapper = require('canvas-text-wrapper').CanvasTextWrapper
var common = require('../../routes/common')
var config = common.getConfig()
var AWS = require('aws-sdk')
var postersDir = path.join(__dirname, '/poster-imgs')
var filenames = []

// These two need an equal number of items in each object.
var bgColours = ['#2977BC','#D6353D','#FCFAEC']
var textColours = ['#FFF','#FFF','#000']

AWS.config.region = 'us-east-2';
const S3_BUCKET = process.env.S3_BUCKET_NAME;
const s3 = new AWS.S3({ params: {Bucket: S3_BUCKET} });




// Check for DB config
if(!config.databaseConnectionString) {
    console.log('No MongoDB configured. Please see README.md for help')
    process.exit(1)
}


module.exports.make = function(tweets, callback) {

    mongodb.connect(config.databaseConnectionString, {}, function(err, db) {

        var tweetsCol = db.collection('tweets');

        // **************************
        // TODO:
        // Emojis? font?

        async.each(tweets, function (tweet, cb) {

            var tweetDate = tweet.tweet_local_date;

            if(tweet.posters_generated === false) {

                if(err) {
                    cb(err);
                }
                else {
                    var cCount = 0;

                    async.each(bgColours, function (bgCol, cb2) {

                        makePoster(tweet.tweet_id, tweet.text, '@' + tweet.screen_name, tweetDate, bgCol, textColours[cCount], function(filename, err) {

                            if (err) {
                                console.log(err)
                                cb2(err)
                            }
                            else {
                                cb2()
                            }

                            filenames.push(filename);
                        });
                        cCount++;
                    },
                    function (err2) {

                        if(err2) {
                            console.log(err2)
                            cb(err2)
                        }
                        else {
                            tweetsCol.updateOne(
                                { "tweet_id":tweet.tweet_id },
                                { $set: { "posters_generated" : true } },
                                function(err,res) {
                                    if (err) return cb(err);
                                    return cb();
                                }
                            );
                        }
                    });
                }
            }
            else {
                cb();
            }
        },
        function (err) {

            if(err) {
                console.log('error happened: ')
                db.close();
                callback(err);
            }
            else {
                // Lambda will run to resize images into thumbs.
                console.log('posters.make is calling back...')
                db.close();
                callback();
            }
        });
    });
}


// Make the full-size poster.
function makePoster(tid, textStr, screenName, tweetDate, bgCol, textCol, callback) {

    OpenType.load(path.join(__dirname, '/fonts/MyriadProBoldSemiC.ttf'), function(err1, font){

        if(err1) {
            callback(err);
        }
        else {
            var cWidth = 7200
            var cHeight = 10800
            var cPaddingX = (cWidth / 16)
            var cPaddingY = (cWidth / 10)
            var canvas = new Canvas(cWidth, cHeight)

            // Canvas background colour.
            var ctx = canvas.getContext('2d')

            ctx.fillStyle = bgCol
            ctx.fillRect(0, 0, cWidth, cHeight)

            // Strip emojis.
            textStr = emojiStrip(textStr);

            // Main tweet text.
            ctx = canvas.getContext('2d')
            ctx.fillStyle = textCol
            ctx.textAlign = 'left'
            ctx.textBaseline = 'top'
            ctx.font = "600px 'Myriad Pro'"
            ctx.lineHeight = 1.1

            CanvasTextWrapper(canvas, textStr, {
                font: ctx.font,
                textAlign: ctx.textAlign,
                verticalAlign: ctx.textBaseline,
                paddingX: cPaddingX,
                paddingY: cPaddingX * 4,
                lineHeight: ctx.lineHeight
            });

            // Screen name.
            ctx = canvas.getContext('2d')
            ctx.fillStyle = textCol
            ctx.textAlign = 'left'
            ctx.textBaseline = 'middle'
            ctx.font = "300px 'Myriad Pro'"

            CanvasTextWrapper(canvas, screenName, {
                font: ctx.font,
                textAlign: ctx.textAlign,
                verticalAlign: "bottom",
                paddingX: cPaddingX,
                paddingY: 1200
            });

            var text = ctx.measureText(screenName)
            ctx.strokeStyle = textCol
            ctx.beginPath()
            ctx.lineTo(450, 9650)
            ctx.lineTo(20000, 9650)
            ctx.lineWidth = 18
            ctx.stroke()

            // ctx.beginPath()
            // ctx.lineTo(450, 9850)
            // ctx.lineTo(20000, 9850)
            // ctx.lineWidth = 18;
            // ctx.stroke()

            // Date of tweet.
            ctx = canvas.getContext('2d')
            ctx.fillStyle = textCol
            ctx.textAlign = 'left'
            ctx.textBaseline = 'middle'
            ctx.font = "150px 'Aktiv Grotesk'"

            OpenType.load(path.join(__dirname, '/fonts/AktivGrotesk.ttf'), function(err, font2) {

                if(err1) {
                    callback(err);
                }
                else {
                    CanvasTextWrapper(canvas, tweetDate, {
                        font: ctx.font,
                        textAlign: ctx.textAlign,
                        verticalAlign: "bottom",
                        paddingX: cPaddingX,
                        paddingY: 900
                    });

                    // // Watermark text.
                    // CanvasTextWrapper(canvas, 'TrumpPosterTweets.com', {
                    //     font: ctx.font,
                    //     textAlign: "left",
                    //     verticalAlign: "bottom",
                    //     paddingX: cPaddingX,
                    //     paddingY: 450
                    // });

                    // fs.readFile(__dirname + '/img/watermark-transparent.png', function(err, squid) {

                    //     if (err) throw err
                    //     var img = new Image
                    //     img.src = squid

                    //     ctxt = canvas.getContext('2d')
                    //     ctxt.drawImage(img, 5700, 9400)

                    //     canvas.createPNGStream().pipe(fs.createWriteStream(path.join(__dirname, fileDate + '-' + bgCol + '-24x32.png')))
                    // });

                    console.log('Generating a poster...');

                    var bgColSafe = bgCol.replace('#','');
                    var filename = tid + '-' + bgColSafe + '-24x32.png';
                    var filePath = path.join(__dirname, '/poster-imgs/' + filename);
                    var stream = canvas.createPNGStream().pipe(fs.createWriteStream(filePath));

                    // Listener for images creation.
                    stream.on('close', function() {

                        checkIfFile(filePath, function(err, isFile) {

                          if (isFile) {

                            console.log('Generated full-size img: ' + filePath);

                            // Upload file to S3.
                            const fileBuffer = fs.createReadStream(filePath);

                            s3.putObject({
                              ACL: 'public-read',
                              Key: filename,
                              Body: fileBuffer,
                              ContentType: 'image/png',
                            }, (err) => {
                              if (err) {
                                console.log('error uploading to s3:')
                                console.log(err);
                                callback(filename, err);
                              } else {
                                console.log('Uploaded: ' + filename + ' to s3 successfully.')
                                callback(filename);
                              }
                            });
                          }
                          else {

                            console.log('File does not exist: ' + filePath);
                          }
                        });
                    });
                }
            });
        }
    });
};

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
