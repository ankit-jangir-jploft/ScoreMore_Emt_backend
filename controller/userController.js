const Question = require("../models/question");
const bcrypt = require("bcrypt");
require("dotenv").config();
const sgMail = require('@sendgrid/mail');
const jwt = require("jsonwebtoken");
const nodeMailer = require("nodemailer");
const crypto = require("crypto");
const path = require('path');
const { default: mongoose, trusted } = require("mongoose");
const FilteredQuestion = require("../models/FilterQuestionTestData");
const UserStrike = require("../models/StrikeCount");
const ejs = require("ejs");
const moment = require("moment");
const fs = require('fs');
const schedule = require("node-schedule");
const Contact = require("../models/Contact");
const Reminder = require("../models/Reminder");
const { cleanupCompletedReminders } = require("../utils/CleanUpReminders");
const puppeteer = require('puppeteer');
const SubscriptionSchema = require("../models/StripeModels")
// Adjust the paths as per your project structure
const templatePath = path.join(__dirname, '..', 'views', 'templates', 'transactionInvoice.ejs');
const pdfDirectory = path.join(__dirname, '..', 'public', 'pdfs');
const publicDirectory = path.join(__dirname, '..', 'public');
const cron = require("node-cron");
const { User, UserQuestionData, Subscription, UserRating } = require("../models/User");
const TestResult = require('../models/TestResult');
const Subject = require("../models/Subject");

async function updateGuestReferences(oldUserId, newUserId) {
  // console.log("oldUserId", oldUserId)
  // console.log("newUserId", newUserId)
  try {
    // Update the `userId` in the `UserQuestionData` model
    await UserQuestionData.updateMany(
      { userId: oldUserId }, // Match old user ID
      { $set: { userId: newUserId } } // Set new user ID
    );



    // Update the `userId` in the `TestResult` model
    await TestResult.updateMany(
      { userId: oldUserId }, // Match old user ID
      { $set: { userId: newUserId } } // Set new user ID
    );

    // Update the `isGuest` field in the `User` model
    await User.updateOne(
      { _id: newUserId }, // Match the new user ID
      { $set: { isGuest: false } } // Mark the user as a regular user
    );

    // console.log("References updated successfully.");
  } catch (error) {
    console.error("Error updating guest references:", error);
    throw new Error("Failed to update guest references");
  }
}

exports.signup = async (req, res) => {
  try {
    const { firstName, lastName, email, password, confirmPassword, role = "user", guestId } = req.body;

    // Check for required fields
    if (!email || !password || !confirmPassword) {
      return res.status(400).json({
        message: "Email, password, and confirm password are required!",
        success: false,
      });
    }

    // Check if passwords match
    if (password !== confirmPassword) {
      return res.status(400).json({
        message: "Passwords do not match!",
        success: false,
      });
    }

    // Check if a user already exists with this email
    const existingUser = await User.findOne({ email });
    if (existingUser && !existingUser.isGuest) {
      return res.status(400).json({
        message: "User already exists with this email!",
        success: false,
      });
    }

    // Check if a guest user exists with the same guestId
    const guestUser = guestId ? await User.findById(guestId) : null;
    // console.log("guestUser", guestUser)

    // Hash the password
    const hashPassword = await bcrypt.hash(password, 10);

    let newUser;
    if (guestUser) {
      guestUser.firstName = firstName || guestUser.firstName;
      guestUser.lastName = lastName || guestUser.lastName;
      guestUser.email = email || guestUser.email;
      guestUser.password = hashPassword;
      guestUser.isGuest = false;
      guestUser.isActive = true;
      guestUser.role = role;
      guestUser.updatedAt = new Date();

      newUser = await guestUser.save();
      // console.log("newUser", newUser);
      await updateGuestReferences(guestUser._id, newUser._id);
      // console.log("newUser", newUser, guestUser);
    } else {
      newUser = await User.create({
        firstName,
        lastName,
        email,
        password: hashPassword,
        confirmPassword: hashPassword,
        role,
        isGuest: false,
        isActive: true,
      });
    }

    const mailOptions = {
      from: process.env.MAIL_ID,
      to: email,
      subject: "Welcome to your ScoreMore EMT Prep",
      html: `
        <div style="font-family: Arial, sans-serif; width: 800px; max-width: 800px; margin: 0 auto; border: 2px solid #08273f; border-radius: 10px; overflow: hidden;"> 
        
          <!-- Header -->
          <div style="background-color: #08273f; color: #ffffff; text-align: center; padding: 20px;">
            <h1 style="margin: 0; font-size: 24px;">Welcome to ScoreMore!</h1>
          </div>
          
          <!-- Body Content -->
          <div style="padding: 20px; line-height: 1.6;">
            <p>Dear ${firstName},</p>
            <p>Thank you for choosing <a href="https://scoremoreprep.com" target="_blank" style="color: #0785eb; text-decoration: none;">www.scoremoreprep.com</a> for your TestPrep.</p>
            <p>Click the button below to verify your email address and get started:</p>
            <a href="${process.env.LOCAL_URL}/api/v1/user/verify-email?token=${newUser._id}" 
              style="background-color: #4CAF50; color: white; padding: 15px 20px; 
                     text-align: center; text-decoration: none; display: inline-block; 
                     border-radius: 5px; font-size: 16px; margin: 10px 0;">
              Activate Account
            </a>
            <p>Or copy and paste the link given below in your browser:</p>
            <p>
              <a href="${process.env.LOCAL_URL}/api/v1/user/verify-email?token=${newUser._id}" 
                 style="color: #0785eb; text-decoration: none;">
                 ${process.env.LOCAL_URL}/api/v1/user/verify-email?token=${newUser._id}
              </a>
            </p>
            <p>Thank you,</p>
            <p>ScoreMore Team</p>
          </div>
          
          <!-- Footer -->
          <div style="background-color: #08273f; color: #ffffff; text-align: center; padding: 15px; line-height: 1.8;">
            <p style="margin: 0;">© 2024 ScoreMore LLC. All Rights Reserved.</p>
            <p style="margin: 0;">e-mail: <a href="mailto:scoremoreapp@gmail.com" style="color: #ffffff; text-decoration: none;">scoremoreapp@gmail.com</a> | Web: <a href="https://scoremoreprep.com" target="_blank" style="color: #ffffff; text-decoration: none;">https://scoremoreprep.com</a></p>
          </div>
          
        </div>
      
        <style>
          /* Mobile Styles */
          @media only screen and (max-width: 600px) {
            .email-container {
              width: 100% !important;
              padding: 10px;
            }
            h1 {
              font-size: 20px !important;
            }
            a {
              font-size: 14px !important;
              padding: 12px 18px !important;
            }
            .footer {
              font-size: 12px !important;
              padding: 10px !important;
            }
          }
        </style>
      `,
    };


    const emailSent = await sendEmail(mailOptions);
    if (!emailSent) {
      return res.status(500).json({
        message: "Failed to send verification email.",
        success: false,
      });
    }

    return res.status(201).json({
      message: "Sign up successful. Verification email sent.",
      success: true,
    });
  } catch (err) {
    console.log("Error in registration", err);
    return res.status(500).json({
      message: "Internal server error",
      success: false,
    });
  }
};

exports.verifyEmail = async (req, res) => {
  const { token } = req.query; // Assuming token is the user's _id or generated token

  try {
    const user = await User.findById(token);
    // console.log("user",user)
    if (!user) {
      return res.status(404).json({ message: "User not found.", success: false });
    }

    user.isEmailVerified = true;
    user.isActive = true;// Mark the user as verified
    await user.save();

    return res.redirect(`${process.env.VERIFY_REDIRECT_URL}/LoginMail`);

  } catch (error) {
    console.error("Error in email verification", error);
    return res.status(500).json({ message: "Internal server error", success: false });
  }
};

//  sign in with password and otp

exports.signInWithPassword = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required!",
        success: false,
      });
    }

    // Find the user by email
    let user = await User.findOne({ email });
    // console.log("user", user)
    if (!user) {
      return res.status(400).json({
        message: "Incorrect email or password!",
        success: false,
      });
    }

    // Check if password matches
    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      return res.status(400).json({
        message: "Incorrect email or password!",
        success: false,
      });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        message: "You are blocked by admin please contact support team !!",
        success: false,
      });
    }

    // Check if user is active and email is verified
    if (!user.isActive || !user.isEmailVerified) {
      return res.status(403).json({
        message: "Account is inactive or email not verified.",
        success: false,
      });
    };

    // Generate JWT token
    const tokenData = { userId: user._id };
    const token = jwt.sign(tokenData, process.env.SECRET_KEY);

    const userResponse = {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      isBlocked: user.isBlocked,
      isEmailVerified: user.isEmailVerified,
      mobileNumber: user.mobileNumber,
    };

    // Send token in response body
    return res.status(200).json({
      message: `Welcome back ${userResponse.firstName}`,
      user: userResponse,
      token, // Send token in response
      success: true,
    });
  } catch (err) {
    console.log("Error in login", err);
    return res.status(500).json({
      message: "Internal server error",
      success: false,
    });
  }
};

