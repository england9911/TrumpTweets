var fs = require('fs')
var path = require('path')
var Canvas = require('..')


function fontFile (name) {
  return path.join(__dirname, '/fonts/', name)
}

// Pass each font, including all of its individual variants if there are any, to
// `registerFont`. When you set `ctx.font`, refer to the styles and the family
// name as it is embedded in the TTF. If you aren't sure, open the font in
// FontForge and visit Element -> Font Information and copy the Family Name
Canvas.registerFont(fontFile('AktivGrotesk.ttf'), {family: 'AktivGrotesk'})
Canvas.registerFont(fontFile('AktivGroteskBold.ttf'), {family: 'AktivGroteskBold', weight: 'bold'})
Canvas.registerFont(fontFile('AktivGroteskItalic.ttf'), {family: 'AktivGroteskItalic', style: 'italic'})
Canvas.registerFont(fontFile('AktivGroteskBoldItalic.ttf'), {family: 'AktivGroteskBoldItalic', weight: 'bold', style: 'italic'})
Canvas.registerFont(fontFile('AktivGroteskLight.ttf'), {family: 'AktivGroteskLight', weight: 'bold'})
Canvas.registerFont(fontFile('AktivGroteskLightItalic.ttf'), {family: 'AktivGroteskLightItalic', style: 'italic'})




var canvas = new Canvas(7200, 10800)
var ctx = canvas.getContext('2d')

ctx.globalAlpha = 0.2

ctx.strokeRect(0, 0, 200, 200)
ctx.lineTo(0, 100)
ctx.lineTo(200, 100)
ctx.stroke()

ctx.beginPath()
ctx.lineTo(100, 0)
ctx.lineTo(100, 200)
ctx.stroke()

ctx.globalAlpha = 1
// ctx.font = 'normal 40px Impact, serif'
ctx.font = 'normal 400px AktivGroteskBold'


// ctx.rotate(0.5)
// ctx.translate(20, -40)

// ctx.lineWidth = 1
// ctx.strokeStyle = '#ddd'
// ctx.strokeText('Wahoo', 50, 100)

ctx.fillStyle = '#000'
ctx.fillText('Wahoo', 49, 99)

var m = ctx.measureText('Wahoo')

// ctx.strokeStyle = '#f00'

// ctx.strokeRect(
//   49 + m.actualBoundingBoxLeft,
//   99 - m.actualBoundingBoxAscent,
//   m.actualBoundingBoxRight - m.actualBoundingBoxLeft,
//   m.actualBoundingBoxAscent + m.actualBoundingBoxDescent
// )

canvas.createPNGStream().pipe(fs.createWriteStream(path.join(__dirname, 'text.png')))
