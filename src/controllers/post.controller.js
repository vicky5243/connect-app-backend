// External libraries
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');

// Internal libraries
const HttpError = require('../models/Http-Error.model');
const Post = require('../models/Post.model');
const User = require('../models/User.model');
const Comment = require('../models/Comment.model');
const Like = require('../models/Like.model');
const fileValidation = require('../util/file-validation');
const { getPagination, getPagingData } = require('../util/pagination');
const reqValidation = require('../util/req-validation');
const sequelize = require('../util/mysql.db');
const hasLiked = require('../util/hasLiked');

/**
 * POST: Creat a post
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 * @returns created Post
 */
const createPost = async (req, res, next) => {
  // User didn't choose file
  // Image file is require to post
  if (!req.file) return next(
    new HttpError('No file chosen. Make sure you selecte a image file.', 400)
  );

  // File size should be less than or equal to 5 MB
  const maxFileSize = 5 * 1024 * 1024;
  // These mime types are acceptable
  const validMimeTypes = ['image/jpeg', 'image/jpg', 'image/png'];

  // Validation of file
  const errorMessage = fileValidation(req.file, maxFileSize, validMimeTypes);
  if (errorMessage) return next(new HttpError(errorMessage, 400));

  // Destructuring
  const { title, description } = req.body;

  // Creating post
  let post;
  try {
    post = await Post.create({
      title: title.length > 0 ? title : null,
      description: description.length > 0 ? description : null,
      imageUrl: req.file.filename,
      userId: req.user.id
    });
  } catch (err) {
    return next(new HttpError('Something went wrong. Please try again.', 500));
  }

  res.status(201).json({
    message: 'Post created successfully.'
  });
};

/**
 * GET: Fetching posts of single user (newsfeed)
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 * @returns list of Post
 */
