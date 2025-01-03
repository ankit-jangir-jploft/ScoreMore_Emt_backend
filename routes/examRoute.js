const express = require('express');
const router = express.Router();
const examController = require("../controller/examController");


router.post("/examRecord", examController.examRecord)
router.get("/todayDailyChallange", examController.todayDailyChallangeStatus);
router.post("/perOptionPercentage", examController.getPerOptionPercentage);



module.exports = router;
