// External libraries
const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');

// Internal libraries
const HttpError = require('../models/Http-Error.model');
const User = require('../models/User.model');
const Post = require('../models/Post.model');
const { getPagination, getPagingData } = require('../util/pagination');
const reqValidation = require('../util/req-validation');
const fileValidation = require('../util/file-validation');
const Follow = require('../models/Follow.model');

/**
 * GET: Get current user (online user)
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 * @returns User
 */
const getCurrentUser = async (req, res, next) => {
  res.json({
    data: {
      user: req.user
    }
  });
};

/**
 * GET: Get user by id
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 * @returns User
 */
const getUserById = async (req, res, next) => {
  // Destructuring
  const { uid } = req.query;

  // Ger user by uid
  let user;
  try {
    user = await User.findByPk(parseInt(uid), {
      attributes: {
        exclude: ['email', 'password', 'updatedAt']
      }
     });
  } catch (err) {
    return next(new HttpError('Something went wrong. Please try again.' + err, 500));
  }

  // There is no user exists by this uid
  if (!user) {
    return next(new HttpError('User not found.', 404));
  }

  // Get latest 12 posts if user has
  let posts;
  try {
    posts = await Post.findAndCountAll({
      where: {
        userId: user.id
      },
      attributes: { exclude: ['updatedAt', 'userId'] },
      order: [['createdAt', 'DESC']],
      limit: 12
    });
  } catch (err) {
    return next(new HttpError('Something went wrong. Please try again.' + err, 500));
  }
  const postsCount = posts.count;
  const _posts = posts.rows;

  // Count followers of this uid
  let numFollowers;
  try {
    numFollowers = await Follow.count({
      where: {
        followeeId: user.id
      }
    })
  } catch (err) {
    return next(new HttpError('Something went wrong. Please try again.', 500));
  }

  // Count followees of this uid
  let numFollowees;
  try {
    numFollowees = await Follow.count({
      where: {
        followerId: user.id
      }
    })
  } catch (err) {
    return next(new HttpError('Something went wrong. Please try again.', 500));
  }

  let isFollowing;
  let isFollower;
  // If online user and provide id user is same then 
  // Don't make this queries
  if (user.id !== req.user.id) {
    // Logged in user is following this uid user or not
    try {
      isFollowing = await Follow.findOne({
        where: {
          followeeId: user.id,
          followerId: req.user.id
        }
      })
    } catch (err) {
      return next(new HttpError('Something went wrong. Please try again.', 500));
    }
  

    // Logged in user is being followed by this uid (user) or not
    try {
      isFollower = await Follow.findOne({
        where: {
          followeeId: req.user.id,
          followerId: user.id
        }
      })
    } catch (err) {
      return next(new HttpError('Something went wrong. Please try again.', 500));
    }
  }

  user = {
    ...user.dataValues,
    isFollower: isFollower ? true : false,
    isFollowee: isFollowing ? true : false,
    numFollowers: numFollowers,
    numFollowees: numFollowees,
    numPosts: postsCount,
    posts: _posts
  }

  res.json({
    data: {
      user
    }
  });
};

/**
 * GET: Searching user
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 * @returns list of User
 */
const searchUser = async (req, res, next) => {
  // Destructuring
  let { u, page, size } = req.query;
  
  // Get users limit and offset
  // page = 1 if page didn't provide
  if (page === 0 || page === undefined) page = 1;
  // 7 items will be shown per page
  if (!size) size = 15;
  const { limit, offset } = getPagination(page, size);

  // Searching users either username or fullname like %user%
  try {
    const users = await User.findAndCountAll({
      where: {
        [Op.or]: [
          {
            username: { [Op.like]: `%${u}%` }
          },
          {
            fullname: { [Op.like]: `%${u}%` }
          }
        ]
      },
      attributes: ['id', 'username', 'fullname', 'profilePhotoUrl'],
      limit,
      offset
    });
    const { count, rows, currentPage, totalPages } = getPagingData(users, page, limit);
    if (count <= 0) return next(new HttpError("Users not found.", 404));
    res.json({
      data: {
        count,
        users: rows,
        currentPage,
        totalPages
      }
    });
  } catch (err) {
    return next(new HttpError('Something went wrong. Please try again.', 500));
  }
};

