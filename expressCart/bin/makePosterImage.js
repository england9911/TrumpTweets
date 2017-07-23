var fs = require('fs')
var path = require('path')
var drawText = require('node-canvas-text')
var opentype = require('opentype.js')
var Canvas = require('canvas')

console.log(drawText)



// function fontFile (name) {
//   return path.join(__dirname, '/fonts/', name)
// }


// Canvas.registerFont(fontFile('AktivGrotesk.ttf'), {family: 'AktivGrotesk'})
// Canvas.registerFont(fontFile('AktivGroteskBold.ttf'), {family: 'AktivGroteskBold', weight: 'bold'})
// Canvas.registerFont(fontFile('AktivGroteskItalic.ttf'), {family: 'AktivGroteskItalic', style: 'italic'})
// Canvas.registerFont(fontFile('AktivGroteskBoldItalic.ttf'), {family: 'AktivGroteskBoldItalic', weight: 'bold', style: 'italic'})
// Canvas.registerFont(fontFile('AktivGroteskLight.ttf'), {family: 'AktivGroteskLight', weight: 'bold'})
// Canvas.registerFont(fontFile('AktivGroteskLightItalic.ttf'), {family: 'AktivGroteskLightItalic', style: 'italic'})

var mainFont = opentype.loadSync(__dirname + '/fonts/AktivGroteskBold.ttf');


var cWidth = 7200
var cHeight = 10800
var cPadding = (cWidth / 20)
var textStr = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque interdum rutrum sodales. Nullam mattis fermentum libero, non volutpat.'
var canvas = new Canvas(cWidth, cHeight)
var ctx = canvas.getContext('2d')
// var m = ctx.measureText(textStr)


// var textTopOffset = ((cHeight - m.height) / 2)
// var textLeftOffset = ((cWidth - m.width) / 2)

// console.log(m)
// console.log('top:' + textTopOffset + ' left:' + textLeftOffset)


// canvas.fillStyle = '#FFF'

// TODO: Text not wrapping or vertically centering.
// https://github.com/kaivi/node-canvas-text



// ctx.patternQuality="best";
// ctx.antialias = "subpixel";
// ctx.textAlign = 'center';
// ctx.textBaseline = 'middle'
// ctx.globalAlpha = 1
// // ctx.font = 'normal 40px Impact, serif'
// ctx.font = 'normal 400px AktivGroteskBold'
// ctx.fillStyle = '#000'
// ctx.fillText(textStr, textLeftOffset, textTopOffset, (cWidth / cPadding))

var drawRect = 1;
var headerRect = {
    x: 0,
    y: 0,
    width: canvas.width,
    height: canvas.height / 3.5 };

// ERROR: IS NOT A FUNC. TODO *********
drawText(ctx, textStr, mainFont, headerRect,
    {
        minSize: 5,
        maxSize: 200,
        hAlign: 'center',
        vAlign: 'center',
        fitMethod: 'box',
        drawRect: drawRect });


canvas.createPNGStream().pipe(fs.createWriteStream(path.join(__dirname, 'text.png')))
