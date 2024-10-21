const express = require('express');
const router = express.Router();
const stripeController = require("../controller/stripeController")

router.post('/checkout', stripeController.checkout);
router.post('/checkPaymentstatus', stripeController.stripeSession);




module.exports = router;