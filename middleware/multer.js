const multer = require('multer');
const path = require('path');


const csvStorage = multer.memoryStorage(); 

const uploadCSV = multer({
  storage: csvStorage,
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ['text/csv', 'application/json'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only CSV and JSON are allowed.'));
    }
  },
}).single('file');


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


const uploadProfilePicture = multer({ storage }).single('profilePicture');

// Export both middlewares
module.exports = {
  uploadProfilePicture,
  uploadCSV,
};
