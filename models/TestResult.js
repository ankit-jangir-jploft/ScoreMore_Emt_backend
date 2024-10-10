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
    totalNoOfQuestion:{
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
    score: {
        type: Number,
        required: true,
    },
    date: {
        type: Date,
        default: Date.now,
    }
}, {
    timestamps: true // Automatically add createdAt and updatedAt fields
});

// Exporting the model
const TestResult = mongoose.model("TestResult", testResultSchema);

module.exports = TestResult;
