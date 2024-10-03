const mongoose = require("mongoose");

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
      type: String
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

module.exports = mongoose.model("User", userSchema);
