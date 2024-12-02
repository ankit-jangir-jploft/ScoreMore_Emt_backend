const express = require('express');
const router = express.Router();
const adminController = require("../controller/adminController");
const { uploadProfilePicture } = require('../middleware/multer');



//  auth
router.post('/login', adminController.signInWithPassword);

router.post("/dashboardAPi", adminController.getDashboardData);
router.post("/userList", adminController.getAllUsers);

router.patch("/deactivateUser/:id", adminController.deactivateUser);
router.patch("/unblockUser/:id", adminController.unblockUser);
router.patch('/editProfile/:id', uploadProfilePicture, adminController.editProfile);
router.delete('/deleteUser/:id', adminController.deleteUser);

// export excel route
router.get("/exportUserExcel", adminController.userExcel);

// add or edit subscriptiuon route 

router.post('/addSubscription', adminController.createSubscription);
router.delete("/deleteSubscription/:id", adminController.deleteSubscription);
router.put('/editsubscription/:id', adminController.updateSubscriptionPrice);
router.get('/getAllSubscriptions', adminController.getAllSubscription);
router.get("/getSubscriptionById/:id", adminController.getSubscriptionById);


//flkashcard
router.get("/getAllFlashcard", adminController.getAllFlashcards);

// question
router.get("/getAllSubjects", adminController.getAllSubjects);

// review

router.get("/getAllReview", adminController.getAllReview);
router.delete("/deleteReview/:id", adminController.deletereview);

// contacus 

router.get("/getAllContactUsEnquiries", adminController.getAllContactUs);
router.delete("/deleteContactUsEnquiry/:id", adminController.deleteContact);


// feedback

router.get('/feedbacks', adminController.getAllFeedback);
router.delete('/feedback/:feedbackId', adminController.deleteFeedback);

module.exports = router;
