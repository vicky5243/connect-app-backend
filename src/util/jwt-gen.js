// External libraries
const JWT = require('jsonwebtoken');

// Internal libraries
const client = require('../util/redis.db');

const error = {};

const signAccessToken = userId => {
  return new Promise((resolve, reject) => {
    const payload = {};
    const secret = process.env.JWT_ACCESS_TOKEN_SECRET;
    const options = {
      expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRES_IN,
      issuer: process.env.JWT_ISSUER,
      audience: userId
    };
    JWT.sign(payload, secret, options, (err, token) => {
      if (err) {
        error.message = 'Internal server error.';
        error.code = 500;
        return reject(error);
      }
      resolve(token);
    });
  });
};

const signRefreshToken = userId => {
  return new Promise((resolve, reject) => {
    const payload = {};
    const secret = process.env.JWT_REFRESH_TOKEN_SECRET;
    const options = {
      expiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRES_IN,
      issuer: process.env.JWT_ISSUER,
      audience: userId
    };
    JWT.sign(payload, secret, options, (err, token) => {
      error.message = 'Internal server error.';
      error.code = 500;
      if (err) return reject(error);
      // Storing token in redis
      client.SETEX(userId, parseInt(process.env.JWT_REFRESH_TOKEN_EXPIRES_IN_SEC), token).then(() => {
        resolve(token);
      }).
      catch (err => {
        console.log(err)
        reject(error);
      });
    });
  });
};

const verifyRefreshToken = refreshToken => {
  return new Promise((resolve, reject) => {
    JWT.verify(refreshToken, process.env.JWT_REFRESH_TOKEN_SECRET, (err, payload) => {
      error.message = "You're not authenticated. Please signup or signin.";
      error.code = 401;
      if (err) {
        return reject(error);
      }
      const userId = payload.aud;
      // Retrieving token from redis
      client.GET(userId).then((result) => {
        if (refreshToken !== result) {
          return reject(error);
        }
        resolve(userId);
      }).catch((err) => {
        error.message = 'Internal server error.';
        error.code = 500;
        reject(error);
      });
    });
  });
};

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken
}