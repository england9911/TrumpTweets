// expressCart stuff.
var mongodb = require('mongodb');
var async = require('async');
var path = require('path');
var common = require('../routes/common');
var config = common.getConfig();

// Twit stuff.
var Twit = require('twit');
var assert = require('assert');

var T = new Twit({
  consumer_key:         'oVlWXbZ12rcooRWWy1pUXH3rz',
  consumer_secret:      'p958ZUFohLbRgKhf0GmRFybRtxjmfgYzwji36Fw9fSgA6GZRKD',
  access_token:         '2613390788-C1Wpvzp4yV5wxAiHvuVv1AzBRjOAgULKB1WIp0C',
  access_token_secret:  '2iZ8HcyIkfT1Z6k0PpniUC3zXvJ1iXmvaTekfaqLBZi5V',
  timeout_ms:           60*1000,  // optional HTTP request timeout to apply to all requests.
});

var tweetOptions = { screen_name: 'realDonaldTrump',
                	 count: 3 };


