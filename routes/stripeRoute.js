const express = require('express');
const router = express.Router();
const stripeController = require("../controller/stripeController")

router.post('/checkout', stripeController.checkout);
router.post('/checkPaymentstatus', stripeController.stripeSession);

router.post("/saveSubscription", stripeController.saveSubscription)

router.post("/webhook/google-play/cancel", stripeController.cancelGoogleSubscription);
router.post("/webhook/apple/cancel", stripeController.cancelIOSSubscription);


module.exports = router;