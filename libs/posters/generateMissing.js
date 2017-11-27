var posters = require('../posters/makePoster');
var products = require('../products/insertProducts');

var mongodb = require('mongodb');
var async = require('async');
var path = require('path');
var common = require('../../routes/common');
var config = common.getConfig();
var AWS = require('aws-sdk')


// Load products.

// Check the value of productImage. If it is NULL or "/uploads/placeholder.png" regenerate the poster & thumbnail.

// Save the new thumbnail value on AWS to the productImage field.


// It's generally just the thumbnail that has not been created. Not the full poster.
function reCreate(callback) {

	mongodb.connect(config.databaseConnectionString, {}, function(err, db) {

		if(err) {
			console.log(err);
			return;
		}

		var productsCol = db.collection('products');

		var cursor = productsCol.find(
		   {
		      productImage: { $in: [ null,  '/uploads/placeholder.png' ] }
		   }
		).project({ productImage: 1, productPermalink: 1, productTitle: 1 });

		cursor.toArray(function(err, results) {

			if (err) throw err;

			console.log('results:');
			console.log(results);

			// Run ONE regeneration at a time to save memory.

	        if(results.length > 0) {

	            async.eachSeries(files, function(thumb, callback3) {

	                // Regenerate the thumbnail (Lambda function). function = posterThumb.
	                var lambda = new AWS.Lambda();

	                // SEE: http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Lambda.html#invoke-property


	                // Thought; If you could get to the bototm of why the tthumb isn't generated the first time, this file is not needed.

	                // TODO: invoke with:  heroku local:run node libs/posters/generateMissing.js

									
					var params = {
					  FunctionName: "posterThumb", 
					  LogType: "None", 
					  Payload: '<JSON that you want to provide to your Lambda function as input>', 
					  Qualifier: "1"
					};
					
					lambda.invoke(params, function(err, data) {
					   if (err) console.log(err, err.stack); // an error occurred
					   else     console.log(data);           // successful response
					   /*
					   data = {
					    FunctionError: "", 
					    LogResult: "", 
					    Payload: <Binary String>, 
					    StatusCode: 123
					   }
					   */
					});

	                // Save the thumbnail into the products collection.
	            });
	        }	
	        else {
	            return callback(false);
	        }




	    });

		

	});

};

reCreate();




// tweets.loadTweets(function(errLoad, tweets) {

// 	if(errLoad) {
// 		console.log(errLoad);
// 		return;
// 	}



// });