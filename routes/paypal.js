var express = require('express');
var common = require('./common');
var paypal = require('paypal-rest-sdk');
var router = express.Router();

// Custom.
var products = require('./../libs/products/insertProducts');


router.get('/checkout_cancel', function (req, res, next){
    // return to checkout for adjustment or repayment
    res.redirect('/checkout');
    return;
});

router.get('/checkout_return', function (req, res, next){
    var db = req.app.db;
    var config = common.getConfig();
    var paymentId = req.session.paymentId;

    // MATT: Changed below line to paramS based on:
    // GMT express deprecated req.param(name): Use req.params, req.body, or req.query instead
    // at routes/paypal.js:20:23

    var payerId = req.params('PayerID');

    var details = {'payer_id': payerId};
    paypal.payment.execute(paymentId, details, function (error, payment){
        var paymentApproved = false;
        var paymentMessage = '';
        if(error){
            paymentApproved = false;

            if(error.response.name === 'PAYMENT_ALREADY_DONE'){
                paymentApproved = false;
                paymentMessage = error.response.message;
            }else{
                paymentApproved = false;
                paymentDetails = error.response.error_description;
            }

            // set the error
            req.session.messageType = 'danger';
            req.session.message = error.response.error_description;
            req.session.paymentApproved = paymentApproved;
            req.session.paymentDetails = paymentDetails;

            res.redirect('/payment/' + req.session.orderId);
            return;
        }

        var paymentOrderId = req.session.orderId;
        var paymentStatus = 'Approved';
        var paymentDetails = '';

        // fully approved
        if(payment.state === 'approved') {
            paymentApproved = true;
            paymentStatus = 'Paid';
            paymentMessage = 'Your payment was successfully completed';
            paymentDetails = '<p><strong>Order ID: </strong>' + paymentOrderId + '</p><p><strong>Transaction ID: </strong>' + payment.id + '</p>';

            // clear the cart
            if(req.session.cart){
                req.session.cart = null;
                req.session.orderId = null;
                req.session.totalCartAmount = 0;
            }
        }

        // failed
        if(payment.failureReason){
            paymentApproved = false;
            paymentMessage = 'Your payment failed - ' + payment.failureReason;
            paymentStatus = 'Declined';
        }

        // update the order status
        db.orders.update({_id: common.getId(paymentOrderId)}, {$set: {orderStatus: paymentStatus}}, {multi: false}, function(err, numReplaced){
            if(err){
                console.info(err.stack);
            }
            db.orders.findOne({_id: common.getId(paymentOrderId)}, function(err, order){
                if(err){
                    console.info(err.stack);
                }
                var lunrDoc = {
                    orderLastname: order.orderLastname,
                    orderEmail: order.orderEmail,
                    orderPostcode: order.orderPostcode,
                    id: order._id
                };

                // add to lunr index
                req.app.ordersIndex.add(lunrDoc);

                // set the results
                req.session.messageType = 'success';
                req.session.message = paymentMessage;
                req.session.paymentEmailAddr = order.orderEmail;
                req.session.paymentApproved = paymentApproved;
                req.session.paymentDetails = paymentDetails;

                var paymentResults = {
                    message: req.session.message,
                    messageType: req.session.messageType,
                    paymentEmailAddr: req.session.paymentEmailAddr,
                    paymentApproved: req.session.paymentApproved,
                    paymentDetails: req.session.paymentDetails
                };

                // Call custom lib to order from Printful here.
                if(payment.state === 'approved') {
                    console.log('Approved payment. Place order with Printful.');
                    products.printfulOrder(req, order, function(err) {
                        console.log('CALLBACK FOR printfulOrder()  ' + err);
                    });
                };

                // send the email with the response
                common.sendEmail(req.session.paymentEmailAddr, 'Your payment with ' + config.cartTitle, common.getEmailTemplate(paymentResults));

                res.redirect('/payment/' + order._id);
                return;
            });
        });
    });
});

// The homepage of the site
router.post('/checkout_action', function (req, res, next){
    var db = req.app.db;
    var config = common.getConfig();
    var paypalConfig = common.getPaymentConfig();

    // setup the payment object
    var payment = {
        'intent': 'sale',
        'payer': {
            'payment_method': 'paypal'
        },
        'redirect_urls': {
            'return_url': config.baseUrl + '/paypal/checkout_return',
            'cancel_url': config.baseUrl + '/paypal/checkout_cancel'
        },
        'transactions': [{
            'amount': {
                'total': req.session.totalCartAmount,
                'currency': paypalConfig.paypalCurrency
            },
            'description': paypalConfig.paypalCartDescription
        }]
    };

    // set the config
    paypal.configure(paypalConfig);

    // create payment
    paypal.payment.create(payment, function (error, payment){
        if(error){
          console.log('PAYPAL ERROR');
          console.log(error)
            req.session.message = 'There was an error processing your payment. You have not been changed and can try again.';
            req.session.messageType = 'danger';
            res.redirect('/pay');
            return;
        }
        if(payment.payer.payment_method === 'paypal'){
            req.session.paymentId = payment.id;
            var redirectUrl;
            for(var i = 0; i < payment.links.length; i++){
                var link = payment.links[i];
                if(link.method === 'REDIRECT'){
                    redirectUrl = link.href;
                }
            }

            // if there is no items in the cart then render a failure
            if(!req.session.cart){
                req.session.message = 'The are no items in your cart. Please add some items before checking out';
                req.session.messageType = 'danger';
                res.redirect('/');
                return;
            }

            // new order doc
            var orderDoc = {
                orderPaymentId: payment.id,
                orderPaymentGateway: 'Paypal',
                orderTotal: req.session.totalCartAmount,
                orderEmail: req.body.shipEmail,
                orderFirstname: req.body.shipFirstname,
                orderLastname: req.body.shipLastname,
                orderAddr1: req.body.shipAddr1,
                orderAddr2: req.body.shipAddr2,
                orderCountry: req.body.shipCountry,
                orderState: req.body.shipState,
                orderPostcode: req.body.shipPostcode,
                orderPhoneNumber: req.body.shipPhoneNumber,
                orderStatus: payment.state,
                orderDate: new Date(),
                orderProducts: req.session.cart
            };

            if(req.session.orderId){
                // we have an order ID (probably from a failed/cancelled payment previosuly) so lets use that.

                // send the order to Paypal
                res.redirect(redirectUrl);
            }else{
                // no order ID so we create a new one
                db.orders.insert(orderDoc, function(err, newDoc){
                    if(err){
                        console.info(err.stack);
                    }

                    // get the new ID
                    var newId = newDoc._id;
                    if(config.databaseType !== 'embedded'){
                        if(newDoc.insertedIds.length > 0){
                            newId = newDoc.insertedIds[0].toString();
                        }
                    }

                    // set the order ID in the session
                    req.session.orderId = newId;

                    // send the order to Paypal
                    res.redirect(redirectUrl);
                });
            }
        }
    });
});

module.exports = router;
