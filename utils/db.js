// const mongoose = require("mongoose");
// require('dns').setDefaultResultOrder('ipv4first');

// const connectDb = async () => {
//     try {
//         // await mongoose.connect("mongodb+srv://ankitjangir:010720024@cluster0.pnzca.mongodb.net/scoremore");
//         // await mongoose.connect("mongodb+srv://ankitjangir:010720024@cluster0.pnzca.mongodb.net/scoremore?retryWrites=true&w=majority");
//         await mongoose.connect("mongodb+srv://ankitjangir:010720024@cluster0.pnzca.mongodb.net/scoremore");




//         console.log("Database connected successfully !!");
//     } catch (err) {
//         console.log("Error:", err);
//     }
// }

// module.exports = connectDb;

const mongoose = require("mongoose");
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
