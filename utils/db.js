

const mongoose = require("mongoose");
require("dotenv").config();
// lttxHmOPl3hQ48Z5

const connectDb = async () => {
    try {

        // scoremore live database
        // await mongoose.connect("mongodb://root:LASFJJSDKFs%3FSDg45SDGKL%3FSGHFHG@44.227.25.14/db01?retryWrites=true&w=majority");
        // console.log(" scoremore Database connected successfully !!");



        // v4 and local databse 
        await mongoose.connect("mongodb+srv://ankit:lttxHmOPl3hQ48Z5@cluster0.pnzca.mongodb.net/scoremore?retryWrites=true&w=majority");
        console.log("local Database connected successfully !!");


    } catch (err) {
        console.error("Database connection error:", err);
    }
}

module.exports = connectDb;


