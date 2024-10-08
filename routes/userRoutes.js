const express = require("express");
const router = express.Router();
const userController = require("../controller/userController");
const isAuthenticated = require("../middleware/isAuthanticated");
const { upload } = require("../middleware/multer");

// Public routes
router.post("/signup", userController.signup);
router.post("/signin", userController.signInWithPassword);
router.post('/signin/otp', userController.signInWithOTP);
router.post('/verify/otp', userController.verifyOTP);
router.get("/verify-email", userController.verifyEmail);

// My Profile
router.get("/myProfile", isAuthenticated, userController.myProfile);

// Forgot Password and Reset Password 
router.post('/forgotPassword', userController.forgotPassword);
router.post("/resetPassword", userController.resetPassword);

// Protected routes (require authentication)
router.patch("/editProfile", isAuthenticated, upload, userController.editProfile); 
router.post("/logout", isAuthenticated, userController.logout); 
router.patch("/delete", isAuthenticated, userController.deactivateUser);




// User question route
router.post("/userQuestionData", isAuthenticated, userController.userQuestionData)
router.post("/submitTestResult", userController.submitTestResults)

module.exports = router;
