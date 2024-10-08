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
    const token = req.headers.authorization.split(" ")[1];
    if (!token) {
      return res.status(401).json({
        message: "No token provided!",
        success: false,
      });
    }

    // Verify the token
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    const userId = decoded.userId; // Assuming userId is stored in the token

    // Use aggregation to get user profile with test results
    const userProfile = await User.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(userId) } }, // Use 'new' keyword
      {
        $lookup: {
          from: 'testresults', // The name of the TestResult collection
          localField: '_id',
          foreignField: 'userId',
          as: 'testResults',
        },
      },
      {
        $project: {
          _id: 1,
          firstName: 1,
          lastName: 1,
          email: 1,
          role: 1,
          isEmailVerified: 1,
          isActive: 1,
          createdAt: 1,
          updatedAt: 1,
          mobileNumber: 1,
          profilePicture: 1, // Include profilePicture in the response
          testResults: 1, // Include testResults in the response
        },
      },
    ]);
    
    console.log("userProfile", userProfile);

    if (userProfile.length > 0) {
      // Exclude sensitive data if necessary
      const { password, otp, otpExpiration, ...userDetails } = userProfile[0];
      
      return res.status(200).json({
        success: true,
        user: userDetails, // Return user details with test results
      });
    } else {
      return res.status(404).json({
        message: "User not found!",
        success: false,
      });
    }
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

exports.submitTestResults = async (req, res) => {
  try {
    console.log("test req.body", req.body);
    const { userId, testId, testType } = req.body;

    // Fetch all questions related to the test
    const filteredQuestions = await FilteredQuestion.find({ testId });
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
    console.error("Error submitting test results:", error);
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
  