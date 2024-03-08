const sequelize = require('../_helpers/sequelize.js');
const express = require('express');
const router = express.Router();
const Joi = require('joi');
const validateRequest = require('_middleware/validate-request');
const authorize = require('_middleware/authorize')
const Role = require('_helpers/role');
const planService = require('./plan.service');
const transactionService = require('../transactions/transaction.service');
const categoryService = require('../categories/category.service');

// routes
router.get('/', authorize(), getAll);
router.get('/:id', authorize(), getById);
router.post('/', authorize(), create);
router.post('/copy', authorize(), copyPlanAmounts);
router.put('/:id', authorize(), update);
router.delete('/:id', authorize(), _delete);

module.exports = router;

function getAll(req, res, next) {

    planService.getAll(req.user.id)
        .then(plans => res.json(plans))
        .catch(next);
}



function getById(req, res, next) {
 planService.getById(req.params.id, Number(req.user.id))
        .then(
            plan => {
                if (!plan) {
                    return res.sendStatus(404)
                }
                res.json(plan) 
            })
        .catch(next);
}


function create(req, res, next) {
    /* This function handles updates of existing plans as well as creating new ones
        It also handles the updates of category_titles
    */

    let category = req.body.category
    let plan = category.CategoryPlan
    plan.accountId = req.user.id
    if (req.body.category.CategoryPlan.id == null) {
        // If no plan exists, create one and also update the category_title

            return sequelize.transaction(t => {
              return Promise.all([
                    planService.create(plan, {transaction: t} ),
                    categoryService.update(category.id, category , {transaction: t} )
               ])

            }).then(transaction => {
                        res.json(plan);
              // Transaction has been committed
            }).catch(err => {
                  console.log('catch err', err)
                // Transaction has been rolled back
            });


    }else {
        // If a plan does exists, update it and the category_title

            return sequelize.transaction(t => {
              return Promise.all([
                    planService.update(plan.id, plan, {transaction: t} ),
                    categoryService.update(category.id, category , {transaction: t} )
               ])

            }).then(transaction => {
                        res.json(plan);
              // Transaction has been committed
            }).catch(err => {
                  console.log('catch err', err)
                // Transaction has been rolled back
            });

    }

}





function copyPlanAmounts(req, res, next) {
    
    planService.getLastMonthsPlans(req.user.id, req.body.activeMonthYear)
    .then(plans => {

            return sequelize.transaction(t => {

              // chain all your queries here. make sure you return them.
              return Promise.all([
                    plans.map((plan) => {
                            plan.id = null
                            plan.accountId = req.user.id
                            plan.categoryId
                            plan.planAmount
                            plan.created = req.body.activeMonthYear
                            //return console.log('map the plans', plan)
                            return planService.create(plan, {transaction: t} );  
                        })
               ])

            }).then(transaction => {
                        res.json(transaction);
              
              // Transaction has been committed
              // result is whatever the result of the promise chain returned to the transaction callback
            }).catch(err => {
                  console.log('catch err', err)
                // Transaction has been rolled back
              // err is whatever rejected the promise chain returned to the transaction callback
            });





    })
    .catch(next)

}










function update(req, res, next) {
    planService.getById(req.params.id, req.user.id)
        .then(
            plan => {
                if (!plan) {
                    return res.sendStatus(404)
                }
                if (req.user.id !== plan.accountId && req.user.role !== Role.Admin){
                    return res.status(401).json({ message: 'Unauthorized' });
                }
                planService.update(req.params.id, req.body)
                    .then(plan => res.json(plan))
                    .catch(next);
                })
        .catch(next);
}


function _delete(req, res, next) {

    planService.getById(req.params.id, req.user.id)
        .then(
            plan => {
                if (!plan) {
                    return res.sendStatus(404)
                }
                // users can only delete their own categories 
                if (req.user.id !== plan.accountId && req.user.role !== Role.Admin){
                    return res.status(401).json({ message: 'Unauthorized' });
                }

                planService.delete(req.params.id)
                    .then(() => res.json({ message: 'Category deleted successfully' }))
                    .catch(next);
                })
}