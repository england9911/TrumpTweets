var express = require('express');
var path = require('path');
var logger = require('morgan');
var handlebars = require('express-handlebars');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var Nedb = require('nedb');
var session = require('express-session');
var bcrypt = require('bcrypt-nodejs');
var lunr = require('lunr');
var moment = require('moment');
var NedbStore = require('nedb-session-store')(session);
var MongoStore = require('connect-mongodb-session')(session);
var MongoClient = require('mongodb').MongoClient;
var numeral = require('numeral');
var helmet = require('helmet');
var colors = require('colors');
var common = require('./routes/common');

// require the routes
var index = require('./routes/index');
var admin = require('./routes/admin');
var paypal = require('./routes/paypal');
var stripe = require('./routes/stripe');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, '/views'));
app.engine('hbs', handlebars({extname: 'hbs', layoutsDir: path.join(__dirname, '/views/layouts'), defaultLayout: 'layout.hbs'}));
app.set('view engine', 'hbs');

// helpers for the handlebar templating platform
handlebars = handlebars.create({
    partialsDir: [
        'views/partials/'
    ],
    helpers: {
        perRowClass: function(numProducts){
            if(parseInt(numProducts) === 1){
                return'col-md-12 col-xl-12 product-item';
            }
            if(parseInt(numProducts) === 2){
                return'col-md-6 col-xl-6 product-item';
            }
            if(parseInt(numProducts) === 3){
                return'col-md-4 col-xl-4 product-item';
            }
            if(parseInt(numProducts) === 4){
                return'col-md-3 col-xl-3 product-item';
            }

            return'col-md-6 col-xl-6 product-item';
        },
        formatAmount: function(amt){
            if(amt){
                return numeral(amt).format('0.00');
            }
            return'0.00';
        },
        amountNoDecimal: function(amt){
            if(amt){
                return handlebars.helpers.formatAmount(amt).replace('.', '');
            }
            return handlebars.helpers.formatAmount(amt);
        },
        getStatusColor: function (status){
            switch(status){
            case'Paid':
                return'success';
            case'Approved':
                return'success';
            case'Approved - Processing':
                return'success';
            case'Failed':
                return'danger';
            case'Completed':
                return'success';
            case'Shipped':
                return'success';
            case'Pending':
                return'warning';
            default:
                return'danger';
            }
        },
        checkProductOptions: function (opts){
            if(opts){
                return'true';
            }
            return'false';
        },
        currencySymbol: function(value){
            if(typeof value === 'undefined' || value === ''){
                return'$';
            }
            return value;
        },
        objectLength: function(obj){
            if(obj){
                return Object.keys(obj).length;
            }
            return 0;
        },
        checkedState: function (state){
            if(state === 'true' || state === true){
                return'checked';
            }
            return'';
        },
        selectState: function (state, value){
            if(state === value){
                return'selected';
            }
            return'';
        },
        isNull: function (value, options){
            if(typeof value === 'undefined' || value === ''){
                return options.fn(this);
            }
            return options.inverse(this);
        },
        formatDate: function (date, format){
            return moment(date).format(format);
        },
        ifCond: function (v1, operator, v2, options){
            switch(operator){
            case'==':
                return(v1 === v2) ? options.fn(this) : options.inverse(this);
            case'!=':
                return(v1 !== v2) ? options.fn(this) : options.inverse(this);
            case'===':
                return(v1 === v2) ? options.fn(this) : options.inverse(this);
            case'<':
                return(v1 < v2) ? options.fn(this) : options.inverse(this);
            case'<=':
                return(v1 <= v2) ? options.fn(this) : options.inverse(this);
            case'>':
                return(v1 > v2) ? options.fn(this) : options.inverse(this);
            case'>=':
                return(v1 >= v2) ? options.fn(this) : options.inverse(this);
            case'&&':
                return(v1 && v2) ? options.fn(this) : options.inverse(this);
            case'||':
                return(v1 || v2) ? options.fn(this) : options.inverse(this);
            default:
                return options.inverse(this);
            }
        },
        isAnAdmin: function (value, options){
            if(value === 'true'){
                return options.fn(this);
            }
            return options.inverse(this);
        }
    }
});

// get config
var config = common.getConfig();

// var session store
var store = null;
if(config.databaseType === 'embedded'){
    store = new NedbStore({filename: 'data/sessions.db'});
}else{
    store = new MongoStore({
        uri: config.databaseConnectionString,
        collection: 'sessions'
    });
}

app.enable('trust proxy');
app.use(helmet());
app.set('port', process.env.PORT || 1111);
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser('5TOCyfH3HuszKGzFZntk'));
app.use(session({
    resave: true,
    saveUninitialized: true,
    secret: 'pAgGxo8Hzg7PFlv1HpO8Eg0Y6xtP7zYx',
    cookie: {
        path: '/',
        httpOnly: true,
        maxAge: 3600000 * 24
    },
    store: store
}));

