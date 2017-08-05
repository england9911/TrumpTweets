var fs = require('fs')
var path = require('path')
var OpenType = require('opentype.js')
var Canvas = require('canvas')
var Image = Canvas.Image
var CanvasTextWrapper = require('canvas-text-wrapper').CanvasTextWrapper;
var moment = require('moment');


// var textStr = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque interdum rutrum sodales. Nullam mattis fermentum libero, non volutpat.'
// var screenName = '@realDonaldTrump'
// var tweetDate = new Date('Thu Jul 27 19:08:58 +0000 2017')  

// makePoster(textStr, screenName, tweetDate, '#2977bc', '#FFF');
// makePoster(textStr, screenName, tweetDate, '#d6353d', '#FFF');
// makePoster(textStr, screenName, tweetDate, '#fcfaec', '#000');

function makePoster(textStr, screenName, tweetDate, bgCol, textCol, callback) {

    OpenType.load(path.join(__dirname,'/fonts/MyriadProBoldSemiC.ttf'), function(err, font){

        if(err) {

            console.log(err);
            process.exit(1);
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
            ctx.fillRect(0, 0, cWidth, cHeight);

            // Main tweet text.
            ctx = canvas.getContext('2d')
            ctx.fillStyle = textCol
            ctx.textAlign = 'left'
            ctx.textBaseline = 'top'
            ctx.font = "600px 'Myriad Pro'"
            ctx.lineHeight = 1.1;

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
            ctx.lineWidth = 18;
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
            
            OpenType.load(path.join(__dirname, '/fonts/AktivGrotesk.ttf'), function(err, font2){

                // @TODO: Is this UTC?
                var formatDate = moment(tweetDate).format('dddd, MMMM Do YYYY, h:mm a')
                var fileDate = moment.utc(formatDate,'dddd, MMMM Do YYYY, h:mm a').format('X')

                CanvasTextWrapper(canvas, formatDate, {
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
                var filename = fileDate + '-' + bgCol + '-24x32.png';
                var stream = canvas.createPNGStream().pipe(fs.createWriteStream(path.join(__dirname, '/posters/' + filename)))

                stream.on('end', function(){
                  console.log('Saved ' + filename);
                });
            });
        }
    });
};
