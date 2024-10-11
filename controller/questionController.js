const path = require('path');
const { UserQuestionData } = require("../models/User");
// const questionsData = require(path.join(__dirname, '../question/question.json'));

const Question = require('../models/question');

const { default: mongoose } = require('mongoose');
const TestResult = require('../models/TestResult');
const FilteredQuestion = require('../models/FilterQuestionTestData');



// Utility function to shuffle an array
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]]; // Swap elements
  }
  return array;
}

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

// exports.filterQuestions = async (req, res) => {
//   console.log("req.body", req.body);

//   // Destructure the request body to extract required parameters
//   const { userId, subjects = {}, level, numberOfQuestions, questionType = {}, cardType, timeLimit } = req.body;

//   try {
//     // Fetch previous question data for the user
//     const userPreviousQuestions = await UserQuestionData.find({ userId });
//     console.log("userPrevious Questions---->", userPreviousQuestions);

//     // Map user question data for easier lookup
//     const userQuestionMap = userPreviousQuestions.reduce((acc, question) => {
//       acc[question.questionId] = question; // Use questionId for lookup
//       return acc;
//     }, {});
//     console.log("userQuestionMap", userQuestionMap);

//     const question = await Question.find(); // Fetch the question data

//     // Format the data
//     const questionsData = question.map(question => {
//       // Convert options from Map to an array of objects
//       const formattedOptions = Array.from(question.options.entries()).map(([key, value]) => {
//         return { [key]: value }; // Create an object for each option
//       });

//       return {
//         _id: question._id,
//         question: question.question,
//         options: formattedOptions,
//         correctOption: question.correctOption,
//         subject: question.subject,
//         level: question.level,
//         explanation: question.explanation,
//         tags: question.tags,
//         creatorId: question.creatorId,
//         isActive: question.isActive,
//         createdAt: question.createdAt,
//         updatedAt: question.updatedAt,
//         __v: question.__v
//       };
//     });

//     console.log("Formatted question data:", questionsData);

//     // Filter questions based on subjects and levels
//     let filteredQuestions = questionsData.filter((question) => {
//       const subjectKeys = Object.keys(subjects).filter(key => subjects[key]);
//       const matchesSubject = subjectKeys.length === 0 || subjectKeys.includes(question.subject);
//       const matchesLevel = !level || question.level === level;
//       return matchesSubject && matchesLevel && question.isActive;
//     });

//     console.log("Filtered Questions:", JSON.stringify(filteredQuestions, null, 2));

//     // Further filter based on questionType (e.g., marked, incorrect, unused, etc.)
//     if (Object.keys(questionType).length > 0) {
//       filteredQuestions = filteredQuestions.filter((question) => {
//         const userQuestion = userQuestionMap[question._id]; // Change to question._id for correct lookup

//         const matchesMarked = questionType.marked ? userQuestion?.isMarked : true;
//         const matchesIncorrect = questionType.incorrect ? !userQuestion?.isCorrect : true;
//         const matchesUnused = questionType.unused ? !userQuestion?.isUsed : true; // Check if unused

//         return matchesMarked && matchesIncorrect && matchesUnused;
//       });
//     }

//     // Shuffle the filtered questions
//     filteredQuestions = shuffleArray(filteredQuestions);
//     console.log("Filtered Questions after shuffling:", filteredQuestions);

//     // Slice the array to match the requested number of questions, ensuring it doesn't exceed the length
//     const result = filteredQuestions.slice(0, Math.min(numberOfQuestions, filteredQuestions.length));
//     console.log("Resulting Questions:", result);

//     // Send the response back to the client, including the timeLimit
//     res.status(200).json({
//       success: true,
//       message: "Filtered questions retrieved successfully",
//       data: result,
//       timeLimit: timeLimit // Include timeLimit in the response
//     });
//   } catch (err) {
//     // Handle errors and send an appropriate response
//     console.error("Error filtering questions:", err);
//     res.status(500).json({
//       success: false,
//       message: "Internal server error",
//     });
//   }
// };



