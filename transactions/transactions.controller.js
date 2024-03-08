const sequelize = require('../_helpers/sequelize.js');
const express = require('express');
const router = express.Router();
const Joi = require('joi');
const validateRequest = require('_middleware/validate-request');
const authorize = require('_middleware/authorize')
const Role = require('_helpers/role');
const transactionService = require('./transaction.service');
const categoryService = require('../categories/category.service');

// routes
router.get('/', authorize(), getAll);
router.get('/:id', authorize(), getById);
router.get('/account/:bankId', authorize(), getAll);
router.post('/', authorize(), create);
router.post('/bulkCreate', authorize(), bulkCreate);
router.put('/:id', authorize(), update);
router.delete('/:id', authorize(), _delete);

module.exports = router;

function getAll(req, res, next) {
    transactionService.getAll(req.params.bankId, req.query.category, req.query.limit, req.user.id)
        .then(transactions => res.json(transactions))
        .catch(next);
}


function getById(req, res, next) {

    // users can only get their own transactions 
    if (Number(req.params.id) !== req.user.id ) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    transactionService.getById(req.params.id, )
        .then(
            transaction => {
                if (!transaction) {
                    return res.sendStatus(404)
                }
                res.json(transaction) 
            })
        .catch(next);
}


function create(req, res, next) {

    // add userId to the new transaction
    req.body.accountId = req.user.id;

    const childTransactions = req.body.ChildTransactions;

    return sequelize.transaction(t => {

      // chain all your queries here. make sure you return them.
      return Promise.all([
            transactionService.create(req.body, {transaction: t})
            .then(transaction => {                
                let parentId = transaction.id;
                childTransactions.map((child, transaction) => {
                    child.accountId = req.user.id;
                    child.parentId = parentId;
                    return transactionService.create(child, {transaction: t} );  
                })
         }),
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

}


//Used for updating parent/child transactions
function bulkCreate(req, res, next) {

    return sequelize.transaction(t => {

      // chain all your queries here. make sure you return them.
      return Promise.all([
                 transactionService.bulkCreate(req.body, {transaction: t} ) 
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


}


function update(req, res, next) {

    transactionService.getById(req.body.id)
        .then(
            transaction => {
                if (!transaction) {
                    return res.sendStatus(404)
                }
                // users can get their own transaction and admins can get any transaction
                if (req.user.id !== transaction.accountId && req.user.role !== Role.Admin){
                    return res.status(401).json({ message: 'Unauthorized' });
                }

                return sequelize.transaction(t => {                  

                  // chain all your queries here. make sure you return them.
                  return Promise.all([
                        transactionService.update(req.body.id, req.body, {transaction: t})
                        .then(transaction => {
                            req.body.ChildTransactions.map((child, transaction) => {
                                return transactionService.update(child.id, child, {transaction: t} );  
                            })
                     }),
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

            }
        );
}

function _delete(req, res, next) {

    transactionService.getById(req.params.id)
         .then(
            transaction => {
                if (!transaction) {
                    return res.sendStatus(404)
                }
               // users can only delete their own transactions 
                if (req.user.id !== transaction.accountId && req.user.role !== Role.Admin){
                    return res.status(401).json({ message: 'Unauthorized' });
                }

                return sequelize.transaction(t => {

                    // chain all your queries here. make sure you return them.
                    return Promise.all([
                        transactionService.delete(transaction.id, {transaction: t} ),
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

            }
        );

}





