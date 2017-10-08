var tweets = require('./tweets/getTweets');
var posters = require('./posters/makePoster');
var products = require('./products/insertProducts');

const WORKERS = process.env.WEB_CONCURRENCY || 1;
for (let i = 0; i < WORKERS; i++) {
  cluster.fork();
}



// TODO: 	Upload generated posters to S3 bucket 'trumptweetposters'

// TODO: 	Heroku scheduled job for the poster gen. Twitter webhook? (zapier.com enables this, posts to a URL)

// If you need a scheduled job < 10 min interval, you'll have to use something other than the basic scheduler add-on.

// TODO: 	Environment vars: change mongoDB URI, poster folder location for LIVE app.


// 	AWS s3 info stored as Heroku config vars: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_BUCKET_NAME


// TODO: Move libs confs to heroku vars.

// TODO: 	Printful API - hook into expressCart order process and create Printful order when payment has 
//			been taken - e.g. from a PayPal callback with successful flag.
// TODO: 	'Product' in Printful means the actual printful product e.g. poster. Variants mean 24 x 36 
//			poster, for example.
// TODO: 	Doesn't look like you need to create individual 'products' saved on Printful. Only orders. 
//			https://www.printful.com/docs/orders


/*

 Example request body for creating a new order, see: https://www.printful.com/docs/orders under 
 'Create order with external ID, custom item names and retail price information.'

{
    "external_id": "9887112",
    "recipient": {
        "name": "John Doe",
        "address1": "19749 Dearborn St",
        "city": "Chatsworth",
        "state_code": "CA",
        "country_code": "US",
        "zip": "91311"
    },
    "items": [{
        "variant_id": 2,
        "quantity": 1,
        "name": "Niagara Falls poster",
        "retail_price": "19.99",
        "files": [{
            "url": "http://example.com/files/posters/poster_2.jpg"
        }]
    }, {
        "variant_id": 1,
        "quantity": 3,
        "name": "Grand Canyon poster",
        "retail_price": "17.99",
        "files": [{
            "url": "http://example.com/files/posters/poster_3.jpg"
        }]
    }],
    "retail_costs": {
        "shipping": "24.50"
    }
}


*/


//@TODO: Twitter webhook, fire this when a new tweet is sent.
//https://dev.twitter.com/webhooks/getting-started

// TODO: Reply to tweet with link to product

// TODO: Make an 'official' twitter account. Make new API keys.


tweets.importTweets(function(success) {

	tweets.loadTweets(function(errLoad, tweets) {

		posters.make(tweets, function(errMake) {

			products.insertProducts(tweets, function(errInsert) {

				if(success) {
					console.log('INSERTED PRODUCTS.');
	            } else {
					console.log('Could not create products.');
	            }

	            process.exit();
        	});    
		});                
    });
});