exports.signInWithOTP = async (req, res) => {
  try {
    const { email } = req.body;

    // Validate input
    if (!email) {
      return res.status(400).json({
        message: "Email is required!",
        success: false,
      });
    }

    // Find the user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        message: "User not found!",
        success: false,
      });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        message: "You are blocked by admin please contact support team !!",
        success: false,
      });
    }

    // Check if user is active and email is verified
    if (!user.isActive) {
      return res.status(403).json({
        message: "Your account is inactive. Please contact support.",
        success: false,
      });
    }

    if (!user.isEmailVerified) {
      return res.status(403).json({
        message: "Your email address is not verified. Please verify your email.",
        success: false,
      });
    }

    // Generate OTP
    const otp = crypto.randomInt(100000, 999999).toString(); // 6-digit OTP
    const otpExpiration = Date.now() + 15 * 60 * 1000; // 15 minutes from now

    // console.log("Generated otpExpiration:", otpExpiration);

    // Store OTP and its expiration time in the user's document
    user.otp = otp;
    user.otpExpiration = otpExpiration;
    await user.save();

    // Prepare user data to be saved in a single cookie
    const userData = {
      userId: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      isActive: user.isActive,
      isEmailVerified: user.isEmailVerified,
    };

    // Store all user data in one cookie
    res.cookie("userData", JSON.stringify(userData), {
      // Set the cookie without an expiration (it will last until the browser session ends)
      httpOnly: true, // Mitigate XSS attacks
      sameSite: "strict", // Provide some CSRF protection
    });

    // Prepare email options
    const mailOptions = {
      from: process.env.MAIL_ID,
      to: email,
      subject: "ScoreMore Log in",
      html: `
        <div style="font-family: Arial, sans-serif; width: 800px; max-width: 800px; margin: 0 auto; border: 2px solid #08273f; border-radius: 10px; overflow: hidden;"> 
        
          <!-- Header -->
          <div style="background-color: #08273f; color: #ffffff; text-align: center; padding: 20px;">
            <h1 style="margin: 0; font-size: 24px;">ScoreMore Log in</h1>
          </div>
          
          <!-- Body Content -->
          <div style="padding: 20px; line-height: 1.6;">
            <p>Start your preparation now!</p>
            <p>From your mobile device or desktop, click the link below:</p>
            <a href="${process.env.VERIFY_REDIRECT_URL}/CheckMail" 
              style="background-color: #4CAF50; color: white; padding: 15px 20px; 
                     text-align: center; text-decoration: none; display: inline-block; 
                     border-radius: 5px; font-size: 16px; margin: 10px 0;">
              Sign in
            </a>
            <p>Or enter code: <strong>${otp}</strong></p>
            <p>This code is only valid for 15 minutes.</p>
            <p>Simply request a new code if it's been more than 15 minutes.</p>
          </div>
          
          <!-- Footer -->
          <div style="background-color: #08273f; color: #ffffff; text-align: center; padding: 15px; line-height: 1.8;">
            <p style="margin: 0;">© 2024 ScoreMore LLC. All Rights Reserved.</p>
            <p style="margin: 0;">e-mail: <a href="mailto:scoremoreapp@gmail.com" style="color: #ffffff; text-decoration: none;">scoremoreapp@gmail.com</a> | Web: <a href="https://scoremoreprep.com" target="_blank" style="color: #ffffff; text-decoration: none;">https://scoremoreprep.com</a></p>
          </div>
          
        </div>
      
        <style>
          /* Mobile Styles */
          @media only screen and (max-width: 600px) {
            .email-container {
              width: 100% !important;
              padding: 10px;
            }
            h1 {
              font-size: 20px !important;
            }
            a {
              font-size: 14px !important;
              padding: 12px 18px !important;
            }
            .footer {
              font-size: 12px !important;
              padding: 10px !important;
            }
          }
        </style>
      `,
    };

    // console.log("Mail options:", mailOptions);

    // Send OTP via email
    const emailSent = await sendEmail(mailOptions);
    if (!emailSent) {
      return res.status(500).json({
        message: "Failed to send OTP email.",
        success: false,
      });
    }

    return res.status(200).json({
      message: "OTP sent to your email!",
      success: true,
    });
  } catch (err) {
    console.log("Error in sending OTP", err);
    return res.status(500).json({
      message: "Internal server error",
      success: false,
    });
  }
};

exports.verifyOTP = async (req, res) => {
  try {
    const { otp, email } = req.body;

    if (!otp || !email) {
      return res.status(400).json({
        message: "OTP and email are required!",
        success: false,
      });
    }

    // Find the user by ID
    const user = await User.findOne({ email }); // Use userId from userData
    if (!user) {
      return res.status(404).json({
        message: "User not found!",
        success: false,
      });
    }


    if (user.isBlocked) {
      return res.status(403).json({
        message: "You are blocked by admin please contact support team !!",
        success: false,
      });
    }

    // Check if the OTP is valid
    if (user.otp !== otp) {
      return res.status(400).json({
        message: "Invalid OTP!",
        success: false,
      });
    }

    // Check if the OTP has expired
    // console.log("useerrrtrrr", user)
    // console.log("user.otpExpiration", user.otpExpiration);
    // console.log("Date.now", Date.now())
    if (Date.now() > user.otpExpiration) {
      return res.status(400).json({
        message: "OTP has expired!",
        success: false,
      });
    }

    // Clear the OTP fields
    user.otp = undefined; // Clear OTP
    user.otpExpiration = undefined; // Clear expiration
    await user.save();

    // Generate a JWT token for the user
    const tokenData = { userId: user._id };
    const token = await jwt.sign(tokenData, process.env.SECRET_KEY);

    const userResponse = {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      isEmailVerified: user.isEmailVerified,
      mobileNumber: user.mobileNumber,
    };

    // Respond with token in JSON response
    return res.status(200).json({
      message: `Welcome back ${user.firstName}`,
      user: userResponse,
      token, // Send token in response
      success: true,
    });
  } catch (err) {
    console.log("Error in verifying OTP", err);
    return res.status(500).json({
      message: "Internal server error",
      success: false,
    });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email, alternateEmail } = req.body;

    // Validate input
    if (!email) {
      return res.status(400).json({
        message: "Primary email is required!",
        success: false,
      });
    }

    // Find the user by primary email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        message: "User not found!",
        success: false,
      });
    }


    if (user.isBlocked) {
      return res.status(403).json({
        message: "You are blocked by admin please contact support team !!",
        success: false,
      });
    }

    // Determine the email to send OTP to
    const targetEmail = alternateEmail || email;

    // Check if alternate email is valid and different from primary (optional)
    if (alternateEmail && alternateEmail === email) {
      return res.status(400).json({
        message: "Alternate email should be different from the primary email.",
        success: false,
      });
    }

    // Generate OTP
    const otp = crypto.randomInt(100000, 999999).toString(); // 6-digit OTP
    const otpExpiration = Date.now() + 15 * 60 * 1000; // 15 minutes from now

    // Store OTP and its expiration time in the user's document
    user.otp = otp;
    user.otpExpiration = otpExpiration;
    await user.save();

    // Prepare email options
    const mailOptions = {
      from: process.env.MAIL_ID,
      to: targetEmail,
      subject: "Password Reset OTP",
      text: `Your OTP for password reset is ${otp}. It is valid for 15 minutes.`,
    };

    // Send OTP via email
    const emailSent = await sendEmail(mailOptions);
    if (!emailSent) {
      return res.status(500).json({
        message: "Failed to send OTP email.",
        success: false,
      });
    }

    return res.status(200).json({
      message: `OTP sent to ${targetEmail}!`,
      success: true,
    });
  } catch (err) {
    console.log("Error in sending OTP for password reset", err);
    return res.status(500).json({
      message: "Internal server error",
      success: false,
    });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    // console.log("req.body", req.body)
    const { otp, newPassword, email } = req.body;
    // Validate input
    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        message: "User ID, OTP, and new password are required!",
        success: false,
      });
    }
    // Find the user by userId
    const user = await User.findOne({ email });

    if (!user || user.otp !== otp) {
      return res.status(400).json({
        message: "Invalid OTP!",
        success: false,
      });
    }
    // Check if the OTP is expired
    if (Date.now() > user.otpExpiration) {
      return res.status(400).json({
        message: "OTP has expired!",
        success: false,
      });
    }
    // Hash the new password
    const hashPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashPassword; // Update the password
    user.otp = undefined; // Clear OTP
    user.otpExpiration = undefined; // Clear expiration
    await user.save();
    return res.status(200).json({
      message: "Password has been reset successfully!",
      success: true,
    });
  } catch (err) {
    console.log("Error in resetting password", err);
    return res.status(500).json({
      message: "Internal server error",
      success: false,
    });
  }
};

