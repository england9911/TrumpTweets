var _ = require('lodash');
var uglifycss = require('uglifycss');
var colors = require('colors');
var escape = require('html-entities').AllHtmlEntities;

// common functions
exports.checkLogin = function(req, res, next){
	// if not protecting we check for public pages and don't checkLogin
    if(req.session.needsSetup === true){
        res.redirect('/setup');
        return;
    }

    if(req.session.user){
        next();
        return;
    }
    res.redirect('/login');
};

exports.showCartCloseBtn = function(page){
    var showCartCloseButton = true;
    if(page === 'checkout' || page === 'pay'){
        showCartCloseButton = false;
    }

    return showCartCloseButton;
};

// adds products to sitemap.xml
exports.addSitemapProducts = function(req, res, cb){
    var db = req.app.db;
    var async = require('async');
    var config = this.getConfig();
    var hostname = config.baseUrl;

    exports.dbQuery(db.products, {productPublished: 'true'}, null, null, function(err, products){
        var posts = [];
        if(err){
            cb(null, posts);
        }
        async.eachSeries(products, function iteratee(item, callback){
            var post = {};
            var url = item._id;
            if(item.productPermalink){
                url = item.productPermalink;
            }
            post.url = hostname + '/' + url;
            post.changefreq = 'weekly';
            post.priority = 0.7;
            posts.push(post);
            callback(null, posts);
        }, function done(){
            cb(null, posts);
        });
    });
};

exports.restrict = function(req, res, next){
    exports.checkLogin(req, res, next);
};

exports.clearSessionValue = function(session, sessionVar){
    if(session){
        var temp = session[sessionVar];
        session[sessionVar] = null;
    }
    return temp;
};

exports.updateTotalCartAmount = function(req, res){
    var config = this.getConfig();

    req.session.totalCartAmount = 0;

    _(req.session.cart).forEach(function(item){
        req.session.totalCartAmount = req.session.totalCartAmount + item.totalItemPrice;
    });

    // under the free shipping threshold
    if(req.session.totalCartAmount < config.freeShippingAmount){
        req.session.totalCartAmount = req.session.totalCartAmount + parseInt(config.flatShipping);
        req.session.shippingCostApplied = true;
    }else{
        req.session.shippingCostApplied = false;
    }
};

exports.checkDirectorySync = function (directory){
    var fs = require('fs');
    try{
        fs.statSync(directory);
    }catch(e){
        fs.mkdirSync(directory);
    }
};

exports.getThemes = function (){
    var fs = require('fs');
    var path = require('path');
    return fs.readdirSync(path.join('public', 'themes')).filter(file => fs.statSync(path.join(path.join('public', 'themes'), file)).isDirectory());
};

exports.getImages = function (dir, req, res, callback){
    var db = req.app.db;
    var glob = require('glob');
    var fs = require('fs');

    db.products.findOne({_id: exports.getId(dir)}, function(err, product){
        if(err){
            console.error(colors.red('Error getting images', err));
        }
        // loop files in /public/uploads/
        glob('public/uploads/' + dir + '/**', {nosort: true}, function (er, files){
            // sort array
            files.sort();

            // declare the array of objects
            var fileList = [];

            // loop these files
            for(var i = 0; i < files.length; i++){
                // only want files
                if(fs.lstatSync(files[i]).isDirectory() === false){
                    // declare the file object and set its values
                    var file = {
                        id: i,
                        path: files[i].substring(6)
                    };
                    if(product.productImage === files[i].substring(6)){
                        file.productImage = true;
                    }
                    // push the file object into the array
                    fileList.push(file);
                }
            }
            callback(fileList);
        });
    });
};

