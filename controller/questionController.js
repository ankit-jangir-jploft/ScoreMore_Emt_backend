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



// exports.filterQuestions = async (req, res) => {
//   console.log("req.body", req.body);

//   // Destructure the request body to extract required parameters
//   const { userId, subjects = {}, level, numberOfQuestions, questionType = {}, cardType, timeLimit, testId } = req.body;

//   try {
//     // Fetch previous question data for the user

//     if(cardType === "readinessTest"){

//     }else{
//       const userPreviousQuestions = await UserQuestionData.find({ userId });
//       console.log("userPrevious Questions---->", userPreviousQuestions);

//       // Map user question data for easier lookup
//       const userQuestionMap = userPreviousQuestions.reduce((acc, question) => {
//         acc[question.questionId] = question; // Use questionId for lookup
//         return acc;
//       }, {});
//       console.log("userQuestionMap", userQuestionMap);

//       const question = await Question.find(); // Fetch the question data

//       // Format the data
//       const questionsData = question.map(question => {
//         // Convert options from Map to an array of objects
//         const formattedOptions = Array.from(question.options.entries()).map(([key, value]) => {
//           return { [key]: value }; // Create an object for each option
//         });

//         return {
//           _id: question._id,
//           question: question.question,
//           options: formattedOptions,
//           correctOption: question.correctOption,
//           subject: question.subject,
//           level: question.level,
//           explanation: question.explanation,
//           tags: question.tags,
//           creatorId: question.creatorId,
//           isActive: question.isActive,
//           createdAt: question.createdAt,
//           updatedAt: question.updatedAt,
//           __v: question.__v
//         };
//       });

//       console.log("Formatted question data:", questionsData);

//       // Filter questions based on subjects and levels
//       let filteredQuestions = questionsData.filter((question) => {
//         const subjectKeys = Object.keys(subjects).filter(key => subjects[key]);
//         const matchesSubject = subjectKeys.length === 0 || subjectKeys.includes(question.subject);
//         const matchesLevel = !level || question.level === level;
//         return matchesSubject && matchesLevel && question.isActive;
//       });

//       console.log("Filtered Questions:", JSON.stringify(filteredQuestions, null, 2));

//       // Further filter based on questionType (e.g., marked, incorrect, unused, etc.)
//       if (Object.keys(questionType).length > 0) {
//         filteredQuestions = filteredQuestions.filter((question) => {
//           const userQuestion = userQuestionMap[question._id]; // Change to question._id for correct lookup

//           const matchesMarked = questionType.marked ? userQuestion?.isMarked : true;
//           const matchesIncorrect = questionType.incorrect ? !userQuestion?.isCorrect : true;
//           const matchesUnused = questionType.unused ? !userQuestion?.isUsed : true; // Check if unused

//           return matchesMarked && matchesIncorrect && matchesUnused;
//         });
//       }

//       // Shuffle the filtered questions
//       filteredQuestions = shuffleArray(filteredQuestions);
//       console.log("Filtered Questions after shuffling:", filteredQuestions);

//       // Slice the array to match the requested number of questions, ensuring it doesn't exceed the length
//       const result = filteredQuestions.slice(0, Math.min(numberOfQuestions, filteredQuestions.length));
//       console.log("Resulting Questions:", result);

//       // Save filtered questions in the database
//       const filteredQuestionEntry = new FilteredQuestion({
//         testId, // Save the testId
//         questions: result,
//       });

//       await filteredQuestionEntry.save(); // Save to the database

//       // Send the response back to the client, including the timeLimit
//       res.status(200).json({
//         success: true,
//         message: "Filtered questions retrieved successfully",
//         data: result,
//         timeLimit: timeLimit, // Include timeLimit in the response
//       });
//     }

//   } catch (err) {
//     // Handle errors and send an appropriate response
//     console.error("Error filtering questions:", err);
//     res.status(500).json({
//       success: false,
//       message: "Internal server error",
//     });
//   }
// };

