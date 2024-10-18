const FilteredQuestion = require("../models/FilterQuestionTestData");
const { UserQuestionData } = require("../models/User");
const TestResult = require('../models/TestResult');
const jwt = require("jsonwebtoken");
const moment = require("moment");
const { trusted } = require("mongoose");

exports.examRecord = async (req, res) => {
    try {
        const { testId, userId } = req.body;

        // Fetch all questions related to the test
        const findAllTestQuestion = await FilteredQuestion.find({ testId });
        console.log("findAllTestQuestion", findAllTestQuestion);

        // Fetch user question data and populate question details
        const findData = await UserQuestionData.find({ userId, testId })
            .populate('questionId');

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
        const token = req.headers.authorization.split(" ")[1];
        console.log("token", token)
        if (!token) {
            return res.status(401).json({
                message: "No token provided!",
                success: false,
            });
        }

        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        const userId = decoded.userId; 
        console.log("userid ", userId)

        // Get the start and end of the day in UTC
        const startOfDay = moment().startOf('day').toDate();
        const endOfDay = moment().endOf('day').toDate();

        // Fetch today's test results for the user
        const todayTests = await TestResult.find({
            userId: userId,
            createdAt: { $gte: startOfDay, $lte: endOfDay } // Filter by createdAt for today's tests
        });
        console.log("todayTests", todayTests)

        if (todayTests.length === 0) {
            return res.status(200).json({
                success: true,
                message: "No tests found for today.",
                data : []
            });
        }

        // Check if there is a dailyChallenge test
        const dailyChallengeTest = todayTests.find(test => test.testType === "dailyChallenge");

        if (dailyChallengeTest) {
            return res.status(200).json({
                success: true,
                message: "Daily challenge has been completed.",
                status: "done",
                testResult: dailyChallengeTest
            });
        } else {
            return res.status(200).json({
                success: true,
                message: "Daily challenge not yet completed.",
                status: "not done"
            });
        }
    } catch (err) {
        console.log("Error:", err);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

