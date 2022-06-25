// External libraries
const { DataTypes } = require('sequelize');

// Internal libraries
const sequelize = require('../util/mysql.db');

const User = sequelize.define('user', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false
  }, 
  username: {
    type: DataTypes.STRING(),
    allowNull: false,
    unique: true
  },
  email: {
    type: DataTypes.STRING(),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  fullname: {
    type: DataTypes.STRING(),
    allowNull: true
  },
  relationshipStatus: {
    type: DataTypes.STRING(),
    allowNull: true
  },
  profilePhotoUrl: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'defaultProfilePic.png'
  }
});

module.exports = User;