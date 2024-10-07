const path = require('path');
const { UserQuestionData } = require("../models/User");
const questionsData = require(path.join(__dirname, '../question/question.json'));

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

exports.filterQuestions = async (req, res) => {
  console.log("req.body", req.body);
  
  // Destructure the request body to extract required parameters
  const { userId, subjects = {}, level, numberOfQuestions, questionType = {}, cardType } = req.body;
  
  try {
    // Fetch previous question data for the user
    const userPreviousQuestions = await UserQuestionData.find({ userId });
    console.log("userPrevious Questions---->", userPreviousQuestions);

    // Map user question data for easier lookup
    const userQuestionMap = userPreviousQuestions.reduce((acc, question) => {
      acc[question._id] = question;
      return acc;
    }, {});
    console.log("userQuestionMap", userQuestionMap);

    // Filter questions based on subjects and levels
    let filteredQuestions = questionsData.filter((question) => {
      const subjectKeys = Object.keys(subjects).filter(key => subjects[key]); 
      const matchesSubject = subjectKeys.length === 0 || subjectKeys.includes(question.subject);
      const matchesLevel = !level || question.level === level; 
      return matchesSubject && matchesLevel && question.isActive;
    });
    
    console.log("Filtered Questions:", JSON.stringify(filteredQuestions, null, 2));

    // Further filter based on questionType (e.g., marked, incorrect, unused, etc.)
    if (Object.keys(questionType).length > 0) {
      filteredQuestions = filteredQuestions.filter((question) => {
        const userQuestion = userQuestionMap[question.id];
        const matchesMarked = questionType.marked ? userQuestion?.isMarked : true;
        const matchesIncorrect = questionType.incorrect ? !userQuestion?.isCorrect : true;
        const matchesUnused = questionType.unused ? !userQuestion?.isUsed : true;

        return matchesMarked && matchesIncorrect && matchesUnused;
      });
    }

    // Shuffle the filtered questions
    filteredQuestions = shuffleArray(filteredQuestions); // No JSON.stringify here
    console.log("Filtered Questions after shuffling:", filteredQuestions);

    // Slice the array to match the requested number of questions, ensuring it doesn't exceed the length
    const result = filteredQuestions.slice(0, Math.min(numberOfQuestions, filteredQuestions.length));
    console.log("Resulting Questions:", result);

    // Send the response back to the client
    res.status(200).json({
      success: true,
      message: "Filtered questions retrieved successfully",
      data: result,
    });
  } catch (err) {
    // Handle errors and send an appropriate response
    console.error("Error filtering questions:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


// Utility function to shuffle an array
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]]; // Swap elements
  }
  return array;
}
