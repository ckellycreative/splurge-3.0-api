const { DataTypes } = require('sequelize');

module.exports = model;

function model(sequelize) {
    const attributes = {
        accountId: { type: DataTypes.INTEGER, allowNull: false },
        transaction_date: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        transaction_description: { type: DataTypes.STRING, allowNull: true },
        debit: { type: DataTypes.DECIMAL(12,2), defaultValue: '0.00', allowNull: false },
        credit: { type: DataTypes.DECIMAL(12,2), defaultValue: '0.00', allowNull: false },
        categoryId: { type: DataTypes.INTEGER, allowNull: false },
        parentId: { type: DataTypes.INTEGER, allowNull: true },
        created: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        updated: { type: DataTypes.DATE },
        reconcile: { type: DataTypes.INTEGER, allowNull: false, defaultValue:0 },
    };

    const options = {
        // disable default timestamp fields (createdAt and updatedAt)
        timestamps: false
    };

    return sequelize.define('transaction', attributes, options);
}