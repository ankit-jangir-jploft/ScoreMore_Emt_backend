

const mongoose = require("mongoose");
require("dotenv").config();
// lttxHmOPl3hQ48Z5

const connectDb = async () => {
    try {
        await mongoose.connect("mongodb+srv://ankit:lttxHmOPl3hQ48Z5@cluster0.pnzca.mongodb.net/scoremore?retryWrites=true&w=majority");
        console.log("Database connected successfully !!");
    } catch (err) {
        console.error("Database connection error:", err);
    }
}

module.exports = connectDb;


