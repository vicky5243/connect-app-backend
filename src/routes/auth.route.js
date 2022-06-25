// External libraries
const express = require('express');
const { check } = require('express-validator');

// Internal libraries
const { 
  signup, 
  signin, 
  logout, 
  refreshToken, 
  sendConfirmationCode,
  verifyConfirmationCode
} = require('../controllers/auth.controller');
const isAuth = require('../middlewares/isAauth.middleware');

const router = express.Router();

// POST: Send email confirmation code to gmail
router.post('/users/auth/email/sendconfirmationcode', [
  check('email').isEmail()
], sendConfirmationCode);

// POST: Verify email confirmation code
router.post('/users/auth/email/verifyconfirmationcode', [
  check('email').isEmail()
], verifyConfirmationCode);

// POST: Creating user's account (SIGN UP)
router.post('/users/auth/signup', [
  check('username').isLength({ min: 2, max: 32 }),
  check('email').isEmail(),
  check('password').isLength({ min: 6, max: 32 })
], signup);

// POST: Log the user in (SIGN IN)
router.post('/users/auth/signin', signin);

// DELETE: Log the user out (LOG OUT)
router.delete('/users/auth/logout', isAuth, logout);

// POST: Request for new accessToken and refreshToken
router.post('/users/auth/refresh-token', refreshToken);

module.exports = router;