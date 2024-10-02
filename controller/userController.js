const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodeMailer = require("nodemailer")
const crypto = require("crypto")

exports.signup = async (req, res) => {
    try {
      console.log(req.body)
      const { fullname, email, phoneNumber, password } = req.body;
      console.log("fullname, email, phoneNumber,  password ", fullname, email, phoneNumber, password )
  
      if (!fullname || !email || !phoneNumber || !password) {
        return res.status(400).json({
          message: "Something is missing!",
          success: false,
        });
      }
  
  
      const user = await User.findOne({ email });
      if (user) {
        return res.status(400).json({
          message: "User already exists with this email!",
          success: false,
        });
      }
  
      const hashPassword = await bcrypt.hash(password, 10);
  
      await User.create({
        fullname,
        email,
        phoneNumber,
        password: hashPassword,
      });
  
      return res.status(200).json({
        message: "Account created successfully!",
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
  
  exports.signInWithPassword = async (req, res) => {
    try {
      const { email, password } = req.body;
  
      if (!email || !password) {
        return res.status(400).json({
          message: "Something is missing!",
          success: false,
        });
      }
  
      let user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({
          message: "Incorrect email or password!",
          success: false,
        });
      }
  
      const isPasswordMatch = await bcrypt.compare(password, user.password);
      if (!isPasswordMatch) {
        return res.status(400).json({
          message: "Incorrect email or password!",
          success: false,
        });
      }
  
      const tokenData = {
        userId: user._id,
      };
      
      user = {
        _id: user._id,
        fullname: user.fullname,
        email: user.email,
        phoneNumber: user.phoneNumber,
      };
  
      const token = await jwt.sign(tokenData, process.env.SECRET_KEY, {
        expiresIn: "1d",
      });
  
      return res
        .status(200)
        .cookie("token", token, {
          maxAge: 24 * 60 * 60 * 1000, // 1 day
          httpOnly: true,
          sameSite: "strict",
        })
        .json({
          message: `Welcome back ${user.fullname}`,
          user,
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

  exports.signInWithOTP = async (req, res) => {
    try {
      const { email } = req.body;
  
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
  

      console.log("otp", otp)
      // Store OTP and its expiration time in the user's document
      user.otp = otp;
      user.otpExpiration = otpExpiration;
      await user.save();
  
      // Send OTP via email
      const mailOptions = {
        from: process.env.MAIL_ID,
        to: email,
        subject: "Your OTP Code",
        text: `Your OTP code is ${otp}. It is valid for 15 minutes.`,
      };
      console.log("mailoption", mailOptions)
  
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
      const { email, otp } = req.body;
  
      if (!email || !otp) {
        return res.status(400).json({
          message: "Email and OTP are required!",
          success: false,
        });
      }
  
      // Find the user
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
  
      // Clear the OTP fields
      user.otp = undefined;
      user.otpExpiration = undefined;
      await user.save();
  
      // Generate a JWT token for the user
      const tokenData = { userId: user._id };
      const token = await jwt.sign(tokenData, process.env.SECRET_KEY, { expiresIn: "1d" });
  
      return res
        .status(200)
        .cookie("token", token, {
          maxAge: 24 * 60 * 60 * 1000, // 1 day
          httpOnly: true,
          sameSite: "strict",
        })
        .json({
          message: `Welcome back ${user.fullname}`,
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
  
  
  exports.logout = async (req, res) => {
    try {
      return res.status(200).cookie("token", "", { maxAge: 0 }).json({
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