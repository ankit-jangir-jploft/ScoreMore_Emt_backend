const bodyParser = require("body-parser");
const express = require("express");
const app = express();
require('dotenv').config();
const port = process.env.PORT;
const cors = require('cors');
const morgan = require('morgan')

//routes
const userRoutes = require("./routes/userRoutes");
const connectDb = require("./utils/db");



//middlewares
app.use(express.json());
app.use(
    bodyParser.json({ limit: "1024mb" }),
    bodyParser.urlencoded({
        limit: "1024mb",
        extended: true,
    }),
    cors(),
    morgan("dev")
);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ status: 'Error', message: err.message });
  });


app.use("/api/v1/user", userRoutes);


app.listen(port, async (err)=> {
    await connectDb();
    if(err){
        console.log("Server not connected");
    }
    console.log(`server is connected on port ${port}`)
})


