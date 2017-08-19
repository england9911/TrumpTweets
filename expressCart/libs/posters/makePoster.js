var fs = require('fs')
var path = require('path')
var mongodb = require('mongodb')
var async = require('async')
var OpenType = require('opentype.js')
var Canvas = require('canvas')
var Image = Canvas.Image
var CanvasTextWrapper = require('canvas-text-wrapper').CanvasTextWrapper
var moment = require('moment')
var common = require('../../routes/common');
var config = common.getConfig()

// These two need an equal number of items in each object.
var bgColours = ['#2977BC','#D6353D','#FCFAEC']
var textColours = ['#FFF','#FFF','#000']


// Check for DB config
if(!config.databaseConnectionString) {
    console.log('No MongoDB configured. Please see README.md for help');
    process.exit(1);
}


module.exports.make = function(tweets, callback) {

    mongodb.connect(config.databaseConnectionString, {}, function(err, db) {

        var tweetsCol = db.collection('tweets');

        // **************************
        // TODO:
        // Emojis? font?


        // console.log(tweets);


        async.each(tweets, function (tweet, cb) {

            var tweetDate = tweet.tweet_local_date;

            if(tweet.posters_generated === false) {

                console.log('----1');

                if(err) {
                    cb(err);
                }
                else {
                    var cCount = 0;

                    async.each(bgColours, function (bgCol, cb2) {

                        makePoster(tweet.tweet_id, tweet.text, '@' + tweet.screen_name, tweetDate, bgCol, textColours[cCount], function(err) {
                            cb2();
                        });
                        cCount++;
                    }, 
                    function (err2) {
                        
                        if(err2) {
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
                console.log('----2');
                cb();
            }
        }, 
        function (err) {

            if(err) {
                db.close();
                callback(err, null);
            } 
            else {
                db.close();
                callback(null, 'All posters successfully generated, or no new posters needed.');
            }
        });
    });
}

function makePoster(tid, textStr, screenName, tweetDate, bgCol, textCol, callback) {

    OpenType.load(path.join(__dirname,'/fonts/MyriadProBoldSemiC.ttf'), function(err1, font){

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

                    console.log('-- 1');

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

                    console.log('Generating a poster..');

                    var filename = tid + '-' + bgCol + '-24x32.png';
                    var stream = canvas.createPNGStream().pipe(fs.createWriteStream(path.join(__dirname, '/poster-imgs/' + filename)))

                    // Listener.
                    stream.on('close', function(){
                      console.log('Saved ' + filename);
                      callback();
                    });
                }
            });
        }
    });
};
