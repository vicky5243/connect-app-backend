// External libraries
const express = require('express');
const { check } = require('express-validator');

// Internal libraries
const isAuth = require('../middlewares/isAauth.middleware');
const { 
  searchUser, getUserById, changePassword, getCurrentUser, editProfile
} = require('../controllers/user.controller');
const dpFileUpload = require('../middlewares/dpFileUpload.middleware');

const router = express.Router();

// GET: Get current user (online user)
router.get('/users/currentUser', isAuth, getCurrentUser);

// GET: Get a user by id
router.get('/users', isAuth, getUserById);

// GET: Search users
router.get('/users/search', isAuth, searchUser);

// PATCH: Change password
router.patch('/users/accounts/changepassword', isAuth, [
  check('oldPassword').not().isEmpty(),
  check('newPassword').isLength({ min: 6, max: 32 })
], changePassword);

// PATH: Edit profile
router.patch('/users/accounts/editProfile', 
  isAuth, 
  dpFileUpload.single('file'), 
  editProfile
);

module.exports = router;