const express = require('express');
const router = express.Router();
const questionController = require("../controller/questionController")

// Route to get all questions
router.get('/questions', questionController.getAllQuestions);

// Route to get a specific question by ID
// router.get('/questions/:id', questionController.getQuestionById);

module.exports = router;
