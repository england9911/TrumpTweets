var fs = require('fs')
var path = require('path')
var OpenType = require('opentype.js')
var Canvas = require('canvas')
var CanvasTextWrapper = require('canvas-text-wrapper').CanvasTextWrapper;

function fontFile (name) {
  return path.join(__dirname, '/fonts/', name)
}

OpenType.load('fonts/AktivGroteskBold.ttf', function(err, font){

    var cWidth = 7200
    var cHeight = 10800
    var cPadding = (cWidth / 20)
    var textStr = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque interdum rutrum sodales. Nullam mattis fermentum libero, non volutpat.'
    var canvas = new Canvas(cWidth, cHeight)
    var ctx = canvas.getContext('2d')

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle'
    ctx.font = '500px AktivGroteskBold'

    CanvasTextWrapper(canvas, textStr, {
        font: ctx.font,
        textAlign: ctx.textAlign,
        verticalAlign: ctx.textBaseline,
    });

    canvas.createPNGStream().pipe(fs.createWriteStream(path.join(__dirname, 'text.png')))
});