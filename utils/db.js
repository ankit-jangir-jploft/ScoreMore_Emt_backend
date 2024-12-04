

const mongoose = require("mongoose");
require("dotenv").config();
// lttxHmOPl3hQ48Z5

const connectDb = async () => {
    try {
        await mongoose.connect(process.env.mongo_url);
        console.log("Database connected successfully !!");
    } catch (err) {
        console.error("Database connection error:", err);
    }
}

module.exports = connectDb;


