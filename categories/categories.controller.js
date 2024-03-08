const sequelize = require('../_helpers/sequelize.js');
const express = require('express');
const router = express.Router();
const Joi = require('joi');
const validateRequest = require('_middleware/validate-request');
const authorize = require('_middleware/authorize')
const Role = require('_helpers/role');
const categoryService = require('./category.service');
const transactionService = require('../transactions/transaction.service');
const planService = require('../plans/plan.service');

// routes
router.get('/', authorize(), getAll);
router.get('/reports/', authorize(), getAllWithTotalByDate);
router.get('/cashTrackingAccounts', authorize(), getCashTrackingAccountsWithTotals);
router.get('/:id', authorize(), getById);
router.post('/', authorize(), create);
router.post('/createBankAccountCategory', authorize(), createBankAccountCategory);
router.put('/:id', authorize(), update);
router.delete('/:id', authorize(), _delete);

module.exports = router;

function getAll(req, res, next) {

    categoryService.getAll(req.user.id)
        .then(categories => res.json(categories))
        .catch(next);
}



function getAllWithTotalByDate(req, res, next) {    
    categoryService.getAllWithTotalByDate(req.query.startDate, req.query.endDate, req.user.id)
        .then(categories => res.json(categories))
        .catch(next);
}



function getCashTrackingAccountsWithTotals(req, res, next) {    
    categoryService.getCashTrackingAccountsWithTotals(req.user.id, req.query.date)
        .then(categories => res.json(categories))
        .catch(next);
}



function getById(req, res, next) {
 categoryService.getById(req.params.id, Number(req.user.id))
        .then(
            category => {
                if (!category) {
                    return res.sendStatus(404)
                }
                res.json(category) 
            })
        .catch(next);
}





function create(req, res, next) {

    // add userId to the new transaction
    req.body.accountId = req.user.id;

    return sequelize.transaction(t => {

      // chain all your queries here. make sure you return them.
      return Promise.all([
            categoryService.create(req.body, {category: t})
            .then(category => {                
                planService.create({accountId:req.body.accountId, categoryId: category.id, planAmount:0 })
         }),
       ])

    }).then(category => {
                res.json(category);
      
      // Transaction has been committed
      // result is whatever the result of the promise chain returned to the transaction callback
    }).catch(err => {
          console.log('catch err', err)
        // Transaction has been rolled back
      // err is whatever rejected the promise chain returned to the transaction callback
    });

}














function createBankAccountCategory(req, res, next) {
    // add userId to the new category
    req.body.accountId = req.user.id;
    categoryService.create(req.body)    
    .then(category => {
        return sequelize.transaction(t => {
            // chain all your queries here. make sure you return them.
            return Promise.all([
                categoryService.getOpeningBalanceCategory(req.user.id, {category: t})
                .then(obc => {
                    // Set up the  transactions needed for an Opening Balance
                        const d = new Date();
                        let dateFormat = d.getFullYear() + '-' + (d.getMonth()+1) + '-' + d.getDate();
                        const parentTransaction = {
                            id: null,
                            accountId: req.user.id,
                            categoryId: category.id,
                            transaction_date: dateFormat,
                            transaction_description: 'Opening Balance-'+req.body.category_title,
                            debit: 0,
                            credit: req.body.openingBalance,
                            parentId: null
                        }
     
                        return transactionService.create(parentTransaction, {category: t})
                        .then(transaction => {
                            const childransaction = {
                                id: null,
                                accountId: req.user.id,
                                categoryId: obc.id,
                                transaction_date: dateFormat,
                                transaction_description: 'Opening Balance-'+req.body.category_title,
                                debit: req.body.openingBalance,
                                credit: 0,
                                parentId: transaction.id
                            }                        
                            return transactionService.create(childransaction, {category: t} );  
                        })
                }),
            ])
        }).then(category => {
                res.json(category);
      
        // Transaction has been committed
        // result is whatever the result of the promise chain returned to the transaction callback
        }).catch(err => {
          console.log('catch err', err)
        // Transaction has been rolled back
        // err is whatever rejected the promise chain returned to the transaction callback
        });



    }).catch(next);



}



function update(req, res, next) {
    categoryService.getById(req.params.id, req.user.id)
        .then(
            category => {
                if (!category) {
                    return res.sendStatus(404)
                }
                if (req.user.id !== category.accountId && req.user.role !== Role.Admin){
                    return res.status(401).json({ message: 'Unauthorized' });
                }
                categoryService.update(req.params.id, req.body)
                    .then(category => res.json(category))
                    .catch(next);
                })
        .catch(next);
}


function _delete(req, res, next) {

    categoryService.getById(req.params.id, req.user.id)
        .then(
            category => {
                if (!category) {
                    return res.sendStatus(404)
                }
                // users can only delete their own categories 
                if (req.user.id !== category.accountId && req.user.role !== Role.Admin){
                    return res.status(401).json({ message: 'Unauthorized' });
                }

                categoryService.delete(req.params.id)
                    .then(() => res.json({ message: 'Category deleted successfully' }))
                    .catch(next);
                })
}