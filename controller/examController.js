const FilteredQuestion = require("../models/FilterQuestionTestData");
const { UserQuestionData } = require("../models/User");

exports.examRecord = async (req, res) => {
    try {
        const { testId, userId, filter } = req.body; // Extract the filter parameter

        // Fetch all questions related to the test
        const findAllTestQuestion = await FilteredQuestion.find({ testId });
        console.log("findAllTestQuestion", findAllTestQuestion);

        // Fetch user question data and populate question details
        const findData = await UserQuestionData.find({ userId, testId })
            .populate('questionId');

        if (!findAllTestQuestion || findAllTestQuestion.length === 0) {
            return res.status(404).json({
                success: false,
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

        // Merge both datasets and apply filtering based on 'filter' parameter
        const mergedData = findAllTestQuestion.map(testQuestion => {
            const filteredQuestions = testQuestion.questions.filter(question => {
                const userAnswer = userAnswersMap[question._id.toString()];

                // Apply filters based on the 'filter' parameter
                if (filter === 'marked') {
                    // Return only marked questions
                    return userAnswer && userAnswer.isMarked === true;
                } else if (filter === 'incorrect') {
                    // Return only incorrect questions
                    return userAnswer && userAnswer.isCorrect === false;
                } else if (filter === 'correct') {
                    // Return only correct questions
                    return userAnswer && userAnswer.isCorrect === true;
                }
                // For 'all' or any other case, return all questions
                return true;
            });

            // If no questions match the filter, skip this test entry
            if (filteredQuestions.length === 0) return null;

            // Map filtered questions to their details, along with user responses
            const questionDetails = filteredQuestions.map(question => {
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
        }).filter(Boolean); // Remove any null values

        console.log("Merged Data", mergedData);

        if (mergedData.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No exam records match the filter criteria"
            });
        }

        res.status(200).json({
            success: true,
            message: "Exam Record fetched Successfully!!",
            data: mergedData // Includes filtered data
        });

    } catch (err) {
        console.log("Error:", err);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};


