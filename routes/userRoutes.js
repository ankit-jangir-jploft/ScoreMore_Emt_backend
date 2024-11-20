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
router.get("/userDetail/:id", userController.getUserDetail);

// Forgot Password and Reset Password 
router.post('/forgotPassword', userController.forgotPassword);
router.post("/resetPassword", userController.resetPassword);

// Protected routes (require authentication)
router.patch("/editProfile", isAuthenticated, upload, userController.editProfile); 
router.post("/logout", isAuthenticated, userController.logout); 



// User question routes
router.post("/userQuestionData", isAuthenticated, userController.userQuestionData);
router.post("/findquestionStatus", userController.findquestionMarkSatatus);
router.post("/updateQuestion", userController.updateQuestionData)
router.post("/submitTestResult", userController.submitTestResults);
router.post("/lastSubmitQuestion", userController.lastSubmitQuestion)
router.post("/allExamRecord", userController.allExamRecord);
router.post("/dailyStreak", userController.userDailyStreak)


// user subscription rouyr
router.get("/subscription/:id", userController.getSubscriptionDetails)
router.get("/transactionHistory/:id", userController.getUserTransactionHistory);
router.get("/invoice/:id", userController.getInvoicetemplate);


// user contact us 
router.post("/contact", userController.contactUs);
router.post("/userRating", userController.rateUs);

router.post("/set-reminder", userController.sendReminder);
router.get("/get-reminder", userController.getUserReminders);
router.delete("/delete-reminder/:id", userController.deleteReminder);


module.exports = router;