var tweets = require('./tweets/getTweets');
var posters = require('./posters/makePoster');
var products = require('./products/insertProducts');

// TODO: Printful API - hook into expressCart order process and create Printful order when payment has been taken. 
// TODO: 'Product' in Printful means the actual printful product e.g. poster. Variants mean 24 x 36 poster, for example.
// TODO: doesn't look like you need to create individual products on Printful. Only orders. https://www.printful.com/docs/orders

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
