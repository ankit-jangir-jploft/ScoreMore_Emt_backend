const path = require('path');
const questionsData = require(path.join(__dirname, '../data/question.json'));

// Get all questions
exports.getAllQuestions = (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: "Questions retrieved successfully",
      data: questionsData
    });
  } catch (err) {
    console.error("Error retrieving questions:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
