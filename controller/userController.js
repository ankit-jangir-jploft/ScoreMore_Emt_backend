const { User, UserQuestionData, Subscription, UserRating } = require("../models/User");
const Question = require("../models/question");
const TestResult = require('../models/TestResult');
const bcrypt = require("bcrypt");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const nodeMailer = require("nodemailer");
const crypto = require("crypto");
const path = require('path');
const pdf = require('puppeteer');
const { default: mongoose } = require("mongoose");
const FilteredQuestion = require("../models/FilterQuestionTestData");
const UserStrike = require("../models/StrikeCount");
const ejs = require("ejs");
const moment = require("moment");
const fs = require('fs');
const Contact = require("../models/Contact");

// Adjust the paths as per your project structure
const templatePath = path.join(__dirname, '..', 'views', 'templates', 'transactionInvoice.ejs');
const pdfDirectory = path.join(__dirname, '..', 'public', 'pdfs');
const publicDirectory = path.join(__dirname, '..', 'public');


exports.signup = async (req, res) => {
  try {
    // console.log("req.body",req.body);
    const { firstName, lastName, email, password, confirmPassword, role = "user" } = req.body;
    // console.log("fullname, email, phoneNumber, password ", firstName, lastName, email, password, confirmPassword);

    // Check for required fields
    if (!email || !confirmPassword || !password) {
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

    // Check if user already exists
    const user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({
        message: "User already exists with this email!",
        success: false,
      });
    }

    //cover password into hash
    const hashPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      firstName,
      lastName,
      email,
      password: hashPassword,
      confirmPassword: hashPassword,
      role,
    });

    const mailOptions = {
      from: process.env.MAIL_ID,
      to: email,
      subject: "Email Verification",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Hello ${firstName},</h2>
          <p>Thank you for signing up! To verify your email, click the button below:</p>
          <a href="${process.env.LOCAL_URL}/api/v1/user/verify-email?token=${newUser._id}" 
             style="background-color: #4CAF50; color: white; padding: 15px 20px; 
                    text-align: center; text-decoration: none; display: inline-block; 
                    border-radius: 5px; font-size: 16px;">
             Verify Email
          </a>
          <p>If the button does not work, you can copy and paste the following link into your browser:</p>
          <p><a href="${process.env.LOCAL_URL}/api/v1/user/verify-email?token=${newUser._id}">${process.env.LOCAL_URL}/api/v1/user/verify-email?token=${newUser._id}</a></p>
          <p>Thank you!</p>
        </div>
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
      message: "otp send on your ragistered mail id",
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
      subject: "Your OTP Code",
      text: `Your OTP code is ${otp}. It is valid for 15 minutes.`,
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
// social login 

exports.socialLogin = async (req, res) => {
  try {
    const { email, socialId, firstName, lastName, registrationType } = req.body;

    // Check if user exists with the given email and socialId
    let user = await User.findOne({ email, socialId, isDeleted: false });
    console.log("user", user)

    // Check if the user is blocked
    if (user?.isBlocked) {
      return res.status(201).json({ status: 201, message: "User Blocked" });
    }
    console.log("it hitssss")

    // User found, generate a token
    if (user) {
      const tokenData = { userId: user._id };
      const token = jwt.sign(tokenData, process.env.SECRET_KEY);

      // Prepare user data to send in the response
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
        registrationType: user.registrationType,  // Optional, based on your needs
      };

      return res.status(200).json({
        status: 200,
        message: "Login Successfully",
        data: userResponse,
        token: token,
        LastStep: user.CompleteSteps,  // Additional user-related data
      });
    } else {
      
    // User not found, create a new one
    let newUser = new User({
      email,
      socialId,
      firstName,
      lastName,
      registrationType,
    });

    // Save new user to the database
    await newUser.save();

    // Generate token for the new user
    const tokenData = { userId: newUser._id };  // Use newUser._id instead of user._id
    const token = jwt.sign(tokenData, process.env.SECRET_KEY);

    // Prepare user data to send in the response
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
      data: newUserResponse,
      token: token,
    });
    }


  } catch (error) {
    console.error("Error in social login:", error);
    return res.status(500).json({
      message: "Internal server error",
      success: false,
    });
  }
};




//forgot password


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

    // console.log("req.otp", otp, newPassword,email )

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

