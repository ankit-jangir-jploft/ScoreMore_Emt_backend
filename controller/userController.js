const {User, UserQuestionData} = require("../models/User");

const TestResult = require('../models/TestResult'); 
const bcrypt = require("bcrypt");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const nodeMailer = require("nodemailer");
const crypto = require("crypto");
const path = require('path');
const { default: mongoose } = require("mongoose");
const FilteredQuestion = require("../models/FilterQuestionTestData");

const moment = require("moment")


exports.signup = async (req, res) => {
  try {
    console.log(req.body);
    const { firstName, lastName, email, password, confirmPassword, role = "user" } = req.body;
    console.log("fullname, email, phoneNumber, password ", firstName, lastName, email, password, confirmPassword);

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
    console.log("user",user)
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

    // Check if user is active and email is verified
    if (!user.isActive || !user.isEmailVerified) {
      return res.status(403).json({
        message: "Account is inactive or email not verified.",
        success: false,
      });
    }

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

    console.log("Generated OTP:", otp);

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
    console.log("Mail options:", mailOptions);

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

    // Check if the OTP is valid
    if (user.otp !== otp) {
      return res.status(400).json({
        message: "Invalid OTP!",
        success: false,
      });
    }

    // Check if the OTP has expired
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
    console.log("user", user);

    // Check if the user is blocked
    if (user?.isBlocked) {
      return res.status(201).json({ status: 201, message: "User Blocked" });
    }

    // User found, generate a token
    if (user) {
      const tokenData = { userId: user._id };
      const token = jwt.sign(tokenData, process.env.SECRET_KEY);

      return res.status(200).json({
        status: 200,
        message: "Login Successfully",
        data: user,
        token: token,
        LastStep: user.CompleteSteps,
      });
    }

    // User not found, create a new one
    let newUser = new User({
      email,
      socialId,
      firstName,
      lastName,
      registrationType,
    });
    console.log("newuser", newUser)

    // Save new user to the database
    await newUser.save();

    console.log("it hits");

    // Generate token for the new user
    const tokenData = { userId: user._id };
    const token = jwt.sign(tokenData, process.env.SECRET_KEY);

    return res.status(201).json({
      success: true,
      message: "User created successfully",
      data: newUser,
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


//forgot password


exports.forgotPassword = async (req, res) => {
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
      to: email,
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
      message: "OTP sent to your email!",
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
    console.log("req.body", req.body)
    const { otp, newPassword, email } = req.body;
    
    console.log("req.otp", otp, newPassword,email )

    // Validate input
    if (!email|| !otp || !newPassword) {
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

exports.deactivateUser = async (req, res) => {
  try {
      const { _id } = req.user; 
      const user = await User.findById(_id);
      if (!user) {
          return res.status(404).json({
              message: 'User not found',
              success: false,
          });
      }

      // Deactivate the user
      user.isActive = false; 
      await user.save();

      return res.status(200).json({
          message: 'User account deactivated successfully',
          success: true,
      });
  } catch (err) {
      console.error('Error deactivating user:', err);
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
    console.log("Token in myProfile:", token);

    if (!token) {
      return res.status(401).json({
        message: "No token provided!",
        success: false,
      });
    }

    // Verify the token
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    const userId = decoded.userId; // Assuming userId is stored in the token

    // Log the user ID
    console.log("Decoded User ID:", userId);

    // Extract filters from req.body
    const { dateRange, testType } = req.body;
    console.log("DateRange:", dateRange, "TestType:", testType);

    // Find the user profile without aggregation
    const user = await User.findById(userId).select('-password -otp -otpExpiration');
    if (!user) {
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }

    // Find the user's test results
    let testResults = await TestResult.find({ userId: userId }).lean();
    console.log("Initial Test Results:", testResults); // Log initial test results

    // Filter test results by date range if provided
  // Filter test results by date range if provided
if (dateRange?.from && dateRange?.to) {
  const startDate = moment(dateRange.from).startOf('day').toDate();
  const endDate = moment(dateRange.to).endOf('day').toDate(); // Covers the entire day

  console.log("Start Date:", startDate);
  console.log("End Date:", endDate);

  testResults = testResults.filter(result => {
    const testDate = moment(result.date, 'YYYY-MM-DD').toDate(); // Convert 'date' string to Date object
    const isInRange = moment(testDate).isBetween(startDate, endDate, null, '[]'); // Include both start and end dates
    console.log(`Test Result ID: ${result._id}, Date: ${testDate}, In Range: ${isInRange}`);
    return isInRange;
  });

  console.log("Filtered Test Results by Date Range:", testResults); // Log filtered test results
} else {
  console.log("No date range provided; skipping date filtering.");
}


    // Filter test results by test type if provided
    if (Array.isArray(testType) && testType.length > 0) {
      testResults = testResults.filter(result => testType.includes(result.testType));
      console.log("Filtered Test Results by Test Type:", testResults); // Log filtered test results
    } else {
      console.log("No test type provided; skipping test type filtering.");
    }

    // Prepare the user profile response
    const userProfile = {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      mobileNumber: user.mobileNumber,
      profilePicture: user.profilePicture,
      testResults: testResults,
    };

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

// save  user Question data


exports.userQuestionData = async (req, res) => {
  try {
    console.log("req.body", req.body);
    console.log("req.body", req.body.testId)
    const { userId, questionId, userSelectedOption="",  isCorrect, isMarked, timeTaken, level, isUsed, isOmitted, testId } = req.body;

    // Validation: Ensure all required fields are provided
    if (!userId || !questionId || !testId || typeof isCorrect === 'undefined' || !timeTaken || !level) {
      return res.status(400).json({ message: 'Missing required fields', success: false });
    }

    // Create new UserQuestionData document
    const questionData = new UserQuestionData({
      userId,
      questionId,
      isCorrect,
      isMarked: isMarked || false, // Defaults to false if not provided
      timeTaken,
      userSelectedOption : userSelectedOption || " ",
      level,
      isUsed: isUsed || true, // Defaults to true if not provided
      isOmitted: isOmitted || false,
      testId 
    });
    console.log("questin data", questionData)

    // Save the data
    await questionData.save();

    res.status(201).json({success : true,  message: 'Question data saved successfully', data: questionData });
  } catch (err) {
    console.error("Error saving question data:", err);
    return res.status(500).json({success : false , message: "Internal server error", success: false });
  }
};

exports.updateQuestionData = async (req, res) => {
  try {
    const { userId, questionId, testId, userSelectedOption, isCorrect, isMarked, timeTaken} = req.body;

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
    console.log("test req.body", req.body);
    const { userId, testId, testType } = req.body;

    // Fetch all questions related to the test
    const filteredQuestions = await FilteredQuestion.find({ testId });
    console.log("filteredQuestions with testID ", filteredQuestions)
    if (!filteredQuestions || filteredQuestions.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No questions found for the given testId.",
      });
    }
    console.log("Total filtered questions: ", filteredQuestions);

    // Fetch user's question data
    const userQuestionData = await UserQuestionData.find({ userId, testId });
    console.log("User question data: ", userQuestionData);

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
        console.log("User Answer: ", userAnswer);

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
    console.log("New test result: ", newTestResult);

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
    console.log("lastQuestionsss", lastQuestionsss)
    const lastQuestion = await UserQuestionData.find({ userId, testId })
      .sort({ createdAt: -1 }) // Sort by createdAt in descending order
      .exec(); // Use exec() to execute the query
      console.log("Last submitted question:", lastQuestion);
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
    console.log("User ID:", userId);

    // Check if the user has any question data
    const userQuestions = await UserQuestionData.find({ userId }).populate('questionId');
    console.log("User Questions Found:", userQuestions);

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

    console.log("Overall Stats Result:", overallStats);

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

    console.log("Subject Insights Result:", subjectInsights);

    // Define the subjects you're interested in
    const subjects = ["medical", "airway", "cardiology", "trauma", "emsOperations"];

    // Format subject insights data to include all subjects
    const subjectDataFormatted = subjects.map(subject => {
      const insight = subjectInsights.find(i => i.subject === subject) || { correctAnswered: 0, totalAnswered: 0, percentage: 0 };
      console.log(`Subject: ${subject}, Insight:`, insight); // Debugging log
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
  