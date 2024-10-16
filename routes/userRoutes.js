const express = require("express");
const router = express.Router();
const userController = require("../controller/userController");
const isAuthenticated = require("../middleware/isAuthanticated");
const { upload } = require("../middleware/multer");

// Publi
router.post("/signup", userController.signup);
router.post("/signin", userController.signInWithPassword);
router.post('/signin/otp', userController.signInWithOTP);
router.post('/verify/otp', userController.verifyOTP);
router.get("/verify-email", userController.verifyEmail);
router.post("/socialLogin", userController.socialLogin)

// My Profile
router.post("/myProfile", isAuthenticated, userController.myProfile);

// Forgot Password and Reset Password 
router.post('/forgotPassword', userController.forgotPassword);
router.post("/resetPassword", userController.resetPassword);

// Protected routes (require authentication)
router.patch("/editProfile", isAuthenticated, upload, userController.editProfile); 
router.post("/logout", isAuthenticated, userController.logout); 
router.patch("/delete", isAuthenticated, userController.deactivateUser);



// User question route
router.post("/userQuestionData", isAuthenticated, userController.userQuestionData);
router.post("/updateQuestion", userController.updateQuestionData)
router.post("/submitTestResult", userController.submitTestResults);
router.post("/lastSubmitQuestion", userController.lastSubmitQuestion)

router.post("/allExamRecord", userController.allExamRecord)


module.exports = router;
