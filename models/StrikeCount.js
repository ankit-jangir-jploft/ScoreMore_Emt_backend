const mongoose = require('mongoose');

const userStrikeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  strikeCount: {
    type: Number,
    default: 0,
  },
  lastSubmissionTime: {
    type: Date,
  },
  lastStrikeUpdateTime: {
    type: Date,
  },
}, { timestamps: true });

module.exports = mongoose.model('UserStrike', userStrikeSchema);
