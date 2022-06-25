// External libraries
const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');

// Internal libraries
const User = require('../models/User.model');
const HttpError = require('../models/Http-Error.model');
const VerifyEmail = require('../models/VerifyEmail.model');
const reqValidation = require('../util/req-validation');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../util/jwt-gen');
const { sendEmailVerificationCode } = require('../util/send-email');
const client = require('../util/redis.db');

/**
 * POST: Send email confirmation code
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 * @returns response, message: 'Email has been sent successfully.'
 */
const sendConfirmationCode = async (req, res, next) => {
  const error = validationResult(req);
  // All fields must be provided to proceed further
  const errMessage = reqValidation(error);
  if (errMessage) return next(new HttpError(errMessage, 400));

  // Destructuring
  const { email } = req.body;

  // Email should be unique in db
  try {
    const user = await User.findOne(
      { 
        where: { email },
        attributes: ['email']
      }
    )
    // Error: Email has been already taken
    if (user) {
      return next(
        new HttpError('This email is already taken. If its yours then, try log in instead.', 422)
      );
    }
  } catch (err) {
    return next(new HttpError('Something went wrong. Please try again.', 500));
  }

  // Check if email verification code has been sent already
  let isCodeSent;
  try {
    isCodeSent = await VerifyEmail.findOne({
      where: { email },
      attributes: { exclude: ['createdAt', 'updatedAt'] }
    });
  } catch (err) {
    return next(new HttpError('Something went wrong. Please try again.', 500));
  }

  let code;
  // if hasn't, create new verfication code and store it to database
  // after that, send email
  if (!isCodeSent) {
    // Generating six digit random number
    code = Math.floor(100000 + Math.random() * 900000);
    try {
      await VerifyEmail.create({ email, code });
    } catch (err) {
      return next(new HttpError('Something went wrong. Please try again.', 500));
    }
  }
  // if has, then resend email with the exists code
  else {
    code = isCodeSent.code;
    try {
      isCodeSent.attempts = 3;
      await isCodeSent.save();
    } catch (err) {
      return next(new HttpError('Something went wrong. Please try again.', 500));
    }
  }

  // sending email
  sendEmailVerificationCode(code, email);

  // send success response
  res.status(201).json({
    message: 'Email has been sent successfully.'
  });
};

/**
 * POST: Verfication of email via code
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 * @returns VerifyEmail.model class as success response, excluded some properties
 */
const verifyConfirmationCode = async (req, res, next) => {
  const error = validationResult(req);
  // All fields must be provided to proceed further
  const errMessage = reqValidation(error);
  if (errMessage) return next(new HttpError(errMessage, 400));

  // Destructuring
  const { email, code } = req.body;

  // Find email with the given email id in verify_emails table
  let isCodeSent;
  try {
    isCodeSent = await VerifyEmail.findOne({
      where: { email },
      attributes: { exclude: ['createdAt', 'updatedAt'] }
    });
  } catch (err) {
    return next(new HttpError('Something went wrong. Please try again.', 500));
  }

  // if doesn't exist, return error
  if (!isCodeSent) {
    return next(new HttpError('Something went wrong. Please try again.', 500));
  }

  // if exists
  // check number of attempts made to verify account if attempts <= 0
  // if it is, return error
  if (isCodeSent.attempts <= 0) {
    return next(
      new HttpError("Might be you are wrong user. Please try your own Email address instead.", 400)
    );
  }

  // if it isn't
  // compare db saved code and provided code
  // if its doesn't match, return error code doesn't match and decrement the attempts by 1
  if (isCodeSent.code !== parseInt(code)) {
    try {
      isCodeSent.attempts = isCodeSent.attempts - 1;
      await isCodeSent.save();
      return next(new HttpError("That code isn't valid. Please try again.", 400));
    } catch (err) {
      return next(new HttpError('Something went wrong. Please try again.', 500));
    }
  }
  // if its matches, return true as email verified and
  // update this email as isVerfied = true in db
  try {
    isCodeSent.isVerified = true;
    await isCodeSent.save();
  } catch (err) {
    return next(new HttpError('Something went wrong. Please try again.', 500));
  }
  
  res.status(201).json({
    data: {
      id: isCodeSent.id,
      email: isCodeSent.email,
      code: isCodeSent.code,
      isVerified: isCodeSent.isVerified
    }
  });
};