// social login 

exports.socialLogin = async (req, res) => {
  try {
    // console.log("re.bosd", req.body);
    const { email, socialId, firstName, lastName, registrationType } = req.body;

    // Check if the user exists with the given email
    let user = await User.findOne({ email });
    // console.log("user", user)

    // If user exists
    if (user) {
      // Check if the user is blocked
      if (user.isBlocked) {
        return res.status(403).json({ status: 403, message: "User Blocked" });
      }

      // Update `socialId` if necessary
      if (!user.socialId || user.socialId !== socialId) {
        user.socialId = socialId;
        await user.save(); // Save the updated `socialId`
      }

      // Generate a token
      const tokenData = { userId: user._id };
      const token = jwt.sign(tokenData, process.env.SECRET_KEY);

      // Prepare user response
      const userResponse = {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        isBlocked: user.isBlocked,
        isEmailVerified: user.isEmailVerified,
        mobileNumber: user.mobileNumber,
        registrationType: user.registrationType,
      };

      return res.status(200).json({
        success: true,
        message: "Login Successfully",
        user: userResponse,
        token: token,
        LastStep: user.CompleteSteps,
      });
    }

    // If no user exists, create a new user
    let newUser = new User({
      email,
      socialId,
      firstName,
      lastName,
      registrationType,
    });

    // Save the new user
    await newUser.save();

    // Generate a token for the new user
    const tokenData = { userId: newUser._id };
    const token = jwt.sign(tokenData, process.env.SECRET_KEY);

    // Prepare new user response
    const newUserResponse = {
      _id: newUser._id,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      email: newUser.email,
      role: newUser.role,
      isActive: newUser.isActive,
      isBlocked: newUser.isBlocked,
      isEmailVerified: newUser.isEmailVerified,
      mobileNumber: newUser.mobileNumber,
      registrationType: newUser.registrationType,
    };

    return res.status(201).json({
      success: true,
      message: "User created successfully",
      user: newUserResponse,
      token: token,
    });
  } catch (error) {
    console.error("Error in social login:", error);
    return res.status(500).json({
      message: "Internal server error",
      success: false,
    });
  }
};

exports.updateUserStatus = async (req, res) => {
  try {
    const { _id } = req.user;
    const { isActive, isVerified } = req.body;

    const user = await User.findById(_id);
    if (!user) {
      return res.status(404).json({
        message: 'User not found',
        success: false,
      });
    }

    // Update fields if provided
    if (isActive !== undefined) user.isActive = isActive;
    if (isVerified !== undefined) user.isVerified = isVerified;

    await user.save();

    return res.status(200).json({
      message: 'User status updated successfully',
      success: true,
      data: {
        isActive: user.isActive,
        isVerified: user.isVerified,
      },
    });
  } catch (err) {
    console.error('Error updating user status:', err);
    return res.status(500).json({
      message: 'Internal server error',
      success: false,
    });
  }
};
  
exports.myProfile = async (req, res) => {
  try {
    // Extract token from the Authorization header
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        message: "No token provided!",
        success: false,
      });
    }

    // Verify the token
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    const userId = decoded.userId; // Assuming userId is stored in the token

    // Extract filters and pagination parameters
    const { dateRange, testType, newTestResult } = req.body;
    const { page = 1, limit = 10 } = req.query;

    // Ensure `page` and `limit` are valid positive integers
    const parsedLimit = parseInt(limit, 10) || 10;
    const parsedPage = parseInt(page, 10) || 1;

    if (parsedLimit <= 0 || parsedPage <= 0) {
      return res.status(400).json({
        message: "Invalid pagination values",
        success: false,
      });
    }

    // Find user by ID without sensitive fields

    const user = await User.findById(userId).select('-password -otp -otpExpiration');
    if (!user) {
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }

    // Fetch user's test results
    const userIdMatchCondition = mongoose.Types.ObjectId.isValid(userId)
      ? new mongoose.Types.ObjectId(userId) // If valid ObjectId
      : userId;

    let testResults = await TestResult.find({ userId }).lean().sort({ createdAt: -1 });

    // If no test results are found, set testResults to an empty array
    if (!testResults || testResults.length === 0) {
      testResults = [];
    }

    // Prepend the new test result if provided
    if (newTestResult) {
      testResults = [newTestResult, ...testResults];
    }

    // Filter by date range if provided
    if (dateRange?.from && dateRange?.to) {
      const startDate = moment(dateRange.from).startOf('day').toDate();
      const endDate = moment(dateRange.to).endOf('day').toDate();

      testResults = testResults.filter(result => {
        const testDate = moment(result.date).toDate();
        return moment(testDate).isBetween(startDate, endDate, null, '[]');
      });
    }

    // Filter by test type if provided
    if (Array.isArray(testType) && testType.length > 0) {
      testResults = testResults.filter(result => testType.includes(result.testType));
    }

    // Calculate pagination
    const totalResults = testResults.length;
    const totalPages = Math.ceil(totalResults / parsedLimit);
    const offset = (parsedPage - 1) * parsedLimit;

    // Handle cases where the page is out of range
    // if (offset >= totalResults && totalResults > 0) {
    //   return res.status(200).json({
    //     message: "No results found for this page",
    //     success: false,
    //   });
    // }

    // Get the paginated results
    const paginatedResults = testResults.slice(offset, offset + parsedLimit);

    // Prepare user profile response
    const userProfile = {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      isActive: user.isActive,
      isBlocked: user.isBlocked,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      mobileNumber: user.mobileNumber,
      profilePicture: user.profilePicture,
      subscriptionStatus: user.subscriptionStatus,
      testResults: paginatedResults,  // The testResults will be an empty array if no tests are found
      pagination: {
        totalResults,
        totalPages,
        currentPage: parsedPage,
        resultsPerPage: parsedLimit,
      },
    };

    // Send the response
    return res.status(200).json({
      success: true,
      user: userProfile,
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return res.status(500).json({
      message: "Internal server error",
      success: false,
    });
  }
};

exports.editProfile = async (req, res) => {
  try {
    const { _id } = req.user;
    const { firstName, lastName, email, mobileNumber } = req.body;

    let profilePicture;

    if (req.file) {
      // Extract just the filename (not the full path)
      profilePicture = path.basename(req.file.path);
    }

    const user = await User.findById(_id);
    if (!user) {
      return res.status(404).json({ message: "User not found", success: false });
    }

    // Check if the email is being changed and verify its uniqueness
    if (email && email !== user.email) {
      const existingEmail = await User.findOne({ email });
      if (existingEmail) {
        return res.status(400).json({ message: "Email already in use by another account", success: false });
      }
    }

    // Update user details
    user.firstName = firstName || user.firstName;
    user.lastName = lastName || user.lastName;
    user.email = email || user.email;
    user.mobileNumber = mobileNumber || user.mobileNumber;
    user.profilePicture = profilePicture || user.profilePicture; // Update profile picture if new one is uploaded

    await user.save();

    return res.status(200).json({
      message: "Profile updated successfully",
      success: true,
      data: user,
    });
  } catch (err) {
    console.error("Error updating profile:", err);
    return res.status(500).json({ message: "Internal server error", success: false });
  }
};

exports.getUserDetail = async (req, res) => {
  const { id } = req.params; // Get userId from the request parameters

  try {
    // Find the user by userId
    const user = await User.findById(id);

    // Check if user exists
    if (!user) {
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }

    // Fetch count of tests based on testType for the user
    const testCounts = await TestResult.aggregate([
      { $match: { userId: user._id } }, // Match documents by userId
      {
        $group: {
          _id: "$testType", // Group by testType
          count: { $sum: 1 } // Count each occurrence
        }
      }
    ]);

    // Prepare user details excluding sensitive information
    const { password, confirmPassword, ...userDetails } = user._doc; // Exclude password and confirmPassword

    return res.status(200).json({
      message: "User details retrieved successfully",
      success: true,
      data: {
        userDetails,
        testCounts // Include the count of tests based on testType
      },
    });
  } catch (error) {
    console.error("Error fetching user details", error);
    return res.status(500).json({
      message: "Internal server error",
      success: false,
    });
  }
};

