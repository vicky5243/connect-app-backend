// External libraries
const express = require('express');

// Internal libraries
const isAuth = require('../middlewares/isAauth.middleware');
const { 
  followOrUnfollowOfAnUser,
  getFollowersOfAnUser,
  getFolloweesOfAnUser
} = require('../controllers/follow.controller');

const router = express.Router();

// POST: Follow or Unfollow of an user
router.post('/users/account/follows/:uid', isAuth, followOrUnfollowOfAnUser);

// GET: Get all followers of an user
router.get('/users/account/followers/:uid', isAuth, getFollowersOfAnUser);

// GET: Get all followees of an user
router.get('/users/account/followees/:uid', isAuth, getFolloweesOfAnUser);

module.exports = router;