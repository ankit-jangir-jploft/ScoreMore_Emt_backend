const mongoose = require("mongoose");

// User Schema
const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      trim: true,
    },
    lastName: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    mobileNumber: {
      type: String,
    },
    otp: {
      type: String,
    },
    password: {
      type: String,
      required: true,
    },
    profilePicture: {
      type: String,
    },
    role: {
      type: String,
      default: 'user',
      enum: ['user', 'admin'],
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// User Question Data Schema
const userQuestionDataSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User' // Assuming you have a User model
    },
    questionId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Question' // Assuming you have a Question model
    },
    userSelectedOption : {
      type: String,
      required: true
    },
    isCorrect: {
        type: Boolean,
        required: true
    },
    isMarked: {
        type: Boolean,
        default: false
    },
    timeTaken: {
        type: String, // Store time in seconds or milliseconds
        required: true
    },
    level: {
        type: String,
        required: true
    },
    isUsed: {
        type: Boolean,
        default: true
    },
    isOmitted: {
        type: Boolean,
        default: false
    },
    testId : {
      type: String,
      required: true
    }
}, {
    timestamps: true // Automatically add createdAt and updatedAt fields
});

// Exporting both models
const User = mongoose.model("User", userSchema);
const UserQuestionData = mongoose.model('UserQuestionData', userQuestionDataSchema);

module.exports = { User, UserQuestionData };
