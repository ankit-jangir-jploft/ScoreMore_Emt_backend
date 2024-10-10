// models/FilteredQuestion.js

const mongoose = require('mongoose');

const FilteredQuestionSchema = new mongoose.Schema({
  testId: {
    type: String,
    required: true,
  },
  questions: [
    {
      _id: {
        type: String,
        required: true,
      },
      question: {
        type: String,
        required: true,
      },
      options: [
        {
          type: Object,
          required: true,
        },
      ],
      correctOption: {
        type: String,
        required: true,
      },
      subject: {
        type: String,
        required: true,
      },
      level: {
        type: String,
        required: true,
      },
      explanation: {
        type: String,
        required: true,
      },
      tags: [
        {
          type: String,
        },
      ],
      creatorId: {
        type: String,
        required: true,
      },
      isActive: {
        type: Boolean,
        default: true,
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
      updatedAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
});

const FilteredQuestion = mongoose.model('FilteredQuestion', FilteredQuestionSchema);

module.exports = FilteredQuestion;