/**
 * PATCH: Change user password
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 * @returns res a success message
 */
const changePassword = async (req, res, next) => {
  const error = validationResult(req);
  // All fields must be provided to proceed further
  const errMessage = reqValidation(error);
  if (errMessage) return next(new HttpError(errMessage, 400));

  // Destructuring
  const { oldPassword, newPassword, confirmNewPassword } = req.body;

  // New password should be equal to confirm new password
  if (newPassword !== confirmNewPassword)
    return next(new HttpError('Your new password and confirm password do not match. Please try again.', 400));

  // Compare between provided old password and user saved password in database
  let isPasswordMatch = false;
  try {
    isPasswordMatch = await bcrypt.compare(oldPassword, req.user.password);
  } catch (err) {
    return next(new HttpError('Something went wrong. Please try again.', 500));
  }
  // If old password doesn't match to saved password, return password is wrong
  if (!isPasswordMatch)
    return next(new HttpError('Old password is wrong. Please try again.', 400));

  // Check old password and new password does match
  // return error, old password should not be match with new password
  if (oldPassword === newPassword) 
    return next(new HttpError("Create a new password that isn't your current password.", 400));

  // Hashing the user new password
  let hashedPassword;
  try {
    hashedPassword = await bcrypt.hash(newPassword, 12);
  } catch (err) {
    return next(new HttpError('Something went wrong. Please try again.', 500));
  }

  // Updating the password in db
  try {
    req.user.password = hashedPassword;
    await req.user.save();
  } catch (err) {
    return next(new HttpError('Something went wrong. Please try again.', 500));
  }

  // Successfully changed the user password and stored in database
  // return success response
  res.send({ message: 'Your password has been changed successfully.' });
};

/**
 * PATCH: Change user profile photo
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 * @returns res a success message
 */
const editProfile = async (req, res, next) => {
  // Fullname has been provided
  if (req.body.fullname !== req.user.fullname) {
    try {
      req.user.fullname = req.body.fullname || null;
      await req.user.save();
    } catch (err) {
      return next(new HttpError('Something went wrong. Please try again.', 500));
    }
  }

  // Relationship Status has been provided
  if (req.body.relationshipStatus !== req.user.relationshipStatus) {
    try {
      req.user.relationshipStatus = req.body.relationshipStatus || null;
      await req.user.save();
    } catch (err) {
      return next(new HttpError('Something went wrong. Please try again.', 500));
    }
  }

  // User has chose image file
  let userDPChangeError = null;
  if (req.file) {
    // File size should be less than or equal to 5 MB
    const maxFileSize = 5 * 1024 * 1024;
    // These mime types are acceptable
    const validMimeTypes = ['image/jpeg', 'image/jpg', 'image/png'];

    // Validation of file
    const userDPChangeError = fileValidation(req.file, maxFileSize, validMimeTypes);
    // There is no error save the user dp image file
    if (!userDPChangeError) {
      try {
        req.user.profilePhotoUrl = req.file.filename;
        await req.user.save();
      } catch (err) {
        return next(new HttpError('Something went wrong. Please try again.', 500));
      }
    }
  }

  let userUsernameChangeError = null
  // Username has been provided and not equal to previous username
  if (req.body.username && req.body.username !== req.user.username) {
    // Username should be unique in db
    try {
      userUsernameChangeError = await User.findOne(
        { 
          where: { username: req.body.username },
          attributes: ['username']
        }
      )
      // There is no error username is unique
      if (!userUsernameChangeError) {
        req.user.username = req.body.username;
        await req.user.save();
      }
    } catch (err) {
      return next(new HttpError('Something went wrong. Please try again.'+ err, 500));
    }
  }

  // There is an error while changing user profile photo
  if (userDPChangeError) return next(new HttpError(userDPChangeError, 400));

  // There is an error while changing user's username
  if (userUsernameChangeError) {
    return next(
      new HttpError('This username is already taken. Please try another one', 422)
    );
  }

  res.json({
    message: 'Profile has been updated successfully.'
  })
};

module.exports = {
  getCurrentUser,
  getUserById,
  searchUser,
  changePassword,
  editProfile
}