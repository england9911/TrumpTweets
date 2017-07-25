var fs = require('fs')
var path = require('path')
var OpenType = require('opentype.js')
var Canvas = require('canvas')
var CanvasTextWrapper = require('canvas-text-wrapper').CanvasTextWrapper;

function fontFile (name) {
  return path.join(__dirname, '/fonts/', name)
}

OpenType.load('/Users/mattengland/sites/TrumpTweets/expressCart/bin/fonts/MyriadProBoldSemiC.ttf', function(err, font){

    if(err) {

        console.log(err);
    }
    else {

        var cWidth = 7200
        var cHeight = 10800
        var cPadding = (cWidth / 15)
        var textStr = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque interdum rutrum sodales. Nullam mattis fermentum libero, non volutpat.'
        var canvas = new Canvas(cWidth, cHeight)
        var ctx = canvas.getContext('2d')

        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(0, 0, cWidth, cHeight);

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

        // TODO: Print the username in smaller text below the main tweet. 
        // TODO: Print the date of the tweet below that.

        canvas.createPNGStream().pipe(fs.createWriteStream(path.join(__dirname, 'text-24x32.png')))
    }
});