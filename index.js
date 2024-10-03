const bodyParser = require("body-parser");
const express = require("express");
const app = express();
require("dotenv").config();
const port = process.env.PORT || 5000; // Default to port 5000 if not set
const cors = require("cors");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const path = require('path')

// Routes
const userRoutes = require("./routes/userRoutes");
const connectDb = require("./utils/db");

// CORS Configuration
const corsOptions = {
  origin: "http://localhost:5173", // Your frontend originonsole.log
  credentials: true, // Allow credentials (cookies, etc.)
};

// Middleware
app.use(cors(corsOptions)); // Enable CORS with specified options
app.use(express.json()); // Body parser for JSON
app.use(cookieParser()); // Cookie parser
app.use(bodyParser.json({ limit: "1024mb" })); // Set limits for JSON body
app.use(bodyParser.urlencoded({ limit: "1024mb", extended: true })); // Set limits for URL-encoded body
app.use(morgan("dev")); // Logging middleware



app.use('/assets', express.static(path.join(__dirname, 'middleware', 'assets')));
// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ status: "Error", message: err.message });
});

// User routes
app.use("/api/v1/user", userRoutes);

// Database connection and server startup
app.listen(port, async (err) => {
  await connectDb();
  if (err) {
    console.log("Server not connected");
  }
  console.log(`Server is connected on port ${port}`);
});
