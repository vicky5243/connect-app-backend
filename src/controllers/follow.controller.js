// Internal libraries
const HttpError = require('../models/Http-Error.model');
const Follow = require('../models/Follow.model');
const User = require('../models/User.model');
const { getPagination, getPagingData } = require('../util/pagination');

/**
 * POST: Follow or Unfollow the user
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 * @returns a data object that show the status of follow = 1 or unFollow = 0
 */
const followOrUnfollowOfAnUser = async (req, res, next) => {
  // Destructuring
  const { uid } = req.params;

  if (parseInt(uid) === req.user.id) {
    return next(new HttpError("You can't follow yourself.", 400));
  }

  // Does user exist by provided id
  let user;
  try {
    user = await User.findByPk(parseInt(uid), { 
      attributes: ['id']
     });
    if (!user) {
      return next(new HttpError('There is no user by provided id', 404));
    }
  } catch (err) {
    return next(new HttpError('Something went wrong. Please try again.', 500));
  }

  // Follow or Unfollow a user
  let follows;
  try {
    follows = await Follow.findOne({
      where: {
        followerId: req.user.id,
        followeeId: parseInt(uid)
      }
    });
  } catch (err) {
    return next(new HttpError('Something went wrong. Please try again.', 500));
  }

  // This user has been followed by online user
  if (follows) {
    // Unfollow the user
    try {
      await Follow.destroy({
        where: {
          followerId: req.user.id,
          followeeId: parseInt(uid)
        }
      });
      res.status(200).json({
        message: 'You unfollowed this user.'
      });
    } catch (err) {
      return next(new HttpError('Something went wrong. Please try again.', 500));
    }
  }
  // This user hasn't been followed yet by online user
  else {
    try {
      // Follow the user
      follows = await Follow.create({
        followerId: req.user.id,
        followeeId: parseInt(uid)
      });

      res.status(201).json({
        message: 'You are Following this user.'
      });
    } catch (err) {
      return next(new HttpError('Something went wrong. Please try again.', 500));
    }
  }
};

/**
 * GET: Get all followers of an user
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 * @returns list of followers
 */
const getFollowersOfAnUser = async (req, res, next) => {
  // Destructuring
  const { uid } = req.params;

  // Does user exist by provided id
  let user;
  try {
    user = await User.findByPk(parseInt(uid), { 
      attributes: ['id']
     });
    if (!user) {
      return next(new HttpError('There is no user by provided id', 404));
    }
  } catch (err) {
    return next(new HttpError('Something went wrong. Please try again.', 500));
  }

  // Destructuring
  let { page, size } = req.query;
  
  // Get followers limit and offset
  if (page === 0 || page === undefined) page = 1;
  if (!size) size = 10;
  const { limit, offset } = getPagination(page, size);

  // Fetching all followers of an user
  try {
    let followers = await Follow.findAndCountAll({
      where: {
        followeeId: parseInt(uid)
      },
      attributes: ['followerId', 'followeeId'],
      limit,
      offset,
    });
    const { count, rows, currentPage, totalPages } = getPagingData(followers, page, limit);
    if (count <= 0) return next(new HttpError("Followers not found.", 404));
    res.json({
      data: {
        count,
        rows,
        currentPage,
        totalPages
      }
    });
  } catch (err) {
    return next(new HttpError('Something went wrong. Please try again.' +err, 500));
  }
};

/**
 * GET: Get all followees of an user
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 * @returns list of followees
 */
const getFolloweesOfAnUser = async (req, res, next) => {
  // Destructuring
  const { uid } = req.params;

  // Does user exist by provided id
  let user;
  try {
    user = await User.findByPk(parseInt(uid), { 
      attributes: ['id']
     });
    if (!user) {
      return next(new HttpError('There is no user by provided id', 404));
    }
  } catch (err) {
    return next(new HttpError('Something went wrong. Please try again.', 500));
  }

  // Destructuring
  let { page, size } = req.query;
  
  // Get followees limit and offset
  if (page === 0 || page === undefined) page = 1;
  if (!size) size = 10;
  const { limit, offset } = getPagination(page, size);

  // Fetching all followees of an user
  try {
    const followees = await Follow.findAndCountAll({
      where: {
        followerId: parseInt(uid)
      },
      include: {
        model: User,
        attributes: ['id', 'username', 'fullname', 'profilePhotoUrl'],
        as: 'followerId',
        required: false
      },
      limit,
      offset
    });
    const { count, rows, currentPage, totalPages } = getPagingData(followees, page, limit);
    if (count <= 0) return next(new HttpError("Following not found.", 404));
    res.json({
      data: {
        count,
        rows,
        currentPage,
        totalPages
      }
    });
  } catch (err) {
    return next(new HttpError('Something went wrong. Please try again.' + err, 500));
  }
};

module.exports = {
  followOrUnfollowOfAnUser,
  getFollowersOfAnUser,
  getFolloweesOfAnUser
}