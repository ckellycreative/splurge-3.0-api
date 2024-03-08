const config = require('config.json');
const { QueryTypes, Op, Sequelize } = require('sequelize');
const db = require('_helpers/db');

module.exports = {
    getAll,
    getAllWithTotalByDate,
    getOpeningBalanceCategory,
    getCashTrackingAccountsWithTotals,
    getById,
    create,
    update,
    delete: _delete
};


//These getAll functions can be consolidated


async function getAll(userId) {
 
    const categories = await db.Category.findAll(
        {
            where: { accountId: userId, parentId: null },
            order: [[ 'category_title', 'ASC']] ,
            include: [
                {
                    model: db.Category, 
                    as: 'ChildCategory'
                }                    
            ]
        }
    );
    return categories.map(x => basicDetails(x));
}


async function getAllWithTotalByDate(startDate, endDate, userId) {
    const categories = await db.sequelize.query(
        "SELECT categories.id, categories.accountId, categories.category_title, categories.category_type, categories.parentId, ChildCategory.id as `ChildCategory.id`, ChildCategory.accountId as `ChildCategory.accountId`, ChildCategory.category_title as `ChildCategory.category_title`, ChildCategory.category_type as `ChildCategory.category_type`, ChildCategory.parentId as `ChildCategory.parentId`,  ChildCategory.hidden as `ChildCategory.hidden`, totalReportAmountDebit, totalReportAmountCredit, p.id as `CategoryPlan.id`, planAmount as `CategoryPlan.planAmount`, p.categoryId as `CategoryPlan.categoryId` FROM categories AS categories LEFT OUTER JOIN categories AS ChildCategory ON categories.id = ChildCategory.parentId LEFT OUTER JOIN ( SELECT transactions.categoryId, SUM(transactions.credit) as totalReportAmountCredit, SUM(transactions.debit) as totalReportAmountDebit FROM transactions WHERE transactions.transaction_date BETWEEN ? AND ? AND transactions.accountId=? GROUP BY transactions.categoryId ) AS t ON ChildCategory.id = t.categoryId LEFT OUTER JOIN ( SELECT plans.id, plans.planAmount, plans.categoryId FROM plans WHERE created BETWEEN ? AND ? GROUP BY plans.categoryId) AS p ON ChildCategory.id = p.categoryId WHERE categories.accountId = ? AND categories.parentId IS NULL ORDER BY categories.category_type, categories.category_title, ChildCategory.category_title ASC;",
         
         { 
            replacements: [startDate, endDate, userId, startDate, endDate, userId],
            type: QueryTypes.SELECT,
            nest: true,
            required: false
        }
    );
    return categories.map(x => basicDetails(x));
}

//"Account" in this context means cash/tracking Categories—not to be confused with the Account model for users
async function getCashTrackingAccountsWithTotals(userId, date) {
    const categories = await db.sequelize.query(
        "SELECT categories.id, categories.category_title, categories.category_type, SUM(transactions.credit - transactions.debit) as bankBalance FROM categories INNER JOIN transactions ON categories.id = transactions.categoryId WHERE categories.accountId=? AND categories.category_type='cash' AND transactions.transaction_date <= ? GROUP BY  categories.id, transactions.categoryId ORDER BY categories.category_title;",
         
         { 
            replacements: [userId, date],
            type: QueryTypes.SELECT,
            required: false
        }
    );
    return categories.map(x => basicDetails(x));
}

async function getById(id, userId) {
    const category = await db.Category.findOne(
        {
            where: {  id: id, accountId: userId, },
            include: [
                {
                    model: db.Transaction, 
                    as: 'CategoryTransactions'
                }                    
            ]
        }
    );
    return basicDetails(category);

}


async function create(params) {
    const category = new db.Category(params);    
    await category.save();

    return basicDetails(category);
}

async function update(id, params) {
    const category = await getCategory(id);

    // copy params to category and save
    Object.assign(category, params);
    category.updated = Date.now();
    await category.save();
    return basicDetails(category);
}



async function _delete(id) {
    const category = await getCategory(id);
    await category.destroy();
}



// helper functions

async function getCategory(id) {
    const category = await db.Category.findByPk(id);
    if (!category) throw 'Category not found';
    return category;
}

async function getOpeningBalanceCategory(id) {
    const category = await db.Category.findOne({
        where: {accountId: id, category_type: 'opening-balance'}
    });
    if (!category) throw 'Category not found';
    return basicDetails(category);
}




function basicDetails(category) {
    const { id, account_id, category_title, category_type, parentId, totalReportAmountCredit, totalReportAmountDebit, bankBalance, CategoryTransactions, ChildCategory, CategoryPlan  } = category;
    return { id, account_id, category_title, category_type, parentId, totalReportAmountCredit, totalReportAmountDebit, bankBalance, CategoryTransactions, ChildCategory, CategoryPlan  };
}
