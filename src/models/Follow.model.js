// External libraries
const { DataTypes } = require('sequelize');

// Internal libraries
const sequelize = require('../util/mysql.db');

const Follow = sequelize.define('follow', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false
  }
});

module.exports = Follow;