exports.updateUserStatus = async (req, res) => {
  try {
    const { _id } = req.user; // Assuming user ID is available from authentication middleware
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




// exports.myProfile = async (req, res) => {
//   try {
//     // Extract token from the Authorization header
//     const token = req.headers.authorization?.split(" ")[1];
//     console.log("Token in myProfile:", token);

//     if (!token) {
//       return res.status(401).json({
//         message: "No token provided!",
//         success: false,
//       });
//     }

//     // Verify the token
//     const decoded = jwt.verify(token, process.env.SECRET_KEY);
//     const userId = decoded.userId; // Assuming userId is stored in the token

//     // Log the user ID
//     console.log("Decoded User ID:", userId);

//     // Extract filters from req.body
//     const { dateRange, testType, newTestResult } = req.body; // Assuming newTestResult is passed in the request body
//     console.log("DateRange:", dateRange, "TestType:", testType);

//     // Find the user profile without aggregation
//     const user = await User.findById(userId).select('-password -otp -otpExpiration');
//     if (!user) {
//       return res.status(404).json({
//         message: "User not found",
//         success: false,
//       });
//     }

//     // Find the user's test results
//     let testResults = await TestResult.find({ userId: userId }).lean();
//     console.log("Initial Test Results:", testResults); // Log initial test results

//     // Prepend the new test result to the testResults array if it exists
//     if (newTestResult) {
//       // Assuming newTestResult has the same structure as a TestResult
//       testResults = [newTestResult, ...testResults];
//       console.log("Test Results after adding new test at the beginning:", testResults);
//     }

//     // Filter test results by date range if provided
//     if (dateRange?.from && dateRange?.to) {
//       const startDate = moment(dateRange.from).startOf('day').toDate();
//       const endDate = moment(dateRange.to).endOf('day').toDate(); // Covers the entire day

//       console.log("Start Date:", startDate);
//       console.log("End Date:", endDate);

//       testResults = testResults.filter(result => {
//         const testDate = moment(result.date, 'YYYY-MM-DD').toDate(); // Convert 'date' string to Date object
//         const isInRange = moment(testDate).isBetween(startDate, endDate, null, '[]'); // Include both start and end dates
//         console.log(`Test Result ID: ${result._id}, Date: ${testDate}, In Range: ${isInRange}`);
//         return isInRange;
//       });

//       console.log("Filtered Test Results by Date Range:", testResults); // Log filtered test results
//     } else {
//       console.log("No date range provided; skipping date filtering.");
//     }

//     // Filter test results by test type if provided
//     if (Array.isArray(testType) && testType.length > 0) {
//       testResults = testResults.filter(result => testType.includes(result.testType));
//       console.log("Filtered Test Results by Test Type:", testResults); // Log filtered test results
//     } else {
//       console.log("No test type provided; skipping test type filtering.");
//     }

//     // Sort test results by createdAt in descending order
//     testResults.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
//     console.log("Sorted Test Results by createdAt:", testResults); // Log sorted test results

//     // Prepare the user profile response
//     const userProfile = {
//       firstName: user.firstName,
//       lastName: user.lastName,
//       email: user.email,
//       role: user.role,
//       isEmailVerified: user.isEmailVerified,
//       isActive: user.isActive,
//       createdAt: user.createdAt,
//       updatedAt: user.updatedAt,
//       mobileNumber: user.mobileNumber,
//       profilePicture: user.profilePicture,
//       testResults: testResults,
//     };

//     return res.status(200).json({
//       success: true,
//       user: userProfile,
//     });

//   } catch (error) {
//     console.error("Error fetching user profile:", error);
//     return res.status(500).json({
//       message: "Internal server error",
//       success: false,
//     });
//   }
// };


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

// save  user Question data


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

// Function to update question percentages
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
    // console.log("User ID:", userId);

    // Check if the user has any question data
    const userQuestions = await UserQuestionData.find({ userId }).populate('questionId');
    // console.log("User Questions Found:", userQuestions);

    if (userQuestions.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No question data found for this user.",
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

    // console.log("Overall Stats Result:", overallStats);

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

    // console.log("Subject Insights Result:", subjectInsights);

    // Define the subjects you're interested in
    const subjects = ["medical", "airway", "cardiology", "trauma", "emsOperations"];

    // Format subject insights data to include all subjects
    const subjectDataFormatted = subjects.map(subject => {
      const insight = subjectInsights.find(i => i.subject === subject) || { correctAnswered: 0, totalAnswered: 0, percentage: 0 };
      // console.log(`Subject: ${subject}, Insight:`, insight); // Debugging log
      return {
        subject,
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

exports.getSubscriptionDetails = async (req, res) => {
  try {
    const { id } = req.params; // Get userId from route parameters

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
      return res.status(404).json({
        success: false,
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
    console.log("subscription", subscription)

    // Calculate remaining days
    const currentDate = new Date();
    const expiresAt = new Date(subscription.expiresAt);
    console.log("cfasfc", expiresAt, currentDate);
    const remainingDays = Math.max(Math.ceil((expiresAt - currentDate) / (1000 * 60 * 60 * 24)), 0); // Ensure no negative values
    console.log("reaming days", remainingDays);

    // Prepare the subscription details to return
    const subscriptionDetails = {
      subscriptionStatus: subscription.subscriptionStatus,
      paymentAmount: subscription.paymentAmount,
      currency: subscription.currency,
      subscriptionPlan: subscription.subscriptionPlan,
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

exports.getUserTransactionHistory = async (req, res) => {
  try {
    const { id } = req.params;
    console.log("userid", id)// Get userId from request params

    // Find all subscriptions associated with the user
    const transactions = await Subscription.find({ userId: id }).sort({ createdAt: -1 });
    console.log("transactions", transactions)

    if (!transactions || transactions.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No transaction history found for this user',
      });
    }

    // Optionally, you can format the response data
    const transactionHistory = transactions.map(transaction => ({
      transactionId: transaction.transactionId,
      paymentAmount: transaction.paymentAmount,
      currency: transaction.currency,
      paymentMethod: transaction.paymentMethod,
      subscriptionPlan: transaction.subscriptionPlan,
      planType: transaction.subscriptionPlan == "price_1QHNA1JpjKGzAGnrwEWMpjpi" ? "1 Month Plan" : transaction.subscriptionPlan == "price_1QFDhaJpjKGzAGnr7jSEIpaQ" ? "3 Month Plan" : transaction.subscriptionPlan == "price_1QDle3JpjKGzAGnrk747qdyG" ? "1 Year Plan" : "no plan",
      subscriptionStatus: transaction.subscriptionStatus,
      startedAt: transaction.startedAt.toISOString().slice(0, 10), // Format to 'yyyy-mm-dd'
      expiresAt: transaction.expiresAt ? transaction.expiresAt.toISOString().slice(0, 10) : null,
    }));

    res.status(200).json({
      success: true,
      message: "All Transction found Successfully !!",
      transactionHistory,
    });

  } catch (err) {
    console.error("Error fetching transaction history:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
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
    console.log("API hit");
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
        strikeCount: 1,
        lastSubmissionTime: lastTestTime,
        lastStrikeUpdateTime: currentTime,
      });
    } else {
      const lastSubmissionDiff = (currentTime - new Date(userStrike.lastSubmissionTime)) / 1000; // in seconds
      const lastStrikeDiff = (currentTime - new Date(userStrike.lastStrikeUpdateTime)) / 1000; // in seconds

      // Check if more than 24 hours have passed since the last strike update (24 hours = 86,400 seconds)
      if (lastStrikeDiff >= 86400) { // 86400 seconds = 24 hours
        if (lastSubmissionDiff <= 86400) { // Check if a test was submitted in the last 24 hours
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

    // Save the rating in the database
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
  console.log("req.params", req.params);
  const invoiceId = req.params.id;
  console.log("invoice id", invoiceId);

  try {
    // Search for the subscription using the transactionId
    const subscription = await Subscription.findOne({ transactionId: invoiceId });
    console.log("subscription", subscription);

    if (!subscription) {
      return res.status(404).json({ success: false, message: "Invoice not found." });
    }

    // Fetch user details based on userId from subscription
    const user = await User.findById(subscription.userId);
    console.log("user", user)
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
    console.log("invoice data", invoiceData);
    console.log("template path", templatePath);

    // Render the invoice using EJS
    ejs.renderFile(templatePath, invoiceData, async (err, html) => {
      if (err) {
        console.error('EJS render error:', err);
        return res.status(500).send('Error generating invoice');
      }

      console.log('Generated HTML:', html);

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
    dueDate: new Date(subscription.expiresAt).toLocaleDateString(), // Use subscription's expiration date for due date
    companyName: 'Scoremore',
    companyAddress: '1234 Street, City, Country',
    companyEmail: 'scoremore@example.com',
    companyPhone: '123-456-7890',
    clientName: `${clientDetails.firstName || 'Client'} ${clientDetails.lastName || 'Name'}`, // Combine first and last names
    clientAddress: clientDetails.address || '5678 Avenue, City, Country', // Adjust as necessary, assuming `address` exists in clientDetails
    clientEmail: clientDetails.email || 'client@example.com', // Use passed client details or default value
    paymentMethod: subscription.paymentMethod, // Use subscription's payment method
    items: [
      { description: `${subscription.subscriptionPlan}`, amount: totalAmount },
      // Add more items if necessary
    ],
    totalAmount: totalAmount,
    companyLogo: '/path/to/logo.png' // Change the path accordingly
  };
};

const generatePDFBuffer = async (html, invoiceId) => {
  const browser = await pdf.launch();
  const page = await browser.newPage();
  await page.setContent(html);

  // Define the path to save the PDF
  const pdfPath = path.join(pdfDirectory, `invoice-${invoiceId}.pdf`); // Save in public/pdfs

  // Generate and save the PDF
  await page.pdf({ path: pdfPath, format: 'A4' });

  await browser.close();
  return pdfPath; // Return the path for further use
};























async function sendEmail(mailOptions) {
  try {
    let transporter = nodeMailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.MAIL_ID, // Ensure this is set correctly
        pass: process.env.PASS, // Ensure this is set correctly
      },
      tls: {
        rejectUnauthorized: false, // Allow self-signed certificates
      },
    });
    console.log("yrnsporter", transporter)

    const info = await transporter.sendMail(mailOptions);
    console.log("mail info", info.response);
    return true;
  } catch (error) {
    console.log("errorin send mail", error);
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
