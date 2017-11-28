var posters = require('../posters/makePoster');
var products = require('../products/insertProducts');

var mongodb = require('mongodb');
var async = require('async');
var path = require('path');
var common = require('../../routes/common');
var config = common.getConfig();
var AWS = require('aws-sdk');
var stringify = require('json-stringify-safe');
var util = require('util');
var fs = require('fs-extra');




const S3_BUCKET = process.env.S3_BUCKET_NAME;
const S3_THUMBS = process.env.S3_THUMBS;
const s3 = new AWS.S3();


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

			// console.log('results:');
			// console.log(results);

			// Run ONE regeneration at a time to save memory.

	        if(results.length > 0) {

	            async.eachSeries(results, function(result, callback2) {

	                // Regenerate the thumbnail (Lambda function). function = posterThumb.
	                var lambda = new AWS.Lambda();

	                // SEE: http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Lambda.html#invoke-property


	                // Thought; If you could get to the bototm of why the tthumb isn't generated the first time, this file is not needed.

	                // TODO: invoke with:  heroku local:run node libs/posters/generateMissing.js

	                // Payload — (Buffer, Typed Array, Blob, String) e.g. s3 buffer response.

	                // Load main poster imgs, send to lambda.

	                // Event obj in Lambda func:
	                /*

					{ Records: 
					[ { eventVersion: '2.0',
					eventSource: 'aws:s3',
					awsRegion: 'us-east-2',
					eventTime: '2017-11-27T21:01:28.606Z',
					eventName: 'ObjectCreated:Put',
					userIdentity: { principalId: 'A28TPN8QLJR2ZP' },
					requestParameters: { sourceIPAddress: '2.121.184.72' },
					responseElements: 
					{ 'x-amz-request-id': '70C05D96AF9B12D2',
					'x-amz-id-2': 'sp3CIzy1zVyBOEeG7cGQYrZvcOQB2aXcNFfDH12FojQG76rHwgY3814eKdhfk89Ev+yLntqnY5Y=' },
					s3: 
					{ s3SchemaVersion: '1.0',
					configurationId: '17ce48ff-aa8f-4822-9f90-e8d34f143131',
					bucket: 
					{ name: 'trumptweetposters',
					ownerIdentity: { principalId: 'A28TPN8QLJR2ZP' },
					arn: 'arn:aws:s3:::trumptweetposters' },
					object: 
					{ key: '930089374187950100-2977BC-24x32.png',
					size: 1436508,
					eTag: '846f2fdc40fae605ba0e014c4ffdd011',
					sequencer: '005A1C7D28833341D4' } } } ] }

	                */

	                // If any error is passed to a successive function, the waterfall goes
				    // straight to it's top-level callback.
                    async.waterfall([
				        function list(next) {

				            console.log("posters bucket: " + S3_BUCKET)

				            s3.listObjects({
				                Bucket: S3_BUCKET,
				                Delimiter: "/",
				                Prefix: result.productPermalink + '-'
				            }, function(err, data) {

				                if(err) next(err);
				                else if (data.Contents.length === 0) {
				                    next('NO IMAGES FOUND', null);
				                }

				                var bucketContents = data.Contents;
				                var rootFiles = [];
				                for (var i = 0; i < bucketContents.length; i++) {
				                    rootFiles.push(bucketContents[i].Key);
				                }

				                next(null, bucketContents);
				            });
				        },
				        function download(files, next) {

							var i = 0;
							var newThumbs = [];
						
							// get buffer object from s3 for each obj
							async.eachSeries(files, function(file, callback3) {

								console.log('file')
								console.log(file)
								console.log(file.Key)

								var filenameLoc = file.Key + '--tmp' + '.png';
								var fullpath = path.join(__dirname, '../posters/poster-imgs/' + filenameLoc);
								const s3Stream = s3.getObject({Bucket:S3_BUCKET, Key: file.Key}).createReadStream();
							    const fileStream = fs.createWriteStream(fullpath);
							    s3Stream.on('error', function() {

							    });
							    fileStream.on('error', function() {

							    });
							    // This is what gets called when the object has been written
							    // locally with pipe().
							    fileStream.on('close', () => {
							        // console.log('Created local file: ' + filename + ' successfully.');
							    });

							    s3Stream.pipe(fileStream).on('close', function() {

							        const fileBuffer = fs.createReadStream(fullpath);

							        var params = {
										FunctionName: "posterThumb", 
										Payload: fileBuffer
									};
														
				    				lambda.invoke(params, function(err, data) {
				              
										if (err) {
											console.log(err, err.stack); 
										} else {
											i++;              
											console.log('image ' + i);
											console.log('returned lambda data:');
											console.log(data);
											callback3();
										}
									});
							    });
							});

					      
						}
				        ], function (err, newThumb) {

				            if (err) {
				                console.log(err);
				            } 
				            // else {
				            //     console.log('Renamed thumbs successfully. Save this one: ' + newThumb);
				            //     cb(null, newThumb);
				            // }
				        }
				    );


									
					

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