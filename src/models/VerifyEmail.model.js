// External libraries
const { DataTypes } = require('sequelize');

// Internal libraries
const sequelize = require('../util/mysql.db');

const VerifyEmail = sequelize.define('verify_email', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING(),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  code: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  attempts: {
    type: DataTypes.INTEGER,
    defaultValue: 3,
    allowNull: false
  }
});

module.exports = VerifyEmail;