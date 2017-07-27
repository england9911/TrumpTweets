var fs = require('fs')
var path = require('path')
var OpenType = require('opentype.js')
var Canvas = require('canvas')
var CanvasTextWrapper = require('canvas-text-wrapper').CanvasTextWrapper;
var moment = require('moment');


OpenType.load('/Users/mattengland/sites/TrumpTweets/expressCart/bin/fonts/MyriadProBoldSemiC.ttf', function(err, font){

    if(err) {

        console.log(err);
    }
    else {

        var cWidth = 7200
        var cHeight = 10800
        var cPadding = (cWidth / 15)
        var textStr = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque interdum rutrum sodales. Nullam mattis fermentum libero, non volutpat.'
        var screenName = '@realDonaldTrump'
        var tweetDate = new Date('Thu Jul 27 19:08:58 +0000 2017')        
        var canvas = new Canvas(cWidth, cHeight)

        console.log(tweetDate)

        // Canvas background colour.
        var ctx = canvas.getContext('2d')

        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(0, 0, cWidth, cHeight);

        // Main tweet text.
        ctx = canvas.getContext('2d')
        ctx.fillStyle = '#000000'
        ctx.textAlign = 'left'
        ctx.textBaseline = 'middle'
        ctx.font = "600px 'Myriad Pro'"

        CanvasTextWrapper(canvas, textStr, {
            font: ctx.font,
            textAlign: ctx.textAlign,
            verticalAlign: ctx.textBaseline,
            paddingX: cPadding,
            paddingY: cPadding
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

            var formatDate = moment(tweetDate).format('dddd, MMMM Do YYYY, h:mm:ss a');

            CanvasTextWrapper(canvas, formatDate, {
                font: ctx.font,
                textAlign: ctx.textAlign,
                verticalAlign: "bottom",
                paddingX: cPadding,
                paddingY: cPadding
            });

            canvas.createPNGStream().pipe(fs.createWriteStream(path.join(__dirname, 'text-24x32.png')))
        });


        // TODO: Print the date of the tweet below that.

    }
});