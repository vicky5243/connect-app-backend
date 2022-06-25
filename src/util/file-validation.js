const fileValidation = (file, maxFileSize, validMimeTypes) => {
  let errorMessage = '';
  if (file.size > maxFileSize) {
    errorMessage = 'File size should not be excess to 5 MB. Please try again.';
  } else if (validMimeTypes.every(type => file.mimetype !== type)) {
    errorMessage = 'Please provide valid image file. Please try again.';
  }

  return errorMessage;
}

module.exports = fileValidation;