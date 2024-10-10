const mongoose = require("mongoose");

// Test Result Schema
const testResultSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User' 
    },
    testId: {
        type: String,
        required: true,
    },
    totalCorrect: {
        type: Number,
        required: true,
    },
    totalIncorrect: {
        type: Number,
        required: true,
    },
    totalNoOfQuestion: {
        type: Number,
        required: true,
    },
    totalSkippedQuestions: {
        type: Number,
        required: true,
    },
    testType: {
        type: String,
        required: true, 
    },
    totalAttemptedQuestions: {
        type: Number,
        required: true,
    },
    totalMarkedQuestions: {
        type: Number,
        required: true,
    },
    totalOmittedQuestions: {
        type: Number,
        required: true,
    },
    score: {
        type: Number,
        required: true,
    },
    date: {
        type: String, // Store date as YYYY-MM-DD
        default: function() {
            const date = new Date();
            return date.toISOString().split('T')[0]; // Format date as YYYY-MM-DD
        }
    }
}, {
    timestamps: true // Automatically add createdAt and updatedAt fields
});

// Pre-save middleware to format date before saving
testResultSchema.pre('save', function(next) {
    const date = new Date();
    this.date = date.toISOString().split('T')[0]; // Format date as YYYY-MM-DD
    next();
});

// Exporting the model
const TestResult = mongoose.model("TestResult", testResultSchema);

module.exports = TestResult;
