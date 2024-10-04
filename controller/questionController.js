const path = require('path');
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

/**
 * Filter questions based on given criteria.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
exports.filterQuestions = (req, res) => {
    console.log("req.body", req.body)
    const { subjects, level, numberOfQuestions } = req.body; 
    // Assume these are sent in the request body

    try {
        // Filter questions based on the criteria
        // console.log("questiondata",questionsData)
        let filteredQuestions = questionsData.filter((question) => {
            const matchesSubject = subjects.length === 0 || subjects.includes(question.subject);
            const matchesLevel = !level || question.level === level; // If no level provided, don't filter by level
            return matchesSubject && matchesLevel && question.isActive; // Only include active questions
        });

        // Shuffle the filtered questions and select the specified number
        filteredQuestions = shuffleArray(filteredQuestions);
        const result = filteredQuestions.slice(0, numberOfQuestions);

        res.status(200).json({
            success: true,
            message: "Filtered questions retrieved successfully",
            data: result,
        });
    } catch (err) {
        console.error("Error filtering questions:", err);
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

/**
 * Shuffle an array randomly.
 * @param {Array} array - The array to shuffle.
 * @returns {Array} - The shuffled array.
 */
const shuffleArray = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
};
