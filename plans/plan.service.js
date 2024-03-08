const config = require('config.json');
const { QueryTypes, Op, Sequelize } = require('sequelize');
const db = require('_helpers/db');

module.exports = {
    getAll,
    getById,
    getLastMonthsPlans,
    create,
    update,
    delete: _delete
};



async function getAll() {
    const plans = await db.Plan.findAll();
    return plans.map(x => basicDetails(x));
}

async function getLastMonthsPlans(userId, activeMonthYear) {
 
    const activeDate = activeMonthYear + '-01'

    const plans = await db.sequelize.query(
        "SELECT p1.id, p1.categoryId, p1.planAmount, p1.created FROM plans AS p1 WHERE `created` BETWEEN DATE_FORMAT(? - INTERVAL 1 MONTH, '%Y-%m-01 00:00:00') AND DATE_FORMAT(LAST_DAY(? - INTERVAL 1 MONTH), '%Y-%m-%d 23:59:59') AND NOT EXISTS (SELECT 1 FROM plans AS p2 WHERE p2.created = ? AND p1.categoryId = p2.categoryId);",
         { 
            replacements: [activeDate, activeDate, activeDate],
            type: QueryTypes.SELECT,
            required: false
        }
    );

    return plans.map(x => basicDetails(x));
}

async function getById(id) {
    const plan = await getPlan(id);
    return basicDetails(plan);
}

async function create(params) {
    const plan = new db.Plan(params);    
    await plan.save();

    return basicDetails(plan);
}

async function update(id, params) {
    const plan = await getPlan(id);

    // copy params to plan and save
    Object.assign(plan, params);
    plan.updated = Date.now();
    await plan.save();
    return basicDetails(plan);
}



async function _delete(id) {
    const plan = await getPlan(id);
    await plan.destroy();
}



// helper functions

async function getPlan(id) {
    const plan = await db.Plan.findByPk(id);
    if (!plan) throw 'Plan not found';
    return plan;
}



function basicDetails(plan) {
    const { id, accountId, categoryId, planAmount, PlanCategory} = plan;
    return { id, accountId, categoryId, planAmount, PlanCategory };
}
