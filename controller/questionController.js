const path = require('path');
const { UserQuestionData, Feedback, User } = require("../models/User");
// const questionsData = require(path.join(__dirname, '../question/question.json'));

const Question = require('../models/question');
const csv = require('csvtojson');
const { default: mongoose } = require('mongoose');
const TestResult = require('../models/TestResult');
const FilteredQuestion = require('../models/FilterQuestionTestData');



// Utility function to shuffle an array
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

exports.filterQuestions = async (req, res) => {
  // console.log("req.body", req.body);

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
      // console.log("It hits readiness");

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
          optionAPercentage: q.optionAPercentage || 0,
          optionBPercentage: q.optionBPercentage || 0,
          optionCPercentage: q.optionCPercentage || 0,
          optionDPercentage: q.optionDPercentage || 0,
          createdAt: q.createdAt,
          updatedAt: q.updatedAt,
          __v: q.__v,
        };
      });

      // Return all questions if the number of requested questions is greater than availabl
      if (questionsData.length <= numberOfQuestions) {
        const filteredQuestionEntry = new FilteredQuestion({
          testId,
          questions: questionsData,
        });

        await filteredQuestionEntry.save();
        // console.log("filteredleth", questionsData.length)
        // console.log("Not enough questions, returning all available questions.");
        return res.status(200).json({
          success: true,
          message: "All available questions retrieved as the total number is less than or equal to the requested amount",
          data: questionsData,
          timeLimit: timeLimit,
        });
      }

      // Subject distribution percentages for readiness test
      // Subject distribution percentages for readiness test
      const subjectDistribution = {
        airway: { min: 18, max: 22 },
        cardiology: { min: 20, max: 26 },
        trauma: { min: 15, max: 20 },
        medical: { min: 27, max: 32 },
        emsOperations: { min: 10, max: 15 },
      };

      // Shuffle function


      // Calculate subject questions count based on percentages
      const subjectQuestionsCount = {};
      let totalQuestionsAssigned = 0;

      // First pass: Assign minimum percentage of questions to each subject
      Object.keys(subjectDistribution).forEach((subject) => {
        const minPercentage = subjectDistribution[subject].min / 100;
        const questionsForSubject = Math.floor(minPercentage * numberOfQuestions);
        subjectQuestionsCount[subject] = questionsForSubject;
        totalQuestionsAssigned += questionsForSubject;
      });

      // Second pass: Distribute remaining questions within the range up to max percentage
      // console.log("totalQuestionsAssigned", totalQuestionsAssigned);
      let remainingQuestions = numberOfQuestions - totalQuestionsAssigned;

      // Shuffle the subjects for random distribution of remaining questions
      const shuffledSubjects = shuffleArray(Object.keys(subjectDistribution));

      // Distribute remaining questions randomly based on shuffled order
      shuffledSubjects.forEach((subject) => {
        if (remainingQuestions === 0) return;

        const maxPercentage = subjectDistribution[subject].max / 100;
        const maxQuestionsForSubject = Math.floor(maxPercentage * numberOfQuestions);
        const additionalQuestions = Math.min(
          remainingQuestions,
          maxQuestionsForSubject - subjectQuestionsCount[subject]
        );

        subjectQuestionsCount[subject] += additionalQuestions;
        remainingQuestions -= additionalQuestions;
      });

      // console.log("Subject Questions Distribution:", subjectQuestionsCount);


      const subjectKeys = Object.keys(subjectDistribution);

      // Function to calculate level distribution (easy, medium, hard)
      const difficultyDistribution = {
        easy: 34, // 30% easy
        medium: 33, // 50% medium
        hard: 33, // 20% hard
      };

      const calculateLevelQuestions = (totalSubjectQuestions) => {
        let easyCount = Math.floor((difficultyDistribution.easy / 100) * totalSubjectQuestions);
        let mediumCount = Math.floor((difficultyDistribution.medium / 100) * totalSubjectQuestions);
        let hardCount = Math.floor((difficultyDistribution.hard / 100) * totalSubjectQuestions);

        // Dynamically adjust based on any remaining questions
        let remaining = totalSubjectQuestions - (easyCount + mediumCount + hardCount);

        // Distribute the remaining questions proportionally
        while (remaining > 0) {
          if (easyCount < mediumCount && easyCount < hardCount) {
            easyCount += 1;
          } else if (mediumCount < hardCount) {
            mediumCount += 1;
          } else {
            hardCount += 1;
          }
          remaining--;
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
        // console.log(`Subject: ${subject}, Required Questions: ${requiredSubjectQuestions}`);

        if (subjectFilteredQuestions.length < requiredSubjectQuestions) {
          remainingQuestionsToRedistribute += requiredSubjectQuestions - subjectFilteredQuestions.length;
          // console.log(`Not enough questions for ${subject}, adjusting remaining questions for redistribution.`);
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
        // console.log(`Subject: ${subject}, Easy: ${easyQuestions.length}, Medium: ${mediumQuestions.length}, Hard: ${hardQuestions.length}`);

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
        // console.log("Redistributing remaining questions across other subjects.");
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

      // If still not enough questions, try to pick any active questions from the pool
      if (finalQuestions.length < numberOfQuestions) {
        const additionalQuestionsNeeded = numberOfQuestions - finalQuestions.length;
        const availableQuestions = questionsData.filter(
          (q) => q.isActive && !finalQuestions.includes(q)
        );

        const additionalQuestions = shuffleArray(availableQuestions).slice(0, additionalQuestionsNeeded);
        finalQuestions = [...finalQuestions, ...additionalQuestions];
      }

      // Shuffle final questions and ensure exact number of requested questions
      finalQuestions = shuffleArray(finalQuestions).slice(0, numberOfQuestions);
      // console.log("finalQuestions finalQuestions", finalQuestions)


      // Save filtered questions to the database
      const filteredQuestionEntry = new FilteredQuestion({
        testId,
        questions: finalQuestions,
      });

      await filteredQuestionEntry.save();
      // console.log("filteredleth", finalQuestions.length)

      // Send the response back to the client
      res.status(200).json({
        success: true,
        message: "Readiness test questions retrieved successfully",
        data: finalQuestions,
        timeLimit: timeLimit,
      });
    } 
    else {
      const userPreviousQuestions = await UserQuestionData.find({ userId });
      // console.log("userPrevious Questions---->", userPreviousQuestions);
    
      // Map user question data for easier lookup
      const userQuestionMap = userPreviousQuestions.reduce((acc, question) => {
        acc[question.questionId.toString()] = question; // Ensure we're using the questionId for lookup as a string
        return acc;
      }, {});
      // console.log("userQuestionMap", userQuestionMap);
    
      const question = await Question.find(); // Fetch the question data
    
      // Format the data
      const questionsData = question.map(question => {
        // Convert options from Map to an array of objects
        const formattedOptions = Array.from(question.options.entries()).map(([key, value]) => {
          return { [key]: value }; // Create an object for each option
        });
    
        return {
          _id: question._id.toString(), // Ensure _id is treated as a string
          question: question.question,
          options: formattedOptions,
          correctOption: question.correctOption,
          subject: question.subject,
          level: question.level,
          explanation: question.explanation,
          tags: question.tags,
          creatorId: question.creatorId,
          isActive: question.isActive,
          optionAPercentage: question.optionAPercentage || 0,
          optionBPercentage: question.optionBPercentage || 0,
          optionCPercentage: question.optionCPercentage || 0,
          optionDPercentage: question.optionDPercentage || 0,
          createdAt: question.createdAt,
          updatedAt: question.updatedAt,
          __v: question.__v
        };
      });
    
      // Filter questions based on subjects and levels
      let filteredQuestions = questionsData.filter((question) => {
        const subjectKeys = Object.keys(subjects).filter(key => subjects[key]);
        const matchesSubject = subjectKeys.length === 0 || subjectKeys.includes(question.subject);
        const matchesLevel = !level || question.level === level;
        return matchesSubject && matchesLevel && question.isActive;
      });
    
      // console.log("Filtered Questions after subject/level filter:", JSON.stringify(filteredQuestions, null, 2));
    
      // Create an array to store all matching questions
      let matchedQuestions = new Map(); // Use Map to ensure uniqueness by questionId
    
      // Further filter based on questionType (e.g., marked, incorrect, unused, etc.)
      if (Object.keys(questionType).length > 0) {
        // First filter for unused questions
        if (questionType.unused) {
          filteredQuestions.forEach((question) => {
            const userQuestion = userQuestionMap[question._id];
            if (!userQuestion || !userQuestion.isUsed) {
              matchedQuestions.set(question._id, question); // Add to map (ensures uniqueness)
            }
          });
        }
      
        // Then filter for incorrect questions
        if (questionType.incorrect) {
          filteredQuestions.forEach((question) => {
            const userQuestion = userQuestionMap[question._id];
            if (userQuestion && !userQuestion.isCorrect) {
              matchedQuestions.set(question._id, question); // Add to map (ensures uniqueness)
            }
          });
        }
      
        // Then filter for marked questions
        if (questionType.marked) {
          filteredQuestions.forEach((question) => {
            const userQuestion = userQuestionMap[question._id];
            if (userQuestion && userQuestion.isMarked) {
              matchedQuestions.set(question._id, question); // Add to map (ensures uniqueness)
            }
          });
        }
      } else {
        // Handle the case where questionType is an empty object
        // Add all questions to matchedQuestions
        filteredQuestions.forEach((question) => {
          matchedQuestions.set(question._id, question); // Add to map (ensures uniqueness)
        });
      }
      
      // Convert matchedQuestions map back to an array
      const finalFilteredQuestions = Array.from(matchedQuestions.values());
    
      // console.log("Filtered Questions after questionType filter:", JSON.stringify(finalFilteredQuestions, null, 2));
    
      // Shuffle the filtered questions
      const shuffledQuestions = shuffleArray(finalFilteredQuestions);
      // console.log("Filtered Questions after shuffling:======", shuffledQuestions);
    
      // Slice the array to match the requested number of questions, ensuring it doesn't exceed the length
      const result = shuffledQuestions.slice(0, Math.min(numberOfQuestions, shuffledQuestions.length));
      // console.log("Resulting Questions:", result);
    
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
    // console.log("req.body", req.body);
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

exports.addQuestionFromCsv = async (req, res) => {
  try {
    const { file } = req;

    // Check if a file was uploaded
    if (!file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const fileType = file.originalname.split('.').pop().toLowerCase(); // Get the file extension
    let questions = [];

    // Parse the file based on its type
    if (fileType === 'csv') {
      questions = await csv().fromString(file.buffer.toString());
    } else if (fileType === 'json') {
      try {
        questions = JSON.parse(file.buffer.toString());
      } catch (error) {
        return res.status(400).json({ success: false, message: 'Invalid JSON format' });
      }
    } else {
      return res.status(400).json({ success: false, message: 'Unsupported file format. Use CSV or JSON.' });
    }

    const errors = [];
    const validQuestions = [];

    questions.forEach((question, index) => {
      try {
        // Parse `options` field if it is a string
        const parsedOptions =
          typeof question.options === 'string' ? JSON.parse(question.options) : question.options;

        // Validation checks
        if (!question.question || question.question.trim() === '') {
          throw new Error('Question text is missing');
        }

        if (!parsedOptions || Object.keys(parsedOptions).length !== 4) {
          throw new Error('Options must have exactly 4 keys');
        }

        if (new Set(Object.values(parsedOptions)).size !== 4) {
          throw new Error('Options must be unique');
        }

        if (!['a', 'b', 'c', 'd'].includes(question.correctOption?.toLowerCase())) {
          throw new Error('Correct option must be one of: a, b, c, d');
        }

        // Parse `tags` into an array
        const tags = question.tags ? question.tags.split(',').map(tag => tag.trim()) : [];

        // Parse percentages
        const optionAPercentage = parseInt(question.optionAPercentage, 10) || 0;
        const optionBPercentage = parseInt(question.optionBPercentage, 10) || 0;
        const optionCPercentage = parseInt(question.optionCPercentage, 10) || 0;
        const optionDPercentage = parseInt(question.optionDPercentage, 10) || 0;

        // Prepare valid question object
        validQuestions.push({
          question: question.question.trim(),
          options: parsedOptions,
          correctOption: question.correctOption.toLowerCase(),
          subject: question.subject || 'general',
          level: question.level || 'easy',
          explanation: question.explanation || 'No explanation provided',
          tags,
          creatorId: question.creatorId || 'defaultCreatorId', // Replace with a default ID if needed
          isActive: question.isActive === undefined ? true : question.isActive === 'true',
          optionAPercentage,
          optionBPercentage,
          optionCPercentage,
          optionDPercentage,
        });
      } catch (err) {
        errors.push(`Row ${index + 1}: ${err.message}`);
      }
    });

    // Return validation errors if any
    if (errors.length) {
      return res.status(400).json({
        success: false,
        message: 'Some rows have validation errors',
        errors,
      });
    }

    // Insert valid questions into the database
    await Question.insertMany(validQuestions);

    return res.status(200).json({
      success: true,
      message: 'Questions uploaded successfully',
      data: validQuestions.length,
    });
  } catch (error) {
    console.error('Error in addQuestionFromCsv:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.submitQuestionFeedback = async (req, res) => {
  // console.log("req.bodysss", req.body);

  const { userId, questionId, feedbackText } = req.body;

  // Check if all required fields are provided
  if (!userId || !questionId || !feedbackText) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    // Retrieve the user from the database to get their email, full name, and userType
    // console.log("rhitss");
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Retrieve the question from the database to get its details
    // console.log("rhitssaa");
    const question = await Question.findById(questionId);
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    // console.log("question", question)

    // Create a new feedback document with additional user and question information
    const newFeedback = new Feedback({
      userId,
      questionId,
      feedbackText,
      email: user.email, 
      fullName: user.firstName ? user.firstName + " " + user.lastName : "",  
      userType: user.isGuest ? "guest" : user.role,  
      questionText: question.question,  // Save question text
      subject: question.subject,  // Save subject
      level: question.level,  // Save level
      explanation: question.explanation,  // Save explanation
      
    });

    // console.log("newFeed0", newFeedback);

    // Save the feedback document
    await newFeedback.save();

    // Send a success response
    res.status(200).json({
      success: true,
      message: 'Feedback submitted successfully',
      newFeedback,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error, please try again later' });
  }
};


exports.getAllQuestions = async (req, res) => {
  const { page = 1, limit = 10, subject } = req.query; // Extracting query parameters
  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
  };

  try {
    // Build the filter object
    const filter = { isActive: true };
    if (subject) {
      filter.subject = subject; // Add subject filtering if provided
    }

    // Fetch questions sorted by the creation date in descending order
    const questions = await Question.find(filter)
      .sort({ createdAt: -1 }) // Sort by createdAt field in descending order
      .limit(options.limit)
      .skip((options.page - 1) * options.limit); // Pagination logic

    const totalQuestions = await Question.countDocuments(filter); // Count total documents

    res.status(200).json({
      success: true,
      data: questions,
      pagination: {
        totalQuestions,
        totalPages: Math.ceil(totalQuestions / options.limit),
        currentPage: options.page,
      },
    });
  } catch (error) {
    console.error("Error fetching questions:", error);
    res.status(500).json({
      success: false,
      message: 'Error fetching questions',
      error: error.message,
    });
  }
};

exports.getQuestionById = async (req, res) => {
  try {
    // Extract question ID from the request parameters
    const { id } = req.params;

    // Find the question by ID
    const question = await Question.findById(id);

    // If question not found, return a 404 error
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    // Return the question details
    res.status(200).json({
      success: true,
      data: question,
    });
  } catch (error) {
    // Handle any errors that occur during the request
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

exports.updateQuestion = async (req, res) => {
  const { creatorId, question, options, correctOption, subject, level, explanation, tags, isActive } = req.body;

  const updates = {};
  if (creatorId) updates.creatorId = creatorId;
  if (question) updates.question = question;
  if (correctOption) updates.correctOption = correctOption;
  if (subject) updates.subject = subject;
  if (level) updates.level = level;
  if (explanation) updates.explanation = explanation;
  if (tags) updates.tags = tags;
  if (typeof isActive === 'boolean') updates.isActive = isActive;

  try {
    const existingQuestion = await Question.findById(req.params.id);

    if (!existingQuestion) {
      return res.status(404).json({ message: "Question not found" });
    }

    // Safely merge existing options with new options
    if (options) {
      updates.options = {
        ...existingQuestion.options.toObject(), // Convert to plain object to avoid metadata
        ...options // Merge with new options
      };
    }

    const updatedQuestion = await Question.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
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
    // if (question.creatorId !== creatorId) {
    //   return res.status(403).json({ message: 'Unauthorized to delete this question' });
    // }

    // Delete the question
    await Question.findByIdAndDelete(id);

    return res.status(200).json({ message: 'Question deleted successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
};







