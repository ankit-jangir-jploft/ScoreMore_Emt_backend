const express = require('express');
const router = express.Router();
const examController = require("../controller/examController");


router.post("/examRecord", examController.examRecord)



module.exports = router;
