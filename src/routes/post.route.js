// External libraries
const express = require('express');
const { check } = require('express-validator');

// Internal libraries
const isAuth = require('../middlewares/isAauth.middleware');
const postFileUpload = require('../middlewares/postFileUpload.middleware');
const { 
  getPosts, 
  createPost,
  commentOnAPost,
  getCommentsOfAPost,
  likeOrUnlikeAPost,
  getLikesOfAPost
} = require('../controllers/post.controller');

const router = express.Router();

// POST: Creat a post
router.post('/posts', isAuth, postFileUpload.single('file'), createPost);

// GET: Get all posts (newsfeed)
router.get('/posts', isAuth, getPosts);

// POST: Comment on a post
router.post('/posts/comments/:pid', isAuth, [
  check('commentText').not().isEmpty()
], commentOnAPost);

// GET: Get comments of a post
router.get('/posts/comments', isAuth, getCommentsOfAPost);

// GET: Get likes of a post
router.get('/posts/likes/', isAuth, getLikesOfAPost);

// POST: Like or Unlike a post
router.post('/posts/likes/:pid', isAuth, likeOrUnlikeAPost);

module.exports = router;