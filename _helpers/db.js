const config = require('config.json');
const mysql = require('mysql2/promise');
const sequelize = require('./sequelize.js');

module.exports = db = {};

initialize();

async function initialize() {
    // create db if it doesn't already exist
    const { host, port, user, password, database } = config.database;
    const connection = await mysql.createConnection({ host, port, user, password });
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\`;`);
    db.sequelize = sequelize;

    // init models and add them to the exported db object
    db.Account = require('../accounts/account.model')(sequelize);
    db.RefreshToken = require('../accounts/refresh-token.model')(sequelize);
    db.Transaction = require('../transactions/transaction.model')(sequelize);
    db.Category = require('../categories/category.model')(sequelize);
    db.Plan = require('../plans/plan.model')(sequelize);

    // define relationships
    db.Account.hasMany(db.RefreshToken, { onDelete: 'CASCADE' });
    db.Account.hasMany(db.Transaction, { onDelete: 'CASCADE' });
    db.Account.hasMany(db.Category, { onDelete: 'CASCADE' });
    db.RefreshToken.belongsTo(db.Account);
    db.Transaction.belongsTo(db.Account, {foreignKey: 'accountId'});
    db.Transaction.belongsTo(db.Category, {foreignKey: 'categoryId'});
    db.Transaction.hasMany(db.Transaction, {as: 'ChildTransactions', foreignKey: 'parentId', onDelete: 'CASCADE'});
    db.Transaction.belongsTo(db.Transaction, {as: 'ParentTransaction', foreignKey: 'parentId', onDelete: 'CASCADE'});
    db.Category.belongsTo(db.Account);
    db.Category.hasMany(db.Category, {as: 'ChildCategory', foreignKey: 'parentId'});
    db.Category.hasMany(db.Transaction, {as: 'CategoryTransactions', foreignKey: 'categoryId', onDelete: 'CASCADE'});
    db.Category.hasMany(db.Plan, {as: 'PlanCategory', foreignKey: 'categoryId', onDelete: 'CASCADE'});
    db.Plan.belongsTo(db.Category, {foreignKey: 'categoryId'});
    db.Plan.belongsTo(db.Account, {foreignKey: 'accountId'});

    // sync all models with database
    await sequelize.sync();
}