exports.getConfig = function(){
    var fs = require('fs');
    var path = require('path');

    var config = JSON.parse(fs.readFileSync(path.join(__dirname, '../config/settings.json'), 'utf8'));
    config.customCss = typeof config.customCss !== 'undefined' ? escape.decode(config.customCss) : null;
    config.footerHtml = typeof config.footerHtml !== 'undefined' ? escape.decode(config.footerHtml) : null;
    config.googleAnalytics = typeof config.googleAnalytics !== 'undefined' ? escape.decode(config.googleAnalytics) : null;

    // set the environment for files
    config.env = '.min';
    if(process.env.NODE_ENV === 'development' || process.env.NODE_ENV === undefined){
        config.env = '';
    }

    // default DB to embedded
    if(typeof config.databaseType === 'undefined'){
        config.databaseType = 'embedded';
    }

    // setup theme
    config.themeViews = '';
    if(typeof config.theme !== 'undefined' && config.theme !== ''){
        config.themeViews = '../public/themes/' + config.theme + '/';
    }

    // if db set to mongodb override connection with MONGODB_CONNECTION_STRING env var
    if(config.databaseType === 'mongodb'){
        config.databaseConnectionString = process.env.MONGODB_CONNECTION_STRING || config.databaseConnectionString;
    }

    return config;
};

exports.getPaymentConfig = function(){
    var fs = require('fs');
    var path = require('path');
    var siteConfig = this.getConfig();

    var config = [];
    if(fs.existsSync(path.join(__dirname, '../config/' + siteConfig.paymentGateway + '.json'))){
        config = JSON.parse(fs.readFileSync(path.join(__dirname, '../config/' + siteConfig.paymentGateway + '.json'), 'utf8'));
    }

    return config;
};

exports.updateConfig = function(fields){
    var fs = require('fs');
    var path = require('path');
    var settingsFile = JSON.parse(fs.readFileSync(path.join(__dirname, '../config/settings.json'), 'utf8'));

    _.forEach(fields, function(value, key){
        settingsFile[key] = value;
        if(key === 'customCss_input'){
            settingsFile['customCss'] = escape.encode(uglifycss.processString(value));
        }
        if(key === 'footerHtml_input'){
            var footerHtml = typeof value !== 'undefined' || value === '' ? escape.encode(value) : '';
            settingsFile['footerHtml'] = footerHtml;
        }
        if(key === 'googleAnalytics_input'){
            var googleAnalytics = typeof value !== 'undefined' ? escape.encode(value) : '';
            settingsFile['googleAnalytics'] = googleAnalytics;
        }
    });

    // delete settings
    delete settingsFile['customCss_input'];
    delete settingsFile['footerHtml_input'];
    delete settingsFile['googleAnalytics_input'];

    if(fields['emailSecure'] === 'on'){
        settingsFile['emailSecure'] = true;
    }else{
        settingsFile['emailSecure'] = false;
    }

    if(!fields['menuEnabled']){
        settingsFile['menuEnabled'] = 'false';
    }else{
        settingsFile['menuEnabled'] = 'true';
    }

    // write file
    fs.writeFileSync(path.join(__dirname, '../config/settings.json'), JSON.stringify(settingsFile, null, 4));
};

exports.getMenu = function(){
    var fs = require('fs');
    var path = require('path');
    var menuFile = JSON.parse(fs.readFileSync(path.join(__dirname, '../config/menu.json'), 'utf8'));

    menuFile.items = _.sortBy(menuFile.items, 'order');
    return menuFile;
};

// creates a new menu item
exports.newMenu = function(req, res){
    var fs = require('fs');
    var path = require('path');
    var menuJson = '../config/menu.json';
    var menuFile = require(menuJson);

    var newNav = {
        title: req.body.navMenu,
        link: req.body.navLink,
        order: Object.keys(menuFile.items).length + 1
    };

    // add new menu item
    menuFile.items.push(newNav);

    // write file
    fs.writeFileSync(path.join(__dirname, '../config/menu.json'), JSON.stringify(menuFile));
};

// delete a menu item
exports.deleteMenu = function(req, res, menuIndex){
    var fs = require('fs');
    var path = require('path');
    var menuJson = '../config/menu.json';
    var menuFile = require(menuJson);

    delete menuFile.items[menuIndex];

    // write file
    fs.writeFileSync(path.join(__dirname, '../config/menu.json'), JSON.stringify(menuFile));
};

