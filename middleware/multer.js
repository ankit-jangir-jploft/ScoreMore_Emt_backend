const multer = require('multer');
const path = require('path');

// Set up multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Move one directory back and save in assets/profile_pictures
    cb(null, path.join(__dirname, '..', 'assets', 'profile_pictures'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const filename = uniqueSuffix + ext;

    cb(null, filename);
  }
});

// Export the upload middleware
module.exports.upload = multer({ storage }).single('profilePicture');
