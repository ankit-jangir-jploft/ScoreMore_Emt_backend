const mongoose = require("mongoose");
require('dns').setDefaultResultOrder('ipv4first');


const connectDb = async ()=> {
    try {
        await mongoose.connect("mongodb+srv://ankitjangir:010720024@cluster0.pnzca.mongodb.net/scoremore?retryWrites=true&w=majority");
        console.log("database connect successfully !!")
    } catch (err) {
        console.log("err", err)
    }
}

module.exports = connectDb;