const express = require("express");
const router = express.Router();
const userController = require("../controller/userController");
const isAuthenticated = require("../middleware/isAuthanticated");


router.post("/signup", userController.signup)
router.post("/signin", userController.signInWithPassword);
router.post('/signin/otp', userController.signInWithOTP);
router.post('/verify/otp', userController.verifyOTP);

module.exports = router;