const express = require('express');
const router = express.Router();
const questionController = require("../controller/questionController")

// Route to get all questions
router.get('/getAllQuestion', questionController.getAllQuestions);
router.post('/filterQuestion', questionController.filterQuestions);

// Route to get a specific question by ID
// router.get('/questions/:id', questionController.getQuestionById);

module.exports = router;
