var tweets = require('./tweets/getTweets');
var posters = require('./posters/makePoster');
var products = require('./products/insertProducts');


// TODO: 	Upload generated posters to S3 bucket 'trumptweetposters'

// TODO: 	Heroku scheduled job for the poster gen. Twitter webhook? (zapier.com enables this, posts to a URL)

// If you need a scheduled job < 10 min interval, you'll have to use something other than the basic scheduler add-on.

// TODO: 	Environment vars: change mongoDB URI, poster folder location for LIVE app.

// TODO: 	Printful API - hook into expressCart order process and create Printful order when payment has
//			been taken - e.g. from a PayPal callback with successful flag.
// TODO: 	'Product' in Printful means the actual printful product e.g. poster. Variants mean 24 x 36
//			poster, for example.
// TODO: 	Doesn't look like you need to create individual 'products' saved on Printful. Only orders.
//			https://www.printful.com/docs/orders



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