// Add Question API with validation checks

// Your existing filterQuestions function



exports.filterQuestions = async (req, res) => {
  console.log("req.body", req.body);

  // Destructure the request body to extract required parameters
  const { userId, subjects = {}, level, numberOfQuestions, questionType = {}, cardType, timeLimit, testId } = req.body;

  try {
    // Fetch previous question data for the user
    const userPreviousQuestions = await UserQuestionData.find({ userId });
    console.log("userPrevious Questions---->", userPreviousQuestions);

    // Map user question data for easier lookup
    const userQuestionMap = userPreviousQuestions.reduce((acc, question) => {
      acc[question.questionId] = question; // Use questionId for lookup
      return acc;
    }, {});
    console.log("userQuestionMap", userQuestionMap);

    const question = await Question.find(); // Fetch the question data

    // Format the data
    const questionsData = question.map(question => {
      // Convert options from Map to an array of objects
      const formattedOptions = Array.from(question.options.entries()).map(([key, value]) => {
        return { [key]: value }; // Create an object for each option
      });

      return {
        _id: question._id,
        question: question.question,
        options: formattedOptions,
        correctOption: question.correctOption,
        subject: question.subject,
        level: question.level,
        explanation: question.explanation,
        tags: question.tags,
        creatorId: question.creatorId,
        isActive: question.isActive,
        createdAt: question.createdAt,
        updatedAt: question.updatedAt,
        __v: question.__v
      };
    });

    console.log("Formatted question data:", questionsData);

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
        const userQuestion = userQuestionMap[question._id]; // Change to question._id for correct lookup

        const matchesMarked = questionType.marked ? userQuestion?.isMarked : true;
        const matchesIncorrect = questionType.incorrect ? !userQuestion?.isCorrect : true;
        const matchesUnused = questionType.unused ? !userQuestion?.isUsed : true; // Check if unused

        return matchesMarked && matchesIncorrect && matchesUnused;
      });
    }

    // Shuffle the filtered questions
    filteredQuestions = shuffleArray(filteredQuestions);
    console.log("Filtered Questions after shuffling:", filteredQuestions);

    // Slice the array to match the requested number of questions, ensuring it doesn't exceed the length
    const result = filteredQuestions.slice(0, Math.min(numberOfQuestions, filteredQuestions.length));
    console.log("Resulting Questions:", result);

    // Save filtered questions in the database
    const filteredQuestionEntry = new FilteredQuestion({
      testId, // Save the testId
      questions: result,
    });

    await filteredQuestionEntry.save(); // Save to the database

    // Send the response back to the client, including the timeLimit
    res.status(200).json({
      success: true,
      message: "Filtered questions retrieved successfully",
      data: result,
      timeLimit: timeLimit, // Include timeLimit in the response
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


exports.addQuestion = async (req, res) => {
  try {
    console.log("req.body", req.body);
    const {
      question,
      options,
      correctOption,
      subject,
      level,
      explanation,
      tags,
      creatorId,
    } = req.body;

    // Validation checks
    if (!question) {
      return res.status(400).json({
        success: false,
        message: 'Question is required',
      });
    }

    if (!options || typeof options !== 'object' || Object.keys(options).length !== 4) {
      return res.status(400).json({
        success: false,
        message: 'Options must contain 4 choices (a, b, c, d)',
      });
    }

    if (!correctOption || !['a', 'b', 'c', 'd'].includes(correctOption)) {
      return res.status(400).json({
        success: false,
        message: 'Correct option must be one of the following: a, b, c, or d',
      });
    }

    if (!subject) {
      return res.status(400).json({
        success: false,
        message: 'Subject is required',
      });
    }

    if (!level || !['easy', 'medium', 'hard'].includes(level)) {
      return res.status(400).json({
        success: false,
        message: 'Level must be one of the following: easy, medium, or hard',
      });
    }

    if (!explanation) {
      return res.status(400).json({
        success: false,
        message: 'Explanation is required',
      });
    }

    if (!creatorId) {
      return res.status(400).json({
        success: false,
        message: 'Creator ID is required',
      });
    }

    // Additional checks for optional fields
    if (tags && !Array.isArray(tags)) {
      return res.status(400).json({
        success: false,
        message: 'Tags must be an array',
      });
    }

    const existingQuestion = await Question.findOne({ question });
    if (existingQuestion) {
      return res.status(400).json({ success: false, message: "This question already exists" });
    }

    // Create the new question
    const newQuestion = new Question({
      question,
      options,
      correctOption,
      subject,
      level,
      explanation,
      tags: tags || [],
      creatorId,
      isActive: true,
    });

    // Save the question to the database
    const savedQuestion = await newQuestion.save();

    // Format options correctly
    const formattedOptions = Array.from(savedQuestion.options.entries()).map(([key, value]) => {
      return { [key]: value };
    });

    // Success response with the desired format
    const responseData = {
      id: savedQuestion._id.toString(), // Convert ObjectId to string
      question: savedQuestion.question,
      options: formattedOptions, // Use formatted options
      correctOption: savedQuestion.correctOption,
      subject: savedQuestion.subject,
      level: savedQuestion.level,
      explanation: savedQuestion.explanation,
      tags: savedQuestion.tags,
      creatorId: savedQuestion.creatorId.toString(), // Convert ObjectId to string
      isActive: savedQuestion.isActive,
      createdAt: savedQuestion.createdAt.toISOString(), // Ensure correct date format
      updatedAt: savedQuestion.updatedAt.toISOString(), // Ensure correct date format
    };

    res.status(201).json({
      success: success,
      message: 'Question added successfully!',
      data: responseData,
    });
  } catch (error) {
    // Error handling
    console.error("Error adding question:", error);
    res.status(500).json({
      success: false,
      message: 'Error adding question',
      error: error.message,
    });
  }
};



exports.updateQuestion = async (req, res) => {
  const { creatorId, question, options, correctOption, subject, level, explanation, tags, isActive } = req.body;

  // Create an object to hold the updates
  const updates = {};

  // Check which fields are present in the request body and add them to the updates object
  if (creatorId) updates.creatorId = creatorId;
  if (question) updates.question = question;
  if (correctOption) updates.correctOption = correctOption;
  if (subject) updates.subject = subject;
  if (level) updates.level = level;
  if (explanation) updates.explanation = explanation;
  if (tags) updates.tags = tags;
  if (typeof isActive === 'boolean') updates.isActive = isActive; // Check for boolean type

  try {
    // Fetch the existing question
    const existingQuestion = await Question.findById(req.params.id);

    if (!existingQuestion) {
      return res.status(404).json({ message: "Question not found" });
    }

    // Merge existing options with new options
    if (options) {
      // Keep existing options and add/update new options
      updates.options = {
        ...existingQuestion.options, // Keep existing options
        ...options // Add/update new options
      };
    }

    const updatedQuestion = await Question.findByIdAndUpdate(
      req.params.id, // The ID from the URL parameter
      updates, // Only the fields that were provided will be updated
      { new: true, runValidators: true } // Options to return the updated document and run validation
    );

    return res.status(200).json({
      success: true,
      message: "Question updated successfully!",
      updatedQuestion,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error updating question", error: error.message });
  }
};


exports.deleteQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const { creatorId } = req.body; // Assuming the creatorId is passed in the body for validation
    const question = await Question.findById(id);

    // Check if the question exists
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    // Check if the user is authorized to delete the question
    if (question.creatorId !== creatorId) {
      return res.status(403).json({ message: 'Unauthorized to delete this question' });
    }

    // Delete the question
    await question.remove();

    return res.status(200).json({ message: 'Question deleted successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
};





