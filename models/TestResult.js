const mongoose = require("mongoose");

// Test Result Schema
const testResultSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId
      
      ,
      required: true,
      ref: 'User',
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
      type: Date,
      default: function () {
        return new Date(); 
      },
    },
  },
  {
    timestamps: true,
  }
);

testResultSchema.pre('save', function (next) {
  if (this.date) {
    // If date is already set, ensure it's properly formatted
    this.date = new Date(this.date.toISOString().split('T')[0]);
  } else {
    // Otherwise, set it to today's date
    this.date = new Date();
  }
  next();
});

// Adding indexes for performance optimization
testResultSchema.index({ userId: 1 });
testResultSchema.index({ createdAt: -1 });

// Exporting the model
const TestResult = mongoose.model("TestResult", testResultSchema);

module.exports = TestResult;
