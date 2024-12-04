const jwt = require("jsonwebtoken"); // Adjust the path as necessary
const { User } = require("../models/User");
// Adjust the path as necessary

const isAuthenticated = async (req, res, next) => {
  try {
    // Retrieve the token from the Authorization header
    // console.log("req.headers", req.headers)
    const token = req.headers['authorization' || 'Authorization']?.split(' ')[1];
    // console.log("token in auth", token )

    // Check if the token is present
    if (!token) {
      return res.status(401).json({
        message: "User not authenticated!",
        success: false,
      });
    }

    // Verify the token
    const decoded = jwt.verify(token, process.env.SECRET_KEY); // Removed `await` as `jwt.verify` is synchronous
    if (!decoded) {
      return res.status(401).json({
        message: "Invalid token!",
        success: false,
      });
    }

    // Find user by ID and set it in req.user
    // console.log("decoded.userId", decoded.userId)
    const user = await User.findById(decoded.userId); // Ensure your JWT has a userId in the payload
    if (!user) {
      return res.status(401).json({
        message: "User not found!",
        success: false,
      });
    }

    // Set the user object in req.user for later use
    req.user = user;
    next(); // Proceed to the next middleware
  } catch (err) {
    console.error("Error in authentication", err); // Use console.error for better error tracking
    return res.status(500).json({
      message: "Internal server error",
      success: false,
    });
  }
};

module.exports = isAuthenticated;