const getPosts = async (req, res, next) => {
  // Destructuring
  let { page, size, uid } = req.query;
  
  // Get posts limit and offset
  // page = 1 if page didn't provide
  if (page === 0 || page === undefined) page = 1;
  // 10 items will be shown per page
  if (!size) size = 15;
  page = parseInt(page);
  size = parseInt(size);
  const { limit, offset } = getPagination(page, size);

  let query;
  if (uid !== undefined) {
    query = { userId: parseInt(uid) };
  } else {
    query = {
      [Op.or]: [
        { userId: req.user.id },
        {
          userId: [
            sequelize.literal(`
              SELECT followeeId FROM follows WHERE followerId = ${req.user.id}
            `)
          ]
        }
      ],
    }
  }

  try {
    let posts = await Post.findAndCountAll({
      where: query,
      attributes: {
        exclude: ["updatedAt", "userId"]
      },
      include: [
        {
          model: User,
          attributes: ["id", "username", "profilePhotoUrl"]
        },
        {
          model: Like,
          attributes: ['userId']
        },
        {
          model: Comment,
          attributes: ['id']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });
    const { count, rows, currentPage, totalPages } = getPagingData(posts, page, limit);
    if (count <= 0) return next(new HttpError("Posts not found.", 404));
    posts = rows.map(post => {
      return {
        ...post.dataValues,
        hasLiked: hasLiked(post.dataValues.likes, req.user.id),
        likes: post.dataValues.likes.length,
        comments: post.dataValues.comments.length
      }
    });
    res.json({
      data: {
        count,
        posts,
        currentPage,
        totalPages
      }
    });
  } catch (err) {
    return next(new HttpError('Something went wrong. Please try again.', 500));
  }
};

/**
 * POST: Create a comment
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 * @returns created Comment
 */
const commentOnAPost = async (req, res, next) => {
  // Destructuring
  const { pid } = req.params;
  const { commentText } = req.body;

  // Does post exist by provided id
  let post;
  try {
    post = await Post.findByPk(parseInt(pid));
    if (!post) {
      return next(new HttpError('There is no post by provided id', 404));
    }
  } catch (err) {
    return next(new HttpError('Something went wrong. Please try again.', 500));
  }

  // Validation comment text, 
  // comment text must be provided to create a comment
  const error = validationResult(req);
  const errMessage = reqValidation(error);
  if (errMessage) return next(new HttpError(errMessage, 400));

  // Creat a comment
  let comment;
  try {
    comment = await Comment.create({
      commentText: commentText,
      postId: parseInt(pid),
      userId: req.user.id
    });
  } catch (err) {
    return next(new HttpError('Something went wrong. Please try again.', 500));
  }

  comment = {
    id: comment.id,
    commentText: comment.commentText,
    createdAt: comment.createdAt
  }

  res.status(201).json({
    data: {
      comment
    }
  });
};

/**
 * GET: Get all comments of a post
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 * @returns list of comments of a post
 */
const getCommentsOfAPost = async (req, res, next) => {
  // Destructuring
  const { pid } = req.query;

  // Does post exist by provided id
  let post;
  try {
    post = await Post.findByPk(parseInt(pid), { attributes: ['id'] });
    if (!post) {
      return next(new HttpError('There is no post by provided id', 404));
    }
  } catch (err) {
    return next(new HttpError('Something went wrong. Please try again.', 500));
  }

  // Destructuring
  let { page, size } = req.query;
  
  // Get comments limit and offset
  if (page === 0 || page === undefined) page = 1;
  if (!size) size = 12;
  const { limit, offset } = getPagination(page, size);

  // Fetching all comments of a post
  try {
    const comments = await Comment.findAndCountAll({
      where: { postId: parseInt(pid) },
      attributes: { exclude: ['updatedAt', 'postId', 'userId'] },
      include: {
        model: User,
        attributes: ['id', 'username', 'profilePhotoUrl']
      },
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });
    const { count, rows, currentPage, totalPages } = getPagingData(comments, page, limit);
    if (count <= 0) return next(new HttpError("Comments not found.", 404));
    res.json({
      data: {
        count,
        comments: rows,
        currentPage,
        totalPages
      }
    });
  } catch (err) {
    return next(new HttpError('Something went wrong. Please try again.', 500));
  }
};

const getLikesOfAPost = async (req, res, next) => {
  // Destructuring
  const { pid } = req.query;

  // Does post exist by provided id
  let post;
  try {
    post = await Post.findByPk(parseInt(pid), { attributes: ['id'] });
    if (!post) {
      return next(new HttpError('There is no post by provided id', 404));
    }
  } catch (err) {
    return next(new HttpError('Something went wrong. Please try again.', 500));
  }

  // Destructuring
  let { page, size } = req.query;

  // Get likes limit and offset
  if (page === 0 || page === undefined) page = 1;
  if (!size) size = 15;
  const { limit, offset } = getPagination(page, size);

  // Fetching all likers of a post
  try {
    const likers = await Like.findAndCountAll({
      where: { postId: parseInt(pid) },
      attributes: { exclude: ['updatedAt', 'postId', 'userId'] },
      include: {
        model: User,
        attributes: ['id', 'username', 'fullname', 'profilePhotoUrl']
      },
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });
    const { count, rows, currentPage, totalPages } = getPagingData(likers, page, limit);
    if (count <= 0) return next(new HttpError("Likes not found.", 404));
    res.json({
      data: {
        count,
        likes: rows,
        currentPage,
        totalPages
      }
    });
  } catch (err) {
    return next(new HttpError('Something went wrong. Please try again.', 500));
  }
};

/**
 * POST: Like or Unlike a post
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 * @returns a data object that show the status of like = 1 or unLike = 0
 */
const likeOrUnlikeAPost = async (req, res, next) => {
  // Destructuring
  const { pid } = req.params;

  // Does post exist by provided id
  let post;
  try {
    post = await Post.findByPk(parseInt(pid));
    if (!post) {
      return next(new HttpError('There is no post by provided id', 404));
    }
  } catch (err) {
    return next(new HttpError('Something went wrong. Please try again.', 500));
  }

  // Like or Unlike a post
  let likePost;
  try {
    likePost = await Like.findOne({
      where: {
        postId: parseInt(pid),
        userId: req.user.id
      }
    });
  } catch (err) {
    return next(new HttpError('Something went wrong. Please try again.', 500));
  }

  // This post has been liked
  if (likePost) {
    // Unlike the post
    try {
      await Like.destroy({
        where: {
          postId: parseInt(pid),
          userId: req.user.id
        }
      });
      res.status(200).json({
        hasLiked: false
      });
    } catch (err) {
      return next(new HttpError('Something went wrong. Please try again.', 500));
    }
  }
  // This post hasn't been liked yet
  else {
    try {
      // Like the post
      likePost = await Like.create({
        postId: parseInt(pid),
        userId: req.user.id
      });

      res.status(201).json({
        hasLiked: true
      });
    } catch (err) {
      return next(new HttpError('Something went wrong. Please try again.', 500));
    }
  }
};

module.exports = {
  getPosts,
  createPost,
  commentOnAPost,
  getCommentsOfAPost,
  getLikesOfAPost,
  likeOrUnlikeAPost
}