exports.userQuestionData = async (req, res) => {
  try {
    // console.log("req.body", req.body);
    const {
      userId,
      questionId,
      userSelectedOption = "",
      isCorrect,
      isMarked,
      timeTaken,
      level,
      isUsed,
      isOmitted,
      testId
    } = req.body;

    // Validation: Ensure all required fields are provided
    if (!userId || !questionId || !testId || typeof isCorrect === 'undefined' || !timeTaken || !level) {
      return res.status(400).json({ message: 'Missing required fields', success: false });
    }

    // Check if the question already exists in the database
    const existingQuestionData = await UserQuestionData.findOne({
      userId,
      testId,
      questionId
    });
    // console.log("existingQuestionData", existingQuestionData)

    if (existingQuestionData) {
      // If the question exists, update it
      existingQuestionData.isCorrect = isCorrect;
      existingQuestionData.isMarked = isMarked || false;
      existingQuestionData.timeTaken = timeTaken;
      existingQuestionData.userSelectedOption = userSelectedOption || " ";
      existingQuestionData.level = level;
      existingQuestionData.isUsed = isUsed || true;
      existingQuestionData.isOmitted = isOmitted || false;

      // Save the updated question data
      await existingQuestionData.save();
      // console.log("existing data question save", existingQuestionData);

      // Update question percentages
      await updateQuestionPercentages(questionId);

      return res.status(200).json({ success: true, message: 'Question data updated successfully', data: existingQuestionData });
    } else {
      // If the question does not exist, create a new UserQuestionData document
      const questionData = new UserQuestionData({
        userId,
        questionId,
        isCorrect,
        isMarked: isMarked || false, // Defaults to false if not provided
        timeTaken,
        userSelectedOption: userSelectedOption || " ",
        level,
        isUsed: isUsed || true, // Defaults to true if not provided
        isOmitted: isOmitted || false,
        testId
      });
      // console.log("question data", questionData);

      // Save the new data
      await questionData.save();

      // Update question percentages
      await updateQuestionPercentages(questionId);

      return res.status(201).json({ success: true, message: 'Question data saved successfully', data: questionData });
    }
  } catch (err) {
    console.error("Error saving question data:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

exports.findquestionMarkSatatus = async (req, res) => {
  const { userId, questionId } = req.body;

  if (!userId || !questionId) {
    return res.status(400).json({ message: 'userId and questionId are required' });
  }

  try {
    // Fetch the latest submission of the user for the given question
    const submission = await UserQuestionData.findOne({
      userId,
      questionId,
    }).sort({ createdAt: -1 }); // Assuming there's a submissionDate field to sort by latest submission
    //  console.log("submission", submission);
    if (submission) {
      return res.status(200).json({
        data: submission, // Return the isMarked field from the latest submission
      });
    } else {
      return res.status(404).json({ message: 'Submission not found for this question.' });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error while fetching submission.' });
  }
};

const updateQuestionPercentages = async (questionId) => {
  // Fetch all user question data related to this question
  const userQuestionData = await UserQuestionData.find({ questionId });

  // Initialize counters for each option
  let countA = 0, countB = 0, countC = 0, countD = 0;

  // Count how many users selected each option
  userQuestionData.forEach((data) => {
    switch (data.userSelectedOption) {
      case "a":
        countA++;
        break;
      case "b":
        countB++;
        break;
      case "c":
        countC++;
        break;
      case "d":
        countD++;
        break;
      default:
        break;
    }
  });

  // Calculate total responses
  const totalResponses = countA + countB + countC + countD;

  // Calculate percentage for each option and round to two decimal places
  const percentageA = totalResponses ? Math.round((countA / totalResponses) * 100 * 100) / 100 : 0;
  const percentageB = totalResponses ? Math.round((countB / totalResponses) * 100 * 100) / 100 : 0;
  const percentageC = totalResponses ? Math.round((countC / totalResponses) * 100 * 100) / 100 : 0;
  const percentageD = totalResponses ? Math.round((countD / totalResponses) * 100 * 100) / 100 : 0;

  // Update the question with the new percentages
  await Question.findByIdAndUpdate(
    questionId,
    {
      optionAPercentage: percentageA,
      optionBPercentage: percentageB,
      optionCPercentage: percentageC,
      optionDPercentage: percentageD,
    },
    { new: true } // Return the updated document
  );
};

exports.updateQuestionData = async (req, res) => {
  try {
    const { userId, questionId, testId, userSelectedOption, isCorrect, isMarked, timeTaken } = req.body;

    // Validation: Ensure essential identifiers are provided
    if (!userId || !questionId || !testId || !userSelectedOption) {
      return res.status(400).json({ message: 'Missing required fields: userId, questionId, and testId', success: false });
    }

    // Find the existing document to retrieve current values
    const existingData = await UserQuestionData.findOne({ userId, questionId, testId });

    if (!existingData) {
      return res.status(404).json({ message: 'Question data not found', success: false });
    }

    // Create an object to hold updates
    const updateData = {
      userSelectedOption: userSelectedOption !== undefined ? userSelectedOption : existingData.userSelectedOption,
      isCorrect: isCorrect !== undefined ? isCorrect : existingData.isCorrect,
      isMarked: isMarked !== undefined ? isMarked : existingData.isMarked,
      timeTaken: timeTaken !== undefined ? timeTaken : existingData.timeTaken,
      level: existingData.level,
      isUsed: existingData.isUsed, // Keep the existing value for isUsed
      isOmitted: existingData.isOmitted // Keep the existing value for isOmitted
    };

    // Update the document
    const updatedData = await UserQuestionData.findOneAndUpdate(
      { userId, questionId, testId }, // Find by userId, questionId, and testId
      updateData,
      { new: true } // Return the updated document
    );

    res.status(200).json({ success: true, message: 'Question data updated successfully', data: updatedData });
  } catch (err) {
    console.error("Error updating question data:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

exports.submitTestResults = async (req, res) => {
  try {
    // console.log("test req.body", req.body);
    const { userId, testId, testType } = req.body;

    // Fetch all questions related to the test
    const filteredQuestions = await FilteredQuestion.find({ testId });
    // console.log("filteredQuestions with testID ", filteredQuestions)
    if (!filteredQuestions || filteredQuestions.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No questions found for the given testId.",
      });
    }
    // console.log("Total filtered questions: ", filteredQuestions);

    // Fetch user's question data
    const userQuestionData = await UserQuestionData.find({ userId, testId });
    // console.log("User question data: ", userQuestionData);

    // Initialize counters
    let totalCorrect = 0;
    let totalIncorrect = 0;
    let totalMarked = 0;
    let totalOmitted = 0;
    let totalAttemptedQuestions = 0;
    let totalSkippedQuestions = 0;

    // Create a map to easily access user answers by question ID
    const userAnswersMap = {};
    userQuestionData.forEach((answer) => {
      userAnswersMap[answer.questionId.toString()] = answer;
    });

    // Calculate the results by comparing filtered questions and user answers
    filteredQuestions.forEach((testQuestion) => {
      testQuestion.questions.forEach((question) => {
        const userAnswer = userAnswersMap[question._id.toString()];
        // console.log("User Answer: ", userAnswer);

        if (userAnswer) {
          // If the question was attempted
          totalAttemptedQuestions++;

          // Check if the answer was correct or incorrect
          if (userAnswer.isCorrect) {
            totalCorrect++;
          } else {
            totalIncorrect++;
          }

          // Check if the question was marked
          if (userAnswer.isMarked) {
            totalMarked++;
          }

          // Check if the question was omitted
          if (userAnswer.isOmitted) {
            totalOmitted++;
          }
        }
      });
    });

    // Total number of questions
    const totalNoOfQuestion = filteredQuestions.reduce(
      (total, item) => total + item.questions.length,
      0
    );

    // Total skipped questions calculation
    totalSkippedQuestions = totalNoOfQuestion - totalAttemptedQuestions;

    // Check if totalNoOfQuestion is greater than zero to avoid division by zero
    if (totalNoOfQuestion <= 0) {
      return res.status(400).json({
        success: false,
        message: "Total number of questions must be greater than zero.",
      });
    }

    // Calculate score
    const score = (totalCorrect / totalNoOfQuestion) * 100;

    // Create a new test result object
    const newTestResult = new TestResult({
      userId,
      testId,
      totalCorrect,
      totalIncorrect,
      totalNoOfQuestion,
      totalSkippedQuestions,
      testType,
      totalAttemptedQuestions,
      totalMarkedQuestions: totalMarked,
      totalOmittedQuestions: totalOmitted,
      score,
    });
    // console.log("New test result: ", newTestResult);

    // Save the test result to the database
    await newTestResult.save();

    return res.status(201).json({
      success: true,
      message: "Test results submitted successfully.",
      testResult: newTestResult,
    });
  } catch (error) {
    console.error("Error retrieving exam records:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

exports.lastSubmitQuestion = async (req, res) => {
  try {
    const { userId, testId } = req.body;

    // Find the last submitted question by the user for the specified test
    const lastQuestionsss = await UserQuestionData.find({ userId, testId });
    // console.log("lastQuestionsss", lastQuestionsss)
    const lastQuestion = await UserQuestionData.find({ userId, testId })
      .sort({ createdAt: -1 }) // Sort by createdAt in descending order
      .exec(); // Use exec() to execute the query
    // console.log("Last submitted question:", lastQuestion);
    if (lastQuestion) {

      return res.status(200).json({
        success: true,
        data: lastQuestion, // Return the found question
      });
    } else {
      return res.status(404).json({
        success: false,
        message: "No question found for the provided userId and testId.",
      });
    }
  } catch (error) {
    console.error("Error retrieving last submitted question:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

exports.allExamRecord = async (req, res) => {
  try {
    // Extracting userId from the request body
    const { userId } = req.body;

    // Find user questions
    const userQuestions = await UserQuestionData.find({ userId }).populate('questionId');

    if (userQuestions.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No question data found for this user.",
        overallStats: { totalUniqueQuestions: 0, totalCorrectQuestions: 0, percentage: 0 },
        subjectInsights: [],
      });
    }

    // Aggregation pipeline to get overall statistics
    const overallStats = await UserQuestionData.aggregate([
      {
        $match: { userId: new mongoose.Types.ObjectId(userId) },
      },
      {
        $group: {
          _id: "$questionId", // Group by questionId to get unique questions
          isCorrect: { $last: "$isCorrect" }, // Get the last submission for correctness
        },
      },
      {
        $group: {
          _id: null, // Grouping all records together
          totalUniqueQuestions: { $sum: 1 }, // Count unique question IDs
          totalCorrectQuestions: {
            $sum: { $cond: [{ $eq: ["$isCorrect", true] }, 1, 0] },
          },
        },
      },
      {
        $project: {
          _id: 0,
          totalUniqueQuestions: 1,
          totalCorrectQuestions: 1,
          percentage: {
            $round: [
              { $multiply: [{ $divide: ["$totalCorrectQuestions", "$totalUniqueQuestions"] }, 100] }, 2
            ],
          },
        },
      },
    ]);

    // Aggregation pipeline for subject insights
    const subjectInsights = await UserQuestionData.aggregate([
      {
        $match: { userId: new mongoose.Types.ObjectId(userId) },
      },
      {
        $group: {
          _id: "$questionId", // Group by questionId to get unique questions
          isCorrect: { $last: "$isCorrect" }, // Get the last submission for correctness
        },
      },
      {
        $lookup: {
          from: 'questions', // The collection name that contains your questions
          localField: '_id',
          foreignField: '_id',
          as: 'questionDetails',
        },
      },
      {
        $unwind: '$questionDetails', // Unwind the joined array to flatten the results
      },
      {
        $group: {
          _id: { subject: '$questionDetails.subject', isCorrect: '$isCorrect' }, // Use questionDetails to access subject
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: '$_id.subject',
          correct: {
            $sum: { $cond: [{ $eq: ['$_id.isCorrect', true] }, '$count', 0] },
          },
          total: {
            $sum: '$count',
          },
        },
      },
      {
        $project: {
          subject: '$_id',
          correctAnswered: '$correct',
          totalAnswered: '$total',
          percentage: {
            $round: [
              { $multiply: [{ $divide: ['$correct', '$total'] }, 100] }, 2
            ],
          },
        },
      },
    ]);

    // Fetch all subjects from the Subject model
    const subjects = await Subject.find({}).select('name'); // Assuming "name" is the field for subject names

    // Format subject insights data to include all subjects dynamically
    const subjectDataFormatted = subjects.map(subject => {
      const insight = subjectInsights.find(i => i.subject === subject.name) || { correctAnswered: 0, totalAnswered: 0, percentage: 0 };
      return {
        subject: subject.name,
        correctAnswered: insight.correctAnswered,
        totalAnswered: insight.totalAnswered,
        percentage: insight.percentage.toFixed(2), // Ensure two decimal places
      };
    });

    // Formatting data for response
    return res.status(200).json({
      success: true,
      message: "Question data retrieved successfully",
      overallStats: overallStats[0] || { totalUniqueQuestions: 0, totalCorrectQuestions: 0, percentage: 0 },
      subjectInsights: subjectDataFormatted,
    });
  } catch (error) {
    console.error("Error retrieving exam records:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};


// subscription apis

exports.getSubscriptionDetails = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId (if using Mongoose)
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format",
      });
    }

    // Find the user in the database by ID
    const user = await User.findById(id);
    if (!user) {
      return res.status(200).json({
        success: true,
        message: "User not found",
      });
    }

    // Find the latest subscription of the user
    const subscription = await Subscription.findOne({ userId: id }).sort({ createdAt: -1 });
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "No subscription found for this user",
      });
    }
    // console.log("subscription", subscription)

    // Calculate remaining days
    const currentDate = new Date();
    const expiresAt = new Date(subscription.expiresAt);
    // console.log("cfasfc", expiresAt, currentDate);
    const remainingDays = Math.max(Math.ceil((expiresAt - currentDate) / (1000 * 60 * 60 * 24)), 0); // Ensure no negative values
    // console.log("reaming days", remainingDays);

    // Prepare the subscription details to return
    const subscriptionDetails = {
      subscriptionStatus: subscription.subscriptionStatus,
      paymentAmount: subscription.paymentAmount,
      currency: subscription.currency,
      subscriptionPlan: subscription.subscriptionPlan,
      subscriptionId: subscription.subscriptionId,
      productId : subscription.productId,
      priceId: subscription.priceId,
      startedAt: subscription.startedAt,
      expiresAt: subscription.expiresAt,
      remainingDays: remainingDays,
      paymentMethod: subscription.paymentMethod,
      transactionId: subscription.transactionId,
    };

    // Prepare client details (assuming they are part of the user or can be passed in)
    const clientDetails = {
      name: user.name,
      address: user.address, // Adjust based on how you store user address
      email: user.email,
    };

    // Generate invoice data
    const invoiceData = await getInvoiceData(subscription._id, subscription, clientDetails);

    return res.status(200).json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        subscriptionId: subscription._id,
      },
      subscription: subscriptionDetails,
      invoice: invoiceData // Return the generated invoice data
    });
  } catch (error) {
    console.error("Error retrieving subscription details:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

exports.cancelSubscription = async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  // console.log("Token in myProfile:", token);

  // Check for token presence
  if (!token) {
    return res.status(401).json({
      message: "No token provided!",
      success: false,
    });
  }

  // Verify the token
  const decoded = jwt.verify(token, process.env.SECRET_KEY);
  const userId = decoded.userId; // Assuming userId is stored in the token

  const { isSubscriptionCancel } = req.body;

  if (!isSubscriptionCancel) {
    return res.status(200).json({
      success: true,
      message: "Please send me proof !!",
    });
  }
  console.log("userId", userId)
  const subscription = await Subscription.findOne({ userId })
    .sort({ createdAt: -1 });

  console.log("subscription", subscription)
  if (!subscription) {
    return res.status(200).json({
      success: true,
      message: "subscription not found!!",
    });
  }
  // Check subscription status
  if (subscription.subscriptionStatus === "active") {
    // Update subscription status to 'pending' for cancellation review
    subscription.subscriptionStatus = "pending";
    subscription.updatedAt = new Date();

    await subscription.save();

    return res.status(200).json({
      success: true,
      message: "Your subscription cancellation is pending review.",
    });
  }

  return res.status(400).json({
    success: false,
    message: `Subscription is already in "${subscription.subscriptionStatus}" status.`,
  });

}

exports.getUserTransactionHistory = async (req, res) => {
  try {
    const { id } = req.params;
    console.log("userid", id);

    // Find all subscriptions associated with the user
    const transactions = await Subscription.find({ userId: id }).sort({ createdAt: -1 });
    console.log("transactions", transactions);

    if (!transactions || transactions.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No transaction history found for this user',
      });
    }

    // Fetch subscriptions for each transaction
    const subs = await Promise.all(
      transactions.map(async (transaction) => {
        console.log("transaction", transaction);
        console.log("transactions.subscriptionId", transaction.subscriptionId);

        try {
          const subscriptionSchema = await SubscriptionSchema.findOne({ stripeProductId: transaction.subscriptionId });
          if (!subscriptionSchema) {
            console.warn(`No subscription found for ID: ${transaction.subscriptionId}`);
            return null; // Return null if no matching subscription
          }
          return subscriptionSchema;
        } catch (error) {
          console.error(`Error fetching subscription for ID: ${transaction.subscriptionId}`, error);
          return null; // Handle and log errors gracefully
        }
      })
    );

    console.log("Subscriptions Schema", subs);

    // Separate active subscription
    const activeTransaction = transactions.find(
      (transaction) => transaction.subscriptionStatus === "active"
    );

    const activeHistory = activeTransaction
      ? {
        transactionId: activeTransaction.transactionId,
        paymentAmount: activeTransaction.paymentAmount,
        currency: activeTransaction.currency,
        title: subs[transactions.indexOf(activeTransaction)]
          ? subs[transactions.indexOf(activeTransaction)].title
          : "Unknown Title",
        subscriptionTime: subs[transactions.indexOf(activeTransaction)]
          ? subs[transactions.indexOf(activeTransaction)].subscriptionTime
          : null,
        paymentMethod: activeTransaction.paymentMethod,
        subscriptionPlan: activeTransaction.subscriptionPlan,
        planType: activeTransaction.subscriptionPlan
          ? activeTransaction.subscriptionPlan
          : "no plan",
        subscriptionStatus: activeTransaction.subscriptionStatus,
        startedAt: activeTransaction.startedAt
          .toISOString()
          .slice(0, 10), // Format to 'yyyy-mm-dd'
        expiresAt: activeTransaction.expiresAt,
      }
      : null;

    const transactionHistory = transactions.map((transaction, index) => {
      const subscriptionSchema = subs[index]; // Match the corresponding subscription
      return {
        transactionId: transaction.transactionId,
        paymentAmount: transaction.paymentAmount,
        currency: transaction.currency,
        title: subscriptionSchema ? subscriptionSchema.title : "Unknown Title",
        subscriptionTime: subscriptionSchema ? subscriptionSchema.subscriptionTime : null,
        paymentMethod: transaction.paymentMethod,
        subscriptionPlan: transaction.subscriptionPlan,
        planType: transaction.subscriptionPlan ? transaction.subscriptionPlan : "no plan",
        subscriptionStatus: transaction.subscriptionStatus,
        startedAt: transaction.startedAt.toISOString().slice(0, 10), // Format to 'yyyy-mm-dd'
        expiresAt: transaction.expiresAt,
      };
    });

    console.log("Active Transaction", activeHistory);
    console.log("Transaction History", transactionHistory);

    res.status(200).json({
      success: true,
      message: "Transaction history found successfully!",
      activeSubscription: activeHistory,
      transactions: transactionHistory, // Include activeTransaction here as well
    });
  } catch (err) {
    console.error("Error fetching transaction history:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

exports.createGuest = async (req, res) => {
  try {
    const { guestId } = req.body;

    // Validate if guestId is provided
    if (!guestId) {
      return res.status(400).json({
        success: false,
        message: 'Guest ID is required!',
      });
    }

    // Check if the guest user already exists
    console.log("guestId", guestId);
    let guestUser = await User.findOne({ guestId });
    console.log("guestUser", guestUser);

    if (!guestUser) {
      // If the guest user does not exist, create a new one
      guestUser = new User({
        guestId,
        isGuest: true,
        isBlocked: false,
        email: `guest_${guestId}@example.com`,  // Provide a unique email
        name: `Guest-${guestId}`,  // Optionally, set a name or other details
      });

      await guestUser.save();
    }

    // Generate a JWT token for the guest user
    const tokenData = { userId: guestUser._id };
    const token = jwt.sign(tokenData, "SCOREMORE");

    console.log("guestUser", guestUser);
    // Send the response with the user data and token
    res.status(201).json({
      success: true,
      user: guestUser,
      token,  // Include the JWT token in the response
    });
  } catch (error) {
    console.error('Error creating guest user:', error);
    res.status(500).json({ success: false, message: 'Error creating guest user!' });
  }
};


// exports.userDailyStreak = async (req, res) => {
//   try {
//     console.log("API hit");
//     const { userId } = req.body;

//     if (!userId) {
//       return res.status(400).json({
//         success: false,
//         message: 'User ID is required.',
//       });
//     }

//     // Get the current time
//     const currentTime = new Date();

//     // Fetch the user's strike record
//     let userStrike = await UserStrike.findOne({ userId });

//     // Fetch the most recent test submitted by the user
//     const latestTest = await TestResult.findOne({ userId }).sort({ createdAt: -1 });

//     if (!latestTest) {
//       // If no tests found, reset or initialize the user's streak record
//       if (!userStrike) {
//         userStrike = new UserStrike({ userId });
//       }
//       userStrike.strikeCount = 0;
//       userStrike.lastStrikeUpdateTime = null;
//       await userStrike.save();

//       return res.status(200).json({
//         success: true,
//         message: 'No test submissions found.',
//         streakCount: 0,
//       });
//     }

//     const lastTestTime = new Date(latestTest.createdAt);

//     if (!userStrike) {
//       // If no strike record exists, create one
//       userStrike = new UserStrike({
//         userId,
//         strikeCount: 1,
//         lastSubmissionTime: lastTestTime,
//         lastStrikeUpdateTime: currentTime,
//       });
//     } else {
//       const lastSubmissionDiff = (currentTime - new Date(userStrike.lastSubmissionTime)) / 1000; // in seconds
//       const lastStrikeDiff = (currentTime - new Date(userStrike.lastStrikeUpdateTime)) / 1000; // in seconds

//       // Check if more than one minute has passed since the last strike update
//       if (lastStrikeDiff >= 60) {
//         if (lastSubmissionDiff <= 60) {
//           // If a test was submitted in the last minute, increase the streak
//           userStrike.strikeCount += 1;
//           userStrike.lastStrikeUpdateTime = currentTime;
//         } else {
//           // If no test was submitted in the last one minute, reset the streak count
//           userStrike.strikeCount = 0;
//         }
//       }
//     }

//     // Update the last submission time
//     userStrike.lastSubmissionTime = lastTestTime;
//     await userStrike.save();

//     return res.status(200).json({
//       success: true,
//       message: 'Daily streak count updated successfully.',
//       streakCount: userStrike.strikeCount,
//     });

//   } catch (err) {
//     console.error("Error updating user streak count:", err);
//     return res.status(500).json({
//       success: false,
//       message: "Internal server error",
//     });
//   }
// };

exports.userDailyStreak = async (req, res) => {
  try {
    // console.log("API hit");
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required.',
      });
    }

    // Get the current time
    const currentTime = new Date();

    // Fetch the user's strike record
    let userStrike = await UserStrike.findOne({ userId });

    // Fetch the most recent test submitted by the user
    const latestTest = await TestResult.findOne({ userId }).sort({ createdAt: -1 });

    if (!latestTest) {
      // If no tests found, reset or initialize the user's streak record
      if (!userStrike) {
        userStrike = new UserStrike({ userId });
      }
      userStrike.strikeCount = 0;
      userStrike.lastStrikeUpdateTime = null;
      await userStrike.save();

      return res.status(200).json({
        success: true,
        message: 'No test submissions found.',
        streakCount: 0,
      });
    }

    const lastTestTime = new Date(latestTest.createdAt);

    if (!userStrike) {
      // If no strike record exists, create one
      userStrike = new UserStrike({
        userId,
        strikeCount: 0,
        lastSubmissionTime: lastTestTime,
        lastStrikeUpdateTime: currentTime,
      });
    } else {
      const lastSubmissionDiff = (currentTime - new Date(userStrike.lastSubmissionTime)) / 1000; // in seconds
      const lastStrikeDiff = (currentTime - new Date(userStrike.lastStrikeUpdateTime)) / 1000; // in seconds

      // Check if more than 24 hours have passed since the last strike update (24 hours = 86,400 seconds)
      if (lastStrikeDiff >= 60) { // 86400 seconds = 24 hours
        if (lastSubmissionDiff <= 60) { // Check if a test was submitted in the last 24 hours
          // If a test was submitted in the last 24 hours, increase the streak
          userStrike.strikeCount += 1;
          userStrike.lastStrikeUpdateTime = currentTime;
        } else {
          // If no test was submitted in the last 24 hours, reset the streak count
          userStrike.strikeCount = 0;
        }
      }
    }

    // Update the last submission time
    userStrike.lastSubmissionTime = lastTestTime;
    await userStrike.save();

    return res.status(200).json({
      success: true,
      message: 'Daily streak count updated successfully.',
      streakCount: userStrike.strikeCount,
    });

  } catch (err) {
    console.error("Error updating user streak count:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

exports.contactUs = async (req, res) => {
  const { name, email, message } = req.body;

  try {
    const newContact = new Contact({ name, email, message });
    await newContact.save();
    return res.status(201).json({ success: true, message: 'Thank you for contacting us. Our support team will get back to you shortly.' });
  } catch (error) {
    console.error('Error saving contact message:', error);
    return res.status(500).json({ success: false, message: 'Failed to save contact message.' });
  }
}

exports.rateUs = async (req, res) => {
  try {
    const { userId, rating, description } = req.body;

    // Validate input
    if (!rating || !userId) {
      return res.status(400).json({ message: 'Rating and user ID are required' });
    }
    const existingRating = await UserRating.findOne({ userId });

    if (existingRating) {
      // Update the existing rating
      existingRating.rating = rating;
      existingRating.description = description || existingRating.description;
      await existingRating.save();

      return res.status(200).json({ message: 'Thank you for updating your feedback!', data: existingRating });
    }

    // Create a new rating if none exists
    const newRating = new UserRating({
      userId,
      rating,
      description,
    });

    await newRating.save();

    res.status(201).json({ message: 'Thank you for your feedback!', data: newRating });
  } catch (error) {
    console.error('Error saving rating:', error);
    res.status(500).json({ message: 'Server error' });
  }
};


// user invoice 

if (!fs.existsSync(publicDirectory)) {
  fs.mkdirSync(publicDirectory, { recursive: true });
}

if (!fs.existsSync(pdfDirectory)) {
  fs.mkdirSync(pdfDirectory, { recursive: true });
}

exports.getInvoicetemplate = async (req, res) => {
  // console.log("req.params", req.params);
  const invoiceId = req.params.id;
  // console.log("invoice id", invoiceId);

  try {
    // Search for the subscription using the transactionId
    const subscription = await Subscription.findOne({ transactionId: invoiceId });
    // console.log("subscription", subscription);

    if (!subscription) {
      return res.status(404).json({ success: false, message: "Invoice not found." });
    }

    // Fetch user details based on userId from subscription
    const user = await User.findById(subscription.userId);
    // console.log("user", user)
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    // Prepare client details based on user schema
    const clientDetails = {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      mobileNumber: user.mobileNumber,
      profilePicture: user.profilePicture,
      // Add other user details as necessary
    };

    // Get the invoice data
    const invoiceData = await getInvoiceData(invoiceId, subscription, clientDetails);
    // console.log("invoice data", invoiceData);
    // console.log("template path", templatePath);

    // Render the invoice using EJS
    ejs.renderFile(templatePath, invoiceData, async (err, html) => {
      if (err) {
        console.error('EJS render error:', err);
        return res.status(500).send('Error generating invoice');
      }

      // console.log('Generated HTML:', html);

      try {
        const pdfPath = await generatePDFBuffer(html, invoiceId);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoiceId}.pdf`);
        res.sendFile(pdfPath);
      } catch (pdfErr) {
        console.error('PDF generation error:', pdfErr);
        return res.status(500).send('Error generating PDF');
      }
    });
  } catch (error) {
    console.error("Error generating invoice:", error);
    return res.status(500).send("Internal Server Error");
  }
};

const getInvoiceData = async (invoiceId, subscription, clientDetails) => {
  // Calculate total amount based on subscription payment amount
  const totalAmount = subscription.paymentAmount; // You can adjust this if needed

  return {
    invoiceNumber: invoiceId,
    createdAt: new Date().toLocaleDateString(),
    dueDate: new Date(subscription.expiresAt).toLocaleDateString(),
    companyName: 'Scoremore',
    companyAddress: '1234 Street, City, Country',
    companyEmail: 'scoremore@example.com',
    companyPhone: '123-456-7890',
    clientName: `${clientDetails.firstName || 'Client'} ${clientDetails.lastName || 'Name'}`,
    clientAddress: clientDetails.address || '5678 Avenue, City, Country',
    clientEmail: clientDetails.email || 'client@example.com',
    paymentMethod: subscription.paymentMethod,
    items: [
      { description: `${subscription.subscriptionPlan}`, amount: totalAmount },
      // Add more items if necessary
    ],
    totalAmount: totalAmount,
    companyLogo: `${process.env.LOCAL_URL}'/assets/profile_pictures/score-logo.svg`
  };
};

const generatePDFBuffer = async (html, invoiceId) => {
  try {
    // Launch Puppeteer in headless mode with required flags for server environments
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load' });

    // Ensure the PDF directory exists
    if (!fs.existsSync(pdfDirectory)) {
      fs.mkdirSync(pdfDirectory, { recursive: true });
    }

    // Define the path to save the PDF
    const pdfPath = path.join(pdfDirectory, `invoice-${invoiceId}.pdf`); // Save in public/pdfs

    // Generate and save the PDF
    await page.pdf({ path: pdfPath, format: 'A4' });

    await browser.close();

    console.log(`PDF successfully generated at ${pdfPath}`);
    return pdfPath; // Return the path for further use
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate PDF');
  }
};


// reminder

exports.sendReminder = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided!",
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.SECRET_KEY);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token!",
      });
    }

    const userId = decoded.userId;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found!",
      });
    }

    const email = user.email;
    const { message, time, allDay, dateTime } = req.body;

    if (!message || (allDay && !time) || (!allDay && !dateTime)) {
      return res.status(400).json({
        success: false,
        message: "Message, time (for daily), and dateTime (for one-time reminders) are required.",
      });
    }

    const timeMatch = time.match(/^(\d+):(\d+)\s?(AM|PM)$/i);
    if (!timeMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid time format. Expected HH:mm AM/PM.",
      });
    }

    let [_, hour, minute, meridian] = timeMatch;
    hour = parseInt(hour);
    minute = parseInt(minute);
    if (meridian.toUpperCase() === "PM" && hour !== 12) hour += 12;
    if (meridian.toUpperCase() === "AM" && hour === 12) hour = 0;

    const newReminder = new Reminder({
      email,
      message,
      time,
      allDay: allDay || false,
      dateTime: allDay ? null : new Date(dateTime),
    });

    await newReminder.save();

    console.log(`New reminder saved: ${JSON.stringify(newReminder)}`);

    if (allDay) {
      console.log(`Scheduling daily reminder for ${email} at ${hour}:${minute}`);
      
      // Cron job to send daily email at the same time
      const cronTime = `${minute} ${hour} * * *`; // minute hour * * *
      
      cron.schedule(cronTime, async () => {
        try {
          const reminderToSend = await Reminder.findOne({
            _id: newReminder._id,
            sentDate: null,
          });

          if (!reminderToSend) return;

          const updatedUser = await User.findById(userId);
          if (updatedUser.emailNotificationToggle) {
            console.log(`Sending daily reminder to ${email}`);
            await sendEmail({
              from: process.env.MAIL_ID,
              to: email,
              subject: "Daily Reminder",
              text: message,
            });
          }

          // Mark the reminder as sent every day
          await Reminder.findByIdAndUpdate(newReminder._id, { sentDate: new Date() });
          console.log(`Daily reminder sent to ${email}`);
        } catch (emailError) {
          console.error(`Error sending daily reminder to ${email}:`, emailError);
        }
      }, { timezone: "Asia/Kolkata" });

    } else {
      // One-time reminder logic remains unchanged
      const scheduledDate = new Date(dateTime);
      if (scheduledDate < new Date()) {
        return res.status(400).json({
          success: false,
          message: "Scheduled time cannot be in the past.",
        });
      }

      schedule.scheduleJob(scheduledDate, async () => {
        const updatedUser = await User.findById(userId);

        try {
          console.log(`Sending one-time reminder to ${email} at ${scheduledDate}`);
          if (updatedUser.emailNotificationToggle) {
            await sendEmail({
              from: process.env.MAIL_ID,
              to: email,
              subject: "One-time Reminder",
              text: message,
            });
          }

          await Reminder.findByIdAndUpdate(newReminder._id, { sentDate: new Date() });
          console.log(`One-time reminder sent to ${email}`);
        } catch (emailError) {
          console.error(`Error sending one-time reminder to ${email}:`, emailError);
        }
      });
    }

    return res.json({
      success: true,
      message: "Reminder email scheduled and saved in the database.",
      reminder: newReminder,
    });
  } catch (error) {
    console.error("Error scheduling reminder:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to schedule reminder. Please try again later.",
    });
  }
};

