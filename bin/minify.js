var uglifycss = require('uglifycss');
var uglifyjs = require('uglify-js');
var fs = require('fs');

// css files
uglifyFile('public/stylesheets/bootstrap-xl.css', 'css');
uglifyFile('public/stylesheets/pushy.css', 'css');
uglifyFile('public/stylesheets/admin.css', 'css');
uglifyFile('public/stylesheets/style.css', 'css');

// js files
uglifyFile('public/javascripts/expressCart.js', 'js');

// uglify either JS or CSS files
function uglifyFile(filename, type){
    if(type === 'css'){
        var cssfileContents = fs.readFileSync(filename, 'utf8');
        var cssUglified = uglifycss.processString(cssfileContents);
        var cssMiniFilename = filename.substring(0, filename.length - 4) + '.min.' + type;
        fs.writeFileSync(cssMiniFilename, cssUglified, 'utf8');
    }
    if(type === 'js'){
        var jsUglified = uglifyjs.minify([filename], {
            compress: {
                dead_code: true,
                global_defs: {
                    DEBUG: false
                }
            }
        });

        var jsMiniFilename = filename.substring(0, filename.length - 3) + '.min.' + type;
        fs.writeFileSync(jsMiniFilename, jsUglified.code, 'utf8');
    }
}
