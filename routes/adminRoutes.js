const express = require('express');
const router = express.Router();
const adminController = require("../controller/adminController");
const { upload } = require('../middleware/multer');





//  auth
router.post('/login', adminController.signInWithPassword);

router.post("/dashboardAPi", adminController.getDashboardData);
router.get("/userList", adminController.getAllUsers);

router.patch("/deactivateUser/:id", adminController.deactivateUser);
router.patch("/unblockUser/:id", adminController.unblockUser);
router.patch('/editProfile/:id', upload, adminController.editProfile);
router.delete('/deleteUser/:id', adminController.deleteUser);

// export excel route
router.get("/exportUserExcel", adminController.userExcel);

// add or edit subscriptiuon route 

router.post('/addSubscription', adminController.createSubscription);

router.put('/editsubscription/:id', adminController.updateSubscriptionPrice);
router.get('/getAllSubscriptions', adminController.getAllSubscription);
router.get("/getSubscriptionById/:id", adminController.getSubscriptionById);


//flkashcard
router.get("/getAllFlashcard", adminController.getAllFlashcards)

module.exports = router;
