const express = require('express');
const router = express.Router();
const questionController = require("../controller/questionController")

// Route to get all questions
router.get('/getAllQuestion', questionController.getAllQuestions);
router.post('/filterQuestion', questionController.filterQuestions);


// curd for question 
router.post("/addQuestion", questionController.addQuestion);
router.post("/updatequestion/:id", questionController.updateQuestion)
router.post("/deleteQuestion/:id", questionController.deleteQuestion)

// Route to get a specific question by ID
// router.get('/questions/:id', questionController.getQuestionById);

module.exports = router;