// serving static content
app.use(express.static(path.join(__dirname, 'public')));

// Make stuff accessible to our router
app.use(function (req, res, next){
    req.handlebars = handlebars;
    req.bcrypt = bcrypt;
    next();
});

// setup the routes
app.use('/', index);
app.use('/admin', admin);
app.use('/paypal', paypal);
app.use('/stripe', stripe);

// catch 404 and forward to error handler
app.use(function(req, res, next){
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if(app.get('env') === 'development'){
    app.use(function(err, req, res, next){
        console.error(colors.red(err.stack));
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err,
            helpers: handlebars.helpers
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next){
    console.error(colors.red(err.stack));
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {},
        helpers: handlebars.helpers
    });
});

app.on('uncaughtException', function(err){
    console.error(colors.red(err.stack));
    process.exit();
});

// sets up the databse depending on whether it's embedded (NeDB) or MongoDB
if(config.databaseType === 'embedded'){
    // setup the db's
    var db = new Nedb();
    db = {};
    db.users = new Nedb({filename: path.join('data', 'users.db'), autoload: true});
    db.products = new Nedb({filename: path.join('data', 'products.db'), autoload: true});
    db.orders = new Nedb({filename: path.join('data', 'orders.db'), autoload: true});
    db.pages = new Nedb({filename: path.join('data', 'pages.db'), autoload: true});

    // add db to app for routes
    app.db = db;

    // add indexing
    runIndexing(app, function(err){
        if(err){
            console.error(colors.red('Error setting up indexes:' + err));
            process.exit();
        }

        // lift the app
        app.listen(app.get('port'), function (){
            console.log(colors.green('expressCart running on host: http://localhost:' + app.get('port')));
        });
    });
}else{
    MongoClient.connect(config.databaseConnectionString, {}, function(err, db){
        // On connection error we display then exit
        if(err){
            console.log(colors.red('Error connecting to MongoDB: ' + err));
            process.exit();
        }

        // setup the collections
        db.users = db.collection('users');
        db.products = db.collection('products');
        db.orders = db.collection('orders');
        db.pages = db.collection('pages');

        // add db to app for routes
        app.db = db;

        // add indexing
        runIndexing(app, function(err){
            if(err){
                console.error(colors.red('Error setting up indexes:' + err));
                process.exit();
            }
            // lift the app
            app.listen(app.get('port'), function (){
                console.log(colors.green('expressCart running on host: http://localhost:' + app.get('port')));
            });
        });
    });
}

function indexProducts(app, cb){
    // setup lunr indexing
    var productsIndex = lunr(function (){
        this.field('productTitle', {boost: 10});
        this.field('productTags', {boost: 5});
        this.field('productDescription');
    });

    // index all products in lunr on startup
    common.dbQuery(app.db.products, {}, null, null, function (err, productsList){
        if(err){
            console.error(colors.red(err.stack));
        }
        // add to lunr index
        productsList.forEach(function(product){
            var doc = {
                'productTitle': product.productTitle,
                'productTags': product.productTags,
                'productDescription': product.productDescription,
                'id': product._id
            };
            productsIndex.add(doc);
        });

        app.productsIndex = productsIndex;
        cb(null);
    });
}

function indexOrders(app, cb){
    var ordersIndex = lunr(function (){
        this.field('orderEmail', {boost: 10});
        this.field('orderLastname', {boost: 5});
        this.field('orderPostcode');
    });

    // index all orders in lunr on startup
    common.dbQuery(app.db.orders, {}, null, null, function (err, ordersList){
        if(err){
            console.error(colors.red(err.stack));
        }

        // add to lunr index
        ordersList.forEach(function(order){
            var doc = {
                'orderLastname': order.orderLastname,
                'orderEmail': order.orderEmail,
                'orderPostcode': order.orderPostcode,
                'id': order._id
            };
            ordersIndex.add(doc);
        });

        app.ordersIndex = ordersIndex;
        cb(null);
    });
}

// start indexing products and orders
function runIndexing(app, cb){
    console.info(colors.yellow('Setting up indexes..'));
    indexProducts(app, function(err){
        if(err){
            console.error(colors.red('Error setting up products index: ' + err));
            cb(err);
        }
        console.log(colors.cyan('- Product indexing complete'));
        indexOrders(app, function(err){
            if(err){
                console.error(colors.red('Error setting up products index: ' + err));
                cb(err);
            }
            console.log(colors.cyan('- Order indexing complete'));
            cb(null);
        });
    });
}

module.exports = app;
