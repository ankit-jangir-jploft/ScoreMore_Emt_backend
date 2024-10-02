const mongoose = require("mongoose");

const connectDb = async ()=> {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("database connect successfully !!")
    } catch (err) {
        console.log("err", err)
    }
}

module.exports = connectDb;