exports.filterQuestions = async (req, res) => {
  console.log("req.body", req.body);

  const {
    userId,
    subjects = {},
    level,
    numberOfQuestions,
    questionType = {},
    cardType,
    timeLimit,
    testId,
  } = req.body;

  try {
    if (cardType === "readinessTest") {
      console.log("It hits readiness");

      // Fetch all questions
      const question = await Question.find();

      const questionsData = question.map((q) => {
        const formattedOptions = Array.from(q.options.entries()).map(
          ([key, value]) => ({ [key]: value })
        );
        return {
          _id: q._id,
          question: q.question,
          options: formattedOptions,
          correctOption: q.correctOption,
          subject: q.subject,
          level: q.level,
          explanation: q.explanation,
          tags: q.tags,
          creatorId: q.creatorId,
          isActive: q.isActive,
          createdAt: q.createdAt,
          updatedAt: q.updatedAt,
          __v: q.__v,
        };
      });

      // Return all questions if number of questions requested is greater than available
      if (questionsData.length <= numberOfQuestions) {
        console.log("Not enough questions, returning all available questions.");
        return res.status(200).json({
          success: true,
          message:
            "All available questions retrieved as the total number is less than or equal to the requested amount",
          data: questionsData,
          timeLimit: timeLimit,
        });
      }

      // Subject distribution percentages for readiness test
      const subjectDistribution = {
        airway: { min: 18, max: 22 },
        cardiology: { min: 20, max: 24 },
        trauma: { min: 14, max: 18 },
        medical: { min: 27, max: 31 },
        emsOperations: { min: 10, max: 14 },
      };

      // Calculate subject questions count based on percentages
      const subjectQuestionsCount = {};
      Object.keys(subjectDistribution).forEach((subject) => {
        const min = subjectDistribution[subject].min;
        const max = subjectDistribution[subject].max;
        subjectQuestionsCount[subject] = Math.floor(
          Math.random() * (max - min + 1) + min
        );
      });

      const subjectKeys = Object.keys(subjectDistribution);

      // Function to calculate level distribution (easy, medium, hard)
      const difficultyDistribution = {
        easy: 34, // 30% easy
        medium: 33, // 50% medium
        hard: 33, // 20% hard
      };

      const calculateLevelQuestions = (totalSubjectQuestions) => {
        const easyCount = Math.floor((difficultyDistribution.easy / 100) * totalSubjectQuestions);
        const mediumCount = Math.floor((difficultyDistribution.medium / 100) * totalSubjectQuestions);
        const hardCount = Math.floor((difficultyDistribution.hard / 100) * totalSubjectQuestions);

        let remaining = totalSubjectQuestions - (easyCount + mediumCount + hardCount);

        // Distribute remaining questions to level with least questions
        if (remaining > 0) {
          if (easyCount <= mediumCount && easyCount <= hardCount) {
            return { easy: easyCount + remaining, medium: mediumCount, hard: hardCount };
          } else if (mediumCount <= easyCount && mediumCount <= hardCount) {
            return { easy: easyCount, medium: mediumCount + remaining, hard: hardCount };
          } else {
            return { easy: easyCount, medium: mediumCount, hard: hardCount + remaining };
          }
        }
        return { easy: easyCount, medium: mediumCount, hard: hardCount };
      };

      // Initialize final questions and handle subject-based filtering
      let finalQuestions = [];
      let remainingQuestionsToRedistribute = 0;

      for (const subject of subjectKeys) {
        const subjectFilteredQuestions = questionsData.filter(
          (q) => q.subject === subject && q.isActive
        );

        const requiredSubjectQuestions = subjectQuestionsCount[subject];
        console.log(`Subject: ${subject}, Required Questions: ${requiredSubjectQuestions}`);

        if (subjectFilteredQuestions.length < requiredSubjectQuestions) {
          remainingQuestionsToRedistribute += requiredSubjectQuestions - subjectFilteredQuestions.length;
          console.log(`Not enough questions for ${subject}, adjusting remaining questions for redistribution.`);
          finalQuestions = [...finalQuestions, ...subjectFilteredQuestions];
          continue; // Move to the next subject
        }

        const levelCount = calculateLevelQuestions(requiredSubjectQuestions);

        const easyQuestions = shuffleArray(
          subjectFilteredQuestions.filter((q) => q.level === "easy")
        ).slice(0, levelCount.easy);
        const mediumQuestions = shuffleArray(
          subjectFilteredQuestions.filter((q) => q.level === "medium")
        ).slice(0, levelCount.medium);
        const hardQuestions = shuffleArray(
          subjectFilteredQuestions.filter((q) => q.level === "hard")
        ).slice(0, levelCount.hard);

        const totalSelected = easyQuestions.length + mediumQuestions.length + hardQuestions.length;
        console.log(`Subject: ${subject}, Easy: ${easyQuestions.length}, Medium: ${mediumQuestions.length}, Hard: ${hardQuestions.length}`);

        // Adjust if total selected is less than required
        if (totalSelected < requiredSubjectQuestions) {
          const remainingQuestions = requiredSubjectQuestions - totalSelected;
          const additionalQuestions = shuffleArray(
            subjectFilteredQuestions.filter(
              (q) =>
                !easyQuestions.includes(q) &&
                !mediumQuestions.includes(q) &&
                !hardQuestions.includes(q)
            )
          ).slice(0, remainingQuestions);

          finalQuestions = [
            ...finalQuestions,
            ...easyQuestions,
            ...mediumQuestions,
            ...hardQuestions,
            ...additionalQuestions,
          ];
        } else {
          finalQuestions = [
            ...finalQuestions,
            ...easyQuestions,
            ...mediumQuestions,
            ...hardQuestions,
          ];
        }
      }

      // Redistribute remaining questions across other subjects
      if (remainingQuestionsToRedistribute > 0) {
        console.log("Redistributing remaining questions across other subjects.");
        for (const subject of subjectKeys) {
          if (remainingQuestionsToRedistribute === 0) break;

          const subjectFilteredQuestions = questionsData.filter(
            (q) => q.subject === subject && q.isActive && !finalQuestions.includes(q)
          );

          const additionalQuestions = shuffleArray(subjectFilteredQuestions).slice(0, remainingQuestionsToRedistribute);
          remainingQuestionsToRedistribute -= additionalQuestions.length;
          finalQuestions = [...finalQuestions, ...additionalQuestions];
        }
      }

      // Shuffle final questions and adjust the total number to the requested amount
      finalQuestions = shuffleArray(finalQuestions).slice(0, numberOfQuestions);

      // Save filtered questions to the database
      const filteredQuestionEntry = new FilteredQuestion({
        testId,
        questions: finalQuestions,
      });

      await filteredQuestionEntry.save();

      // Send the response back to the client
      res.status(200).json({
        success: true,
        message: "Readiness test questions retrieved successfully",
        data: finalQuestions,
        timeLimit: timeLimit,
      });
    } 
    else{
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
          }
      
  } catch (error) {
    console.error("Error filtering questions:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while filtering questions",
      error: error.message,
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
      success: true,
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