exports.getUserReminders = async (req, res) => {
  try {
    // Extract token from Authorization header
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided!",
      });
    }

    // Verify token and extract userId
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.SECRET_KEY);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token!",
      });
    }

    const userId = decoded.userId;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found!",
      });
    }

    await cleanupCompletedReminders();
    const reminders = await Reminder.find({ email: user.email });
    const currentDate = new Date();
    console.log("currentDate", currentDate)
    const pastReminders = reminders.filter(reminder => new Date(reminder.dateTime) < currentDate);

    console.log("pastReminders", pastReminders)
    // if (pastReminders.length > 0) {
    // Call the cleanup function to remove past reminders
    // }

    if (reminders.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No reminders found for this user.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "User reminders retrieved successfully.",
      reminders,
    });
  } catch (error) {
    console.error("Error fetching user reminders:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch reminders. Please try again later.",
    });
  }
};

exports.deleteReminder = async (req, res) => {
  try {
    const { id } = req.params;
    const reminder = await Reminder.findByIdAndDelete(id);

    if (!reminder) {
      return res.status(404).json({ success: false, message: 'Reminder not found' });
    }

    res.json({ success: true, message: 'Reminder deleted successfully' });
  } catch (error) {
    console.error('Error deleting reminder:', error);
    res.status(500).json({ success: false, message: 'An error occurred while deleting the reminder' });
  }
}

