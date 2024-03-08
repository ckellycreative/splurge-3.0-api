const config = require('config.json');
const { Op } = require('sequelize');
const db = require('_helpers/db');
const { Sequelize } = require('sequelize');

module.exports = {
    getAll,
    getAllChildren,
    getById,
    create,
    bulkCreate,
    update,
    delete: _delete
};


async function getAll(bankId, catId, limit, userId) {

 
    var mainWhereClause = () => {
        if(bankId == 0 && catId == 0 || bankId == 0 && catId != 0) {
            return { accountId: userId, parentId: null }
        }else if(bankId != 0 && catId == 0 || bankId != 0 && catId != 0) {
           return  { accountId: userId, [Op.or] : [ {categoryId:bankId}, {categoryId:catId}] }
        }
    }

    var childWhereClause = () => {
        if (catId != 0) {
            return {[Op.or] : [ {categoryId:bankId}, {categoryId:catId}]} 
        }
    }


    const transactions = await db.Transaction.findAndCountAll({ 
        where: mainWhereClause(), 
        limit: parseInt(limit),
        offset: 0,
        order: [[ 'transaction_date', 'DESC']] ,  
        include: [
            db.Category, 
            {   
                model: db.Transaction, 
                as: 'ParentTransaction', 
                include: [{model: db.Transaction, as: 'ChildTransactions'}, db.Category]
            },
            { 
                model: db.Transaction, 
                as: 'ChildTransactions', 
                where: childWhereClause(),
                include: {model: db.Category, as: 'category'}
            },
            

        ] 
    });
    return {count: transactions.count, transactions: transactions.rows.map(x => basicDetails(x))};
}


async function getAllChildren(id) {
    const transactions = await db.Transaction.findAll({ 
        where: { parentId: id }
    });
    return transactions.map(x => basicDetails(x));
}

async function getById(id, userId) {
    const transaction = await getTransaction(id);
    return basicDetails(transaction);
}

async function create(params) {
    const transaction = new db.Transaction(params);
    // save transaction
    await transaction.save();

    return basicDetails(transaction);
}

async function bulkCreate(params) {
    const transactions = await db.Transaction.bulkCreate(params, {updateOnDuplicate: ['reconcile', 'categoryId']});
    return basicDetails(transactions);
}

async function update(id, params) {
    const transaction = await getTransaction(id);

    // copy params to transaction and save
    Object.assign(transaction, params);
    transaction.updated = Date.now();
    await transaction.save();

    //return basicDetails(transaction);
}

async function _delete(id) {
    const transaction = await getTransaction(id);
    await transaction.destroy();
}

// helper functions

async function getTransaction(id) {
    const transaction = await db.Transaction.findByPk(id);
    if (!transaction) throw 'Transaction not found';
    return transaction;
}


function basicDetails(transaction) {
    const { account, ChildTransactions, ParentTransaction, parentId, category, id, transaction_date, transaction_description, debit, credit, accountId, categoryId, reconcile } = transaction;
    return { account, ChildTransactions, ParentTransaction, parentId, category, id, transaction_date, transaction_description, debit, credit, accountId, categoryId, reconcile };
}
