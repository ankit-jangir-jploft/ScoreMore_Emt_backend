const bodyParser = require("body-parser");
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const path = require('path');
const adminRoutes = require("./routes/adminRoutes");
const userRoutes = require("./routes/userRoutes");
const questionRoutes = require("./routes/questionRoute");
const examRoute = require("./routes/examRoute");
const stripeRoute = require("./routes/stripeRoute");
const flashcardRoute = require("./routes/flashcard");
const connectDb = require("./utils/db");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 4748;

// CORS Configuration
const corsOptions = {
  origin: (origin, callback) => {
      // Allow all origins in development, but restrict in production
      const allowedOrigins = ["http://localhost:5173", "http://localhost:5174", "http://v4.checkprojectstatus.com:4749", "http://v4.checkprojectstatus.com:3333"];
      if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true); // Allow the request
      } else {
          callback(new Error("CORS not allowed"), false); // Reject the request
      }
  },
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  allowedHeaders: "Content-Type,Authorization",
  credentials: true,
  preflightContinue: false,
};


// Middlewares
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());
app.use(bodyParser.json({ limit: "1024mb" }));
app.use(bodyParser.urlencoded({ limit: "1024mb", extended: true }));
app.use(morgan("dev"));

// Static files
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Routes
app.use("/api/admin", adminRoutes);
app.use("/api/v1/user", userRoutes);
app.use("/api/v1/question", questionRoutes);
app.use("/api/v1/exam", examRoute);
app.use("/api/v1/stripe", stripeRoute);
app.use("/api/v1/flashcard", flashcardRoute);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ status: "Error", message: err.message });
});

// Database connection and server startup
app.listen(port, async () => {
    await connectDb();
    console.log(`Server is connected on port ${port}`);
});