// notiffication setting 

exports.getNotificationSettings = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided!",
      });
    }

    // Verify the token and extract the userId
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.SECRET_KEY);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token!",
      });
    }

    const userId = decoded.userId;
    const user = await User.findById(userId, 'emailNotificationToggle');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    res.status(200).json({
      success: true,
      notificationSettings: {
        emailNotificationToggle: user.emailNotificationToggle,
      },
    });
  } catch (error) {
    console.error('Error fetching notification settings:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

exports.updateNotificationToggle = async (req, res) => {
  try {
    // Extract token from the Authorization header
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided!",
      });
    }

    // Verify the token and extract the userId
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.SECRET_KEY);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token!",
      });
    }

    const userId = decoded.userId;

    // Find the user in the database
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found!",
      });
    }

    // Toggle the emailNotificationToggle field
    user.emailNotificationToggle = !user.emailNotificationToggle;

    // Save the updated user
    await user.save();

    return res.json({
      success: true,
      message: "Notification preference updated successfully!",
      emailNotificationToggle: user.emailNotificationToggle,
    });
  } catch (error) {
    console.error("Error updating notification preference:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update notification preference. Please try again later.",
    });
  }
};


























async function sendEmail(mailOptions) {
  try {
    // Set SendGrid API key
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);


    const msg = {
      to: mailOptions.to,       // Recipient email address
      from: process.env.MAIL_ID, // Verified sender email address in SendGrid
      subject: mailOptions.subject, // Subject of the email
      text: mailOptions.text,    // Plain text content (optional)
      html: mailOptions.html,    // HTML content (optional)
    };

    // Send the email using SendGrid
    const response = await sgMail.send(msg);
    // console.log("Email sent successfully:", response);
    return true;
  } catch (error) {
    console.error("Error sending email:", error.response?.body || error.message);
    return false;
  }
}

