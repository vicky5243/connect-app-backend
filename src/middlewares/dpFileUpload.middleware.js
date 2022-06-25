// External libraries
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

// Internal libraries
const HttpError = require('../models/Http-Error.model');

const MIME_TYPE_MAP = {
  'image/png': 'png',
  'image/jpeg': 'jpeg',
  'image/jpg': 'jpg'
}

const dpFileUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'images/profile');
    },
    filename: (req, file, cb) => {
      const ext = MIME_TYPE_MAP[file.mimetype];
      cb(null, `${uuidv4()}-${new Date().getTime()}.${ext}`);
    }
  }),
  fileFilter: (req, file, cb) => {
    const isValid = !!MIME_TYPE_MAP[file.mimetype];
    let error = isValid ? null : new HttpError('Invalid file. Please try again.', 500);
    cb(error, isValid);
  }
});

module.exports = dpFileUpload;