// updates and existing menu item
exports.updateMenu = function(req, res){
    var fs = require('fs');
    var path = require('path');
    var menuJson = '../config/menu.json';
    var menuFile = require(menuJson);

    // find menu item and update it
    var menuIndex = _.findIndex(menuFile.items, ['title', req.body.navId]);
    menuFile.items[menuIndex].title = req.body.navMenu;
    menuFile.items[menuIndex].link = req.body.navLink;

    // write file
    fs.writeFileSync(path.join(__dirname, '../config/menu.json'), JSON.stringify(menuFile));
};

exports.getEmailTemplate = function(result){
    var cheerio = require('cheerio');
    var config = this.getConfig();
    var fs = require('fs');
    var path = require('path');

    var template = fs.readFileSync(path.join(__dirname, '../public/email_template.html'), 'utf8');

    $ = cheerio.load(template);
    $('#brand').text(config.cartTitle);
    $('#paymentResult').text(result.message);
    if(result.paymentApproved === true){
        $('#paymentResult').addClass('text-success');
    }else{
        $('#paymentResult').addClass('text-danger');
    }
    $('#paymentMessage').text('Thanks for shopping with us. We hope you will shop with us again soon.');
    $('#paymentDetails').html(result.paymentDetails);

    return $.html();
};

exports.sendEmail = function(to, subject, body){
    var config = this.getConfig();
    var nodemailer = require('nodemailer');

    var emailSettings = {
        host: config.emailHost,
        port: config.emailPort,
        secure: config.emailSecure,
        auth: {
            user: config.emailUser,
            pass: config.emailPassword
        }
    };

    // outlook needs this setting
    if(config.emailHost === 'smtp-mail.outlook.com'){
        emailSettings.tls = {ciphers: 'SSLv3'};
    }

    var transporter = nodemailer.createTransport(emailSettings);

    var mailOptions = {
        from: config.emailAddress, // sender address
        to: to, // list of receivers
        subject: subject, // Subject line
        html: body// html body
    };

    transporter.sendMail(mailOptions, function(error, info){
        if(error){
            return console.error(colors.red(error));
        }
        return true;
    });
};

// orders the menu
exports.orderMenu = function(req, res){
    var fs = require('fs');
    var path = require('path');
    var menuJson = '../config/menu.json';
    var menuFile = require(menuJson);

    // update the order
    for(var i = 0; i < req.body.navId.length; i++){
        _.find(menuFile.items, ['title', req.body.navId[i]]).order = i;
    }

    // write file
    fs.writeFileSync(path.join(__dirname, '../config/menu.json'), JSON.stringify(menuFile));
};

// gets the correct type of index ID
exports.getId = function(id){
    var config = exports.getConfig();
    var ObjectID = require('mongodb').ObjectID;
    if(config.databaseType === 'embedded'){
        return id;
    }
    if(id){
        if(id.length !== 24){
            return id;
        }
    }
    return ObjectID(id);
};

// run the DB query
exports.dbQuery = function(db, query, sort, limit, callback){
    var config = exports.getConfig();

    if(config.databaseType === 'embedded'){
        if(sort && limit){
            db.find(query).sort(sort).limit(parseInt(limit)).exec(function(err, results){
                if(err){
                    return console.error(colors.red(err));
                }
                callback(null, results);
            });
        }else{
            db.find(query).exec(function(err, results){
                if(err){
                    return console.error(colors.red(err));
                }
                callback(null, results);
            });
        }
    }else{
        if(sort && limit){
            db.find(query).sort(sort).limit(parseInt(limit)).toArray(function(err, results){
                if(err){
                    return console.error(colors.red(err));
                }
                callback(null, results);
            });
        }else{
            db.find(query).toArray(function(err, results){
                if(err){
                    return console.error(colors.red(err));
                }
                callback(null, results);
            });
        }
    }
};
