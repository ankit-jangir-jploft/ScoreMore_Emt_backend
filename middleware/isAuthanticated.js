const jwt = require("jsonwebtoken");
const User = require("../models/User"); 
// Adjust the path as necessary

const isAuthenticated = async (req, res, next) => {
  try {
    const token = req.headers['authorization']?.split(' ')[1]; 
    
    if (!token) {
      return res.status(401).json({
        message: "User not authenticated!",
        success: false,
      });
    }

    const decode = await jwt.verify(token, process.env.SECRET_KEY);
    if (!decode) {
      return res.status(401).json({
        message: "Invalid token!",
        success: false,
      });
    }

    // Find user by ID and set it in req.user
    const user = await User.findById(decode.userId);
    if (!user) {
      return res.status(401).json({
        message: "User not found!",
        success: false,
      });
    }

    req.user = user; // Set the user object in req.user
    next();
  } catch (err) {
    console.log("Error in authentication", err);
    return res.status(500).json({
      message: "Internal server error",
      success: false,
    });
  }
};

module.exports = isAuthenticated;
