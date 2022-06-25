// External libraries
const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const cors = require('cors');
const morgan = require('morgan');

const path = require('path');
const fs = require('fs');

// Environment variables setup
require('dotenv').config();

// Internal libraries
const db = require('./src/util/mysql.db');
const client = require('./src/util/redis.db');
const auth_route = require('./src/routes/auth.route');
const post_route = require('./src/routes/post.route');
const follow_route = require('./src/routes/follow.route');
const user_route = require('./src/routes/user.route');
const HttpError = require('./src/models/Http-Error.model');
const User = require('./src/models/User.model');
const Post = require('./src/models/Post.model');
const Like = require('./src/models/Like.model');
const Comment = require('./src/models/Comment.model');
const Follow = require('./src/models/Follow.model');

const app = express();
const PORT = process.env.PORT;

// Middlewares configuration
app.use(cors());
app.use(bodyParser.json());
app.use(morgan('dev'));
app.use('/images/profile', express.static(path.join('images', 'profile')));
app.use('/images/posts', express.static(path.join('images', 'posts')));

// Routes configuration
app.use('/api', auth_route);
app.use('/api', post_route);
app.use('/api', follow_route);
app.use('/api', user_route);

// No route found
app.use((req, res, next) => {
	return next(new HttpError('This route has been broken :(', 500));
});

// Any error has been occurred in above routes
app.use((error, req, res, next) => {
  if (req.file && req.file.path) {
    fs.unlink(req.file.path, (err) => {
      if (err) res.status(500).json({
        error: {
          message: 'Something went wrong. Please try again.',
          code: 500
        }
      });
    });
  }
  if (res.headerSent) return next(error);
  if (error instanceof multer.MulterError) {
    let message = '';
    if (error.code === 'LIMIT_FILE_SIZE') {
      message = 'File size should not be excess to 5 MB. Please try again.';
    } else if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      message = 'Please provide a valid file.';
    }
    res.status(400).json({
      error: {
        message: message,
        code: 400
      }
    });
  } else {
    res.status(error.code).json({
      error: {
        message: error.message,
        code: error.code
      }
    });
  }
});

// Associations configuration
// Post
Post.belongsTo(User, {
  constraints: true,
  onDelete: 'CASCADE',
  foreignKey: {
    allowNull: false
  }
});
User.hasMany(Post);

// Comment
Comment.belongsTo(Post, {
  constraints: true,
  onDelete: 'CASCADE',
  foreignKey: {
    allowNull: false
  }
});
Post.hasMany(Comment);
Comment.belongsTo(User, {
  constraints: true,
  onDelete: 'CASCADE',
  foreignKey: {
    allowNull: false
  }
});
User.hasMany(Comment);

// Like
Like.belongsTo(Post, {
  constraints: true,
  onDelete: 'CASCADE',
  foreignKey: {
    allowNull: false
  }
});
Post.hasMany(Like);
Like.belongsTo(User, {
  constraints: true,
  onDelete: 'CASCADE',
  foreignKey: {
    allowNull: false
  }
});
User.hasMany(Like);

// Follow
Follow.belongsTo(User, {
  constraints: true,
  onDelete: 'CASCADE',
  foreignKey: {
    name: 'followerId',
    allowNull: false
  }
});

db
  .sync()
  .then(() => {
    return client.connect();
  })
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server is listening on port ${PORT}...`);
    });
  }).catch(err => {
    console.log('ERROR:', err);
  });