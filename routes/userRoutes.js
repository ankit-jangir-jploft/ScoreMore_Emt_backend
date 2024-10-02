const express = require("express");
const router = express.Router();
const userController = require("../controller/userController");
const isAuthenticated = require("../middleware/isAuthanticated");

// Public routes
router.post("/signup", userController.signup);
router.post("/signin", userController.signInWithPassword);
router.post('/signin/otp', userController.signInWithOTP);
router.post('/verify/otp', userController.verifyOTP);
router.get("/verify-email", userController.verifyEmail);

// Forgot password and reset password 
router.post('/forgotPassword', userController.forgotPassword);
router.post("/resetPassword", userController.resetPassword);

// Protected routes (require authentication)
router.post("/editProfile", isAuthenticated, userController.editProfile);
router.get("/logout", isAuthenticated, userController.logout); 
router.patch("/delete", isAuthenticated, userController.deactivateUser)

module.exports = router;
