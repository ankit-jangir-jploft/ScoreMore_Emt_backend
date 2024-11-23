const FilteredQuestion = require("../models/FilterQuestionTestData");
const { UserQuestionData } = require("../models/User");
const Question = require("../models/question");
const TestResult = require('../models/TestResult');
const jwt = require("jsonwebtoken");
const moment = require("moment");
const { default: mongoose } = require("mongoose");
const { datacatalog_v1 } = require("googleapis");

exports.examRecord = async (req, res) => {
    try {
      console.log("req.body", req.body)
        const { testId, userId } = req.body;
        console.log("userId",typeof userId)

        // Fetch all questions related to the test
        const findAllTestQuestion = await FilteredQuestion.find({ testId });
        // console.log("findAllTestQuestion", findAllTestQuestion);

       
        
        const findData = await UserQuestionData.find({ userId, testId })
            .populate('questionId');
            

            console.log("findData", findData)

        if (!findAllTestQuestion || findAllTestQuestion.length === 0) {
            return res.status(404).json({
                status: false,
                message: "No exam records found for the given testId"
            });
        }

        // Create a map to easily access user answers
        const userAnswersMap = {};
        findData.forEach(answer => {
            userAnswersMap[answer.questionId._id.toString()] = {
                userSelectedOption: answer.userSelectedOption,
                isCorrect: answer.isCorrect,
                timeTaken: answer.timeTaken,
                isMarked: answer.isMarked,
                level: answer.level,
                isUsed: answer.isUsed,
                isOmitted: answer.isOmitted
            };
        });

        // Merge both datasets
        const mergedData = findAllTestQuestion.map(testQuestion => {
            const questionDetails = testQuestion.questions.map(question => {
                const userAnswer = userAnswersMap[question._id.toString()];

                return {
                    questionId: question._id,
                    question: question.question,
                    options: question.options,
                    correctOption: question.correctOption,
                    subject: question.subject,
                    level: question.level,
                    explanation: question.explanation,
                    userSelectedOption: userAnswer ? userAnswer.userSelectedOption : null,
                    isCorrect: userAnswer ? userAnswer.isCorrect : null,
                    timeTaken: userAnswer ? userAnswer.timeTaken : null,
                    isMarked: userAnswer ? userAnswer.isMarked : null,
                    isUsed: userAnswer ? userAnswer.isUsed : false,
                    isOmitted: userAnswer ? userAnswer.isOmitted : false
                };
            });

            return {
                testId: testQuestion.testId,
                questions: questionDetails,
            };
        });

        console.log("Merged Data", mergedData);

        res.status(200).json({
            success: true,
            message: "Exam Record fetched Successfully!!",
            data: mergedData // Includes the merged data
        });

    } catch (err) {
        console.log("Error:", err);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

 // Adjust the path to your model if needed

 
 exports.todayDailyChallangeStatus = async (req, res) => {
   try {
     const token = req.headers.authorization?.split(' ')[1];
     if (!token) {
       return res.status(401).json({
         message: 'No token provided!',
         success: false,
       });
     }
 
     const decoded = jwt.verify(token, process.env.SECRET_KEY);
     const userId = decoded.userId;
 
     const startOfDay = moment().startOf('day').toDate();
     const endOfDay = moment().endOf('day').toDate();

     const userIdMatchCondition = mongoose.Types.ObjectId.isValid(userId)
     ? new mongoose.Types.ObjectId(userId) 
     : userId; 
     console.log("userIdMatchCondition", userIdMatchCondition)
 
     const todayDailyChallenge = await TestResult.findOne({
       userId ,
       testType: 'dailyChallenge',
       createdAt: { $gte: startOfDay, $lte: endOfDay },
     });

     if (!todayDailyChallenge) {
       return res.status(200).json({
         status: 'not done',
         success: true,
         message: 'No daily challenge test found for today.',
         data: [],
       });
     }
 
     // Step 2: Fetch user question data for the found testId
     const { testId } = todayDailyChallenge;
     const userQuestionData = await UserQuestionData.find({
       userId,
       testId,
     });

     console.log("userQuestionData", userQuestionData[0]);
     console.log("userQuestionData[0].userSelectedOption", userQuestionData[0].userSelectedOption)
 
     if (userQuestionData.length === 0) {
       return res.status(200).json({
         status: 'done',
         success: true,
         message: 'Daily challenge completed but no question data found.',
         testResult: todayDailyChallenge,
         questionData: [],
       });
     }
 
     // Step 3: Extract questionIds from userQuestionData
     const questionIds = userQuestionData.map((q) => q.questionId);
 
     // Step 4: Fetch detailed question data using aggregation
     const questionData = await Question.find({ _id: { $in: questionIds } })
     .lean()
     .select('_id question options correctOption subject level explanation tags creatorId isActive optionAPercentage optionBPercentage optionCPercentage optionDPercentage createdAt updatedAt');
   
   // Clean the options field if needed
   const formattedQuestionData = questionData.map((question) => {
     return {
       ...question,
       options: Object.keys(question.options).map((key) => ({
         [key]: question.options[key],
       })),
     };
   });
 

    
 
     // Final response with only one formatted question object
     return res.status(200).json({
       success: true,
       message: 'Daily challenge has been completed.',
       status: 'done',
       testResult: todayDailyChallenge,
       userSelectedOption : userQuestionData[0].userSelectedOption,
       questionData: formattedQuestionData,
     });
   } catch (err) {
     console.error('Error:', err);
     return res.status(500).json({
       success: false,
       message: 'Internal server error',
     });
   }
 };
 
 


exports.getPerOptionPercentage = async (req, res) => {
    try {
        const { questionId } = req.body;
        const findQuestion = await Question.findById(questionId);
        console.log("findQuestion", findQuestion);
        // Validate the required fields
        if (!questionId) {
            return res.status(400).json({
                success: false,
                message: "Missing required field: questionId",
            });
        }

        // Fetch all the records for the given questionId
        const userQuestionData = await UserQuestionData.find({ questionId });
        // console.log("userQuestionData", userQuestionData)

        // Check if there are any responses
        if (!userQuestionData || userQuestionData.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No responses found for the given questionId",
            });
        }

        // Initialize counters for each option
        let countA = 0, countB = 0, countC = 0, countD = 0;

        // Count how many users selected each option
        userQuestionData.forEach((data) => {
            // console.log("data---------", data)
            switch (data.userSelectedOption) {
                case "a":
                    countA++;
                    break;
                case "b":
                    countB++;
                    break;
                case "c":
                    countC++;
                    break;
                case "d":
                    countD++;
                    break;
                default:
                    break;
            }
        });

        // Calculate total responses
        const totalResponses = countA + countB + countC + countD;
        // console.log("count a, countb, count c, count d", countA, countB, countC, countD);

        // Calculate percentage for each option
        const percentageA = totalResponses ? (countA / totalResponses) * 100 : 0;
        const percentageB = totalResponses ? (countB / totalResponses) * 100 : 0;
        const percentageC = totalResponses ? (countC / totalResponses) * 100 : 0;
        const percentageD = totalResponses ? (countD / totalResponses) * 100 : 0;

        // Return the results
        res.status(200).json({
            success: true,
            data: {
                questionId,
                totalResponses,
                optionA: percentageA.toFixed(2) + "%",
                optionB: percentageB.toFixed(2) + "%",
                optionC: percentageC.toFixed(2) + "%",
                optionD: percentageD.toFixed(2) + "%",
            },
        });
    } catch (err) {
        console.error("Error:", err);
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};


