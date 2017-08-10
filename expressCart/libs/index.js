var tweets = require('./tweets/getTweets');
var posters = require('./posters/makePoster');
// var products = require('./products/insertProducts');


tweets.importTweets(function(success) {

	tweets.loadTweets(function(errLoad, tweets) {

		posters.make(tweets, function(errMake) {

			if(success) {
                console.log('yes.');

            } else {
                console.log('no.');
            }

            process.exit();
		});

		// console.log(tweets);

                
    });
});
