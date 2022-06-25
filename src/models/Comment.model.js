// External libraries
const { DataTypes } = require('sequelize');

// Internal libraries
const sequelize = require('../util/mysql.db');

const Comment = sequelize.define('comment', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false
  }, 
  commentText: {
    type: DataTypes.STRING,
    allowNull: false
  }
});

module.exports = Comment;