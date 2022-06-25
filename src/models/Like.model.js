// External libraries
const { DataTypes } = require('sequelize');

// Internal libraries
const sequelize = require('../util/mysql.db');

const Like = sequelize.define('like', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false
  }
});

module.exports = Like;