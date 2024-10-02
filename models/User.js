const mongoose = require("mongoose");
const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
    },
    lastName: {
      type: String,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    otp : {
      type: String
    },
    password: {
      type: String,
      required: true,
    },
    confirmPassword: {
      type: String,
      required: true,
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
  },
  {
    timestamps: true,
  }
);


module.exports = mongoose.model("User", userSchema); 