exports.logout = async (req, res) => {
  try {
    return res
      .status(200)
      .cookie("token", "", {
        maxAge: 0,
        httpOnly: true,
        sameSite: "strict", // Helps prevent CSRF attacks
        path: "/", // Specify the path to ensure the cookie is cleared properly
      })
      .json({
        message: "Logout successfully!",
        success: true,
      });
  } catch (err) {
    console.log("Error in logout", err);
    return res.status(500).json({
      message: "Internal server error",
      success: false,
    });
  }
};



// socialLogin = async (req, res) => {
//   try {
//     const {
//       email,
//       socialId,
//       firstName,
//       lastName,
//       registrationType,
//       deviceToken,
//     } = req.body;

//     if (registrationType == "apple") {
//       let user = await User.findOne({ socialId });
//       // user blocked












//       if (user?.isBlocked) {
//         return res.status(201).json({ status: 201, message: "User Blocked" });
//       } else if (user?.isDeleted) {
//         return res.status(201).json({
//           status: 201,
//           message: "Your registration is incomplete please update profile",
//           LastStep: "1",
//           data: user,
//         });
//       } else {
//         if (user) {
//           // generate token
//           if (user.CompleteSteps == "23") {
//             let user = await User.findOneAndUpdate(
//               { socialId },
//               { deviceToken: deviceToken },
//               { new: true }
//             );

//             const token = generateToken(user._id, {
//               name: user.firstName,
//               _id: user._id,
//               email: user.email,
//               role: user.role,
//             });
//             console.log("useruseruser", token);

//             return res.status(200).json({
//               status: 200,
//               message: "Login Successfully",
//               data: user,
//               token: token,
//               LastStep: user.CompleteSteps,
//             });
//           } else {
//             console.log("ooooooooooooooooooooooooooooooo");
//             return res.status(201).json({
//               status: 201,
//               message:
//                 "Your registration is incomplete please update profile",
//               LastStep: user.CompleteSteps,
//               data: user,
//             });
//           }
//         }
//         // not found
//         if (!user) {
//           let user = await User.findOneAndUpdate(
//             { email, socialId },
//             { deviceToken: deviceToken },
//             { new: true }
//           );

//           let updateuser = new User({
//             email,
//             socialId,
//             firstName,
//             lastName,
//             registrationType,
//             LastStep: "0",
//           });

//           // Save new user
//           await updateuser.save();

//           const token = generateToken(updateuser._id, {
//             name: updateuser.firstName,
//             _id: updateuser._id,
//             email: updateuser.email,
//             role: updateuser.role,
//           });

//           return res.status(200).json({
//             status: 200,
//             message: "",
//             data: updateuser,
//             token: token,
//             CompleteSteps: "0",
//           });
//         }
//       }
//     } else {

//       let user = await User.findOne({ email, socialId, isDeleted: false });
//       // user blocked
//       console.log("sgggggggggggggggggggggggg", user);

//       if (user?.isBlocked) {
//         return res.status(201).json({ status: 201, message: "User Blocked" });
//       }
//       if (user) {
//         console.log("sssssssssssssssssssssssaaaaaaaaaaaaaaaaaaaaaaaaa", user);

//         // generate token
//         if (user.CompleteSteps == "23") {
//           let user = await User.findOneAndUpdate(
//             { email, socialId },
//             { deviceToken: deviceToken },
//             { new: true }
//           );
//           console.log("qqqqqqqqqqqqqqqqqqqqqqqqqqqqq", user);

//           const token = generateToken(user._id, {
//             name: user.firstName,
//             _id: user._id,
//             email: user.email,
//             role: user.role,
//           });
//           console.log("tokentokentokentoken", token, user.CompleteSteps);
//           return res.status(200).json({
//             status: 200,
//             message: "Login Successfully",
//             data: user,
//             token: token,
//             LastStep: user.CompleteSteps,
//           });
//         } else {
//           console.log("zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz", user);

//           return res.status(201).json({
//             status: 201,
//             message: "Your registration is incomplete please update profile",
//             LastStep: user.CompleteSteps,
//             data: user,
//           });
//         }
//       }
//       // not found
//       if (!user) {
//         let user = await User.findOneAndUpdate(
//           { email, socialId },
//           { deviceToken: deviceToken },
//           { new: true }
//         );

//         let updateuser = new User({
//           email,
//           socialId,
//           firstName,
//           lastName,
//           registrationType,
//           LastStep: "0",
//         });

//         // Save new user
//         await updateuser.save();

//         const token = generateToken(updateuser._id, {
//           name: updateuser.firstName,
//           _id: updateuser._id,
//           email: updateuser.email,
//           role: updateuser.role,
//         });

//         return res.status(200).json({
//           status: 200,
//           message: "",
//           data: updateuser,
//           token: token,
//           CompleteSteps: "0",
//         });
//       }
//     }
//   } catch (error) {
//     return buildResult(res, 201, {}, {}, error);
//   }
// };
