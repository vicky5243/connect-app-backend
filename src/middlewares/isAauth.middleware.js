// External libraries
const jwt = require('jsonwebtoken');

// Internal libraries
const User = require('../models/User.model');
const HttpError = require('../models/Http-Error.model');

const isAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization.replace('Bearer ', '');
    if (!token) throw new Error();
    
    const payload = jwt.verify(token, process.env.JWT_ACCESS_TOKEN_SECRET);

    // Finding user with the user id
    let user = await User.findByPk(parseInt(payload.aud), {
      attributes: {
        exclude: ['email', 'updatedAt']
      }
     });

    // There is no user exist in db with this username
    if (!user) throw new Error();

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return next(
        new HttpError("You're not authenticated. Please signup or signin.", 401)
      );
    }
    return next(
      new HttpError('Token Expired', 401)
    );
  }
};

module.exports = isAuth;