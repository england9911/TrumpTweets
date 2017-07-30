var fs = require('fs')
var path = require('path')
var OpenType = require('opentype.js')
var Canvas = require('canvas')
var Image = Canvas.Image
var CanvasTextWrapper = require('canvas-text-wrapper').CanvasTextWrapper;
var moment = require('moment');


var textStr = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque interdum rutrum sodales. Nullam mattis fermentum libero, non volutpat.'
var screenName = '@realDonaldTrump'
var tweetDate = new Date('Thu Jul 27 19:08:58 +0000 2017')  


function makePoster(textStr, screenName, tweetDate) {

    OpenType.load('/Users/mattengland/sites/TrumpTweets/expressCart/bin/fonts/MyriadProBoldSemiC.ttf', function(err, font){

        if(err) {

            console.log(err);
            process.exit(1);
        }
        else {

            var cWidth = 7200
            var cHeight = 10800
            var cPadding = (cWidth / 15)      
            var canvas = new Canvas(cWidth, cHeight)

            // Canvas background colour.
            var ctx = canvas.getContext('2d')

            ctx.fillStyle = '#FFFFFF'
            ctx.fillRect(0, 0, cWidth, cHeight);

            // Main tweet text.
            ctx = canvas.getContext('2d')
            ctx.fillStyle = '#000000'
            ctx.textAlign = 'left'
            ctx.textBaseline = 'top'
            ctx.font = "600px 'Myriad Pro'"
            ctx.lineHeight = 1.1;

            CanvasTextWrapper(canvas, textStr, {
                font: ctx.font,
                textAlign: ctx.textAlign,
                verticalAlign: ctx.textBaseline,
                paddingX: cPadding,
                paddingY: cPadding * 4,
                lineHeight: ctx.lineHeight
            });

            // Screen name.
            ctx = canvas.getContext('2d')
            ctx.fillStyle = '#000000'
            ctx.textAlign = 'left'
            ctx.textBaseline = 'middle'
            ctx.font = "300px 'Myriad Pro'"

            CanvasTextWrapper(canvas, screenName, {
                font: ctx.font,
                textAlign: ctx.textAlign,
                verticalAlign: "bottom",
                paddingX: cPadding,
                paddingY: cPadding * 1.5
            });

            // Date of tweet.
            ctx = canvas.getContext('2d')
            ctx.fillStyle = '#000000'
            ctx.textAlign = 'left'
            ctx.textBaseline = 'middle'
            ctx.font = "150px 'Aktiv Grotesk'"

            
            OpenType.load('/Users/mattengland/sites/TrumpTweets/expressCart/bin/fonts/AktivGrotesk.ttf', function(err, font2){

                var formatDate = moment(tweetDate).format('dddd, MMMM Do YYYY, h:mm a')
                var fileDate = moment.utc(formatDate,'dddd, MMMM Do YYYY, h:mm a').format('X')


                CanvasTextWrapper(canvas, formatDate, {
                    font: ctx.font,
                    textAlign: ctx.textAlign,
                    verticalAlign: "bottom",
                    paddingX: cPadding,
                    paddingY: cPadding
                });

                // Watermark.
                // CanvasTextWrapper(canvas, 'TrumpPosterTweets.com', {
                //     font: ctx.font,
                //     textAlign: "right",
                //     verticalAlign: "bottom",
                //     paddingX: cPadding,
                //     paddingY: cPadding
                // });


                fs.readFile(__dirname + '/img/watermark.png', function(err, squid) {

                    if (err) throw err
                    var img = new Image
                    img.src = squid

                    ctxt = canvas.getContext('2d')
                    ctxt.drawImage(img, 5700, 9400)

                    canvas.createPNGStream().pipe(fs.createWriteStream(path.join(__dirname, fileDate + '-24x32.png')))
                });


                // Image = new Canvas.Image;
                // var img = new Image();
                // img.src = __dirname + 'img/watermark.png';
                // canvas.getContext('2d').drawImage(img, 0, 0);



            });
        }
    });
};

makePoster(textStr, screenName, tweetDate);