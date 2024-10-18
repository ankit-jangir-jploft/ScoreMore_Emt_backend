// models/Question.js ss
const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
  },
  options: {
    type: Map,
    of: String,
    required: true,
  },
  correctOption: {
    type: String,
    enum: ['a', 'b', 'c', 'd'],
    required: true,
  },
  subject: {
    type: String,
    required: true,
  },
  level: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    required: true,
  },
  explanation: {
    type: String,
    required: true,
  },
  tags: {
    type: [String],
    default: [],
  },
  creatorId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User', // Assuming you have a User model
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('Question', questionSchema);