/**
 * POST: Signup the user
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 * @returns user, accessToken and refreshToken
 */
 const signup = async (req, res, next) => {
  const error = validationResult(req);
  // All fields must be provided to proceed further
  const errMessage = reqValidation(error);
  if (errMessage) return next(new HttpError(errMessage, 400));

  // Destructuring
  const { username, email, password, code, id } = req.body;

  let user;
  // Username should be unique in db
  try {
    user = await User.findOne(
      { 
        where: { username },
        attributes: ['username']
      }
    )
    // Error: Username has been already taken
    if (user) {
      return next(
        new HttpError('This username is already taken. Please try another one', 422)
      );
    }
  } catch (err) {
    return next(new HttpError('Something went wrong. Please try again.', 500));
  }

  // Email should be unique in db
  try {
    user = await User.findOne(
      { 
        where: { email },
        attributes: ['email']
      }
    )
    // Error: Email has been already taken
    if (user) {
      return next(
        new HttpError('This email is already taken. Please try another one', 422)
      );
    }
  } catch (err) {
    return next(new HttpError('Something went wrong. Please try again.', 500));
  }

  // Check email is verified or not
  try {
    const verifyEmail = await VerifyEmail.findOne({
      where: { id, email, code, isVerified: true },
      attributes: { exclude: ['createdAt', 'updatedAt'] }
    });
    
    // Email hasn't been verified yet
    if (!verifyEmail) {
      return next(new HttpError("Email hasn't been verified yet. Please verify first.", 400));
    }
  } catch (err) {
    return next(new HttpError('Something went wrong. Please try again.', 500));
  }

  // Hashing the user password
  let hashedPassword;
  try {
    hashedPassword = await bcrypt.hash(password, 12);
  } catch (err) {
    return next(new HttpError('Something went wrong. Please try again.', 500));
  }

  // Creating the user's account and delete verify email row for this email from db
  try {
    user = await User.create({ 
      username,
      email,
      password: hashedPassword 
    });

    await VerifyEmail.destroy({
      where: { email }
    });
  } catch (err) {
    return next(new HttpError('Something went wrong. Please try again.', 500));
  }

  // Generating jwt tokens:-
  // Access token
  // Refresh token
  let accessToken;
  let refreshToken;
  try {
    accessToken = await signAccessToken(user.id.toString());
    refreshToken = await signRefreshToken(user.id.toString());
  } catch (err) {
    return next(new HttpError(err.message, err.code));
  }

  // Send user's specific data 
  user = {
    id: user.id,
    username: user.username,
    fullname: null,
    relationshipStatus: null,
    profilePhotoUrl: user.profilePhotoUrl,
    createdAt: user.createdAt
  }

  res.status(201).json({
    data: {
      user,
      accessToken,
      refreshToken
    }
  });
};

/**
 * POST: Signin the user
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 * @returns user, accessToken and refreshToken
 */
const signin = async (req, res, next) => {
  // Destructuring
  const { username, password } = req.body;

  let user;
  // Finding user account by username or email
  try {
    user = await User.findOne(
      { 
        where: {
          [Op.or]: [
            { username: username },
            { email: username }
          ]
        },
        attributes: { exclude: ['email', 'updatedAt'] }
      }
    )
    // Error: There is no account with this username
    if (!user) {
      return next(
        new HttpError("The username you entered doesn't belong to an account. Please try again.", 422)
      );
    }
  } catch (err) {
    return next(new HttpError('Something went wrong. Please try again.', 500));
  }

  // Compare the password between given password and db password
  let isPasswordMatch;
  try {
    isPasswordMatch = await bcrypt.compare(password, user.password);
    // Password doesn't match
    if (!isPasswordMatch) return next(new HttpError('Password you entered is wrong. Please try again.', 400));
  } catch (err) {
    return next(new HttpError('Something went wrong. Please try again.', 500));
  }

  // Generating jwt tokens:-
  // Access token
  // Refresh token
  let accessToken;
  let refreshToken;
  try {
    accessToken = await signAccessToken(user.id.toString());
    refreshToken = await signRefreshToken(user.id.toString());
  } catch (err) {
    return next(new HttpError(err.message, err.code));
  }

  // Send user's specific data
  user = {
    id: user.id,
    username: user.username,
    fullname: user.fullname,
    relationshipStatus: user.relationshipStatus,
    profilePhotoUrl: user.profilePhotoUrl,
    createdAt: user.createdAt
  }

  res.json({
    data: {
      user,
      accessToken,
      refreshToken
    }
  });
};

/**
 * DELETE: Log the user out
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 * @returns status code 204 successful, but no content
 */
const logout = async (req, res, next) => {
  // Destructuring
  const { refreshToken } = req.body;
  if (!refreshToken) return next(new HttpError('Bad Request', 400));

  try {
    const userId = await verifyRefreshToken(refreshToken);
    await client.DEL(userId);
    // Successfully log the user out
  res.status(200).json({
    message: 'User logged out successfully.'
  });
  } catch (err) {
    next(new HttpError('Something went wrong. Please try again.', 500));
  }
};

/**
 * POST: Get new accessToken and refreshToken
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 * @returns new accessToken and refreshToken as data object properties
 */
const refreshToken = async (req, res, next) => {
  // Destructuring
  const { refreshToken } = req.body;
  if (!refreshToken) return next(new HttpError('Bad Request', 400));

  let userId
  try {
    userId = await verifyRefreshToken(refreshToken);
  } catch (err) {
    return next(new HttpError('Something went wrong. Please try again.', 500));
  }

    // Generating jwt tokens:-
    // Access token
    // Refresh token
    let newAccessToken;
    let newRefreshToken;
    try {
      newAccessToken = await signAccessToken(userId.toString());
      newRefreshToken = await signRefreshToken(userId.toString());
    } catch (err) {
      return next(new HttpError(err.message, err.code));
    }

    // Successfully log the user out
    res.status(201).json({
      data: {
        id: userId,
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      }
    });
};

module.exports = {
  sendConfirmationCode,
  verifyConfirmationCode,
  signup,
  signin,
  logout,
  refreshToken
};