const config = require('config.json');
const { Sequelize } = require('sequelize');
const { user, password, database, host } = config.database;
const sequelize = new Sequelize(database, user, password, { host: host, dialect: 'mysql' });

module.exports = sequelize;