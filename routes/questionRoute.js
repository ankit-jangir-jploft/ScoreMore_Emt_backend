const express = require('express');
const router = express.Router();
const { uploadCSV } = require("../middleware/multer");
const questionController = require("../controller/questionController")

// Route to get all questions
router.get('/getAllQuestions', questionController.getAllQuestions);
router.post('/filterQuestion', questionController.filterQuestions);


// curd for question 
router.post("/addQuestion", questionController.addQuestion);
router.get("/getQuestion/:id", questionController.getQuestionById);

router.post("/updatequestion/:id", questionController.updateQuestion)
router.post("/deleteQuestion/:id", questionController.deleteQuestion);

router.post("/addQuestionCSV", uploadCSV, questionController.addQuestionFromCsv);

// Route to get a specific question by ID
// router.get('/questions/:id', questionController.getQuestionById);

module.exports = router;
