const reqValidation = error => {
  let errorMessage = '';
  if (error.errors.length > 0) {
    const err = error.errors[0];
    if (err.param === 'username') 
      errorMessage = 'Username is invalid. Please try again.';
    else if (err.param === 'email')
      errorMessage = 'Email is invalid. Please try again.';
    else if (err.param === 'password')
      errorMessage = 'Password must be contain 6 to 32 characters long. Please try again.';
    else if (err.param === 'commentText')
      errorMessage = 'Please provide comment text.';
    else if (err.param === 'oldPassword')
      errorMessage = 'Please provide your old password.';
    else if (err.param === 'newPassword')
      errorMessage = 'Password must be contain 6 to 32 characters long. Please try again.';
    else errorMessage = 'Something went wrong. Please try again.';
  }

  return errorMessage;
};

module.exports = reqValidation;