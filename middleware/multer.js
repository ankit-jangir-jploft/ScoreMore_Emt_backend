const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Set up multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, 'assets', 'profile_pictures'); // Define your desired directory here

    fs.mkdirSync(dir, { recursive: true });

    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const filename = uniqueSuffix + ext;

    console.log("Filename:", filename); 
    cb(null, filename);
  }
});

// Export the upload middleware
module.exports.upload = multer({ storage }).single('profilePicture');
