var tweets = require('./tweets/getTweets');
var posters = require('./posters/makePoster');
var products = require('./products/insertProducts');

//@TODO: Twitter webhook, fire this when a new tweet is sent.
//https://dev.twitter.com/webhooks/getting-started

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
