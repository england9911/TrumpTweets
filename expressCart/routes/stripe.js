var express = require('express');
var common = require('./common');
var numeral = require('numeral');
var stripe = require('stripe')(common.getPaymentConfig().secretKey);
var router = express.Router();

// The homepage of the site
router.post('/checkout_action', function (req, res, next){
    var db = req.app.db;
    var config = common.getConfig();
    var stripeConfig = common.getPaymentConfig();

    // charge via stripe
    stripe.charges.create({
        amount: numeral(req.session.totalCartAmount).format('0.00').replace('.', ''),
        currency: stripeConfig.stripeCurrency,
        source: req.body.stripeToken,
        description: stripeConfig.stripeDescription
    }, function(err, charge){
        if(err){
            console.info(err.stack);
            req.session.messageType = 'danger';
            req.session.message = 'Your payment has declined. Please try again';
            req.session.paymentApproved = false;
            req.session.paymentDetails = '';
            res.redirect('/pay');
            return;
        }

        // order status
        var paymentStatus = 'Paid';
        if(charge.paid !== true){
            paymentStatus = 'Declined';
        }

        // new order doc
        var orderDoc = {
            orderPaymentId: charge.id,
            orderPaymentGateway: 'Stripe',
            orderPaymentMessage: charge.outcome.seller_message,
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
            orderStatus: paymentStatus,
            orderDate: new Date(),
            orderProducts: req.session.cart
        };

        // insert order into DB
        db.orders.insert(orderDoc, function(err, newDoc){
            if(err){
                console.info(err.stack);
            }

            // get the new ID
            var newId = newDoc._id;
            if(config.databaseType !== 'embedded'){
                newId = newDoc.insertedIds;
            }

            // create order to add to index
            var lunrDoc = {
                orderLastname: orderDoc.orderLastname,
                orderEmail: orderDoc.orderEmail,
                orderPostcode: orderDoc.orderPostcode,
                id: newId
            };

            // add to lunr index
            req.app.ordersIndex.add(lunrDoc);

            // if approved, send email etc
            if(charge.paid === true){
                // set the results
                req.session.messageType = 'success';
                req.session.message = 'Your payment was successfully completed';
                req.session.paymentEmailAddr = newDoc.orderEmail;
                req.session.paymentApproved = true;
                req.session.paymentDetails = '<p><strong>Order ID: </strong>' + newId + '</p><p><strong>Transaction ID: </strong>' + charge.id + '</p>';

                // set payment results for email
                var paymentResults = {
                    message: req.session.message,
                    messageType: req.session.messageType,
                    paymentEmailAddr: req.session.paymentEmailAddr,
                    paymentApproved: true,
                    paymentDetails: req.session.paymentDetails
                };

                // clear the cart
                if(req.session.cart){
                    req.session.cart = null;
                    req.session.orderId = null;
                    req.session.totalCartAmount = 0;
                }

                // send the email with the response
                common.sendEmail(req.session.paymentEmailAddr, 'Your payment with ' + config.cartTitle, common.getEmailTemplate(paymentResults));

                // redirect to outcome
                res.redirect('/payment/' + newId);
            }else{
                // redirect to failure
                req.session.messageType = 'danger';
                req.session.message = 'Your payment has declined. Please try again';
                req.session.paymentApproved = false;
                req.session.paymentDetails = '<p><strong>Order ID: </strong>' + newId + '</p><p><strong>Transaction ID: </strong>' + charge.id + '</p>';
                res.redirect('/payment/' + newId);
                return;
            }
        });
    });
});

module.exports = router;
