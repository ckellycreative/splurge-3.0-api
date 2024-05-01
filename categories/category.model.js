const { DataTypes } = require('sequelize');

module.exports = model;

function model(sequelize) {
    const attributes = {
        accountId: { type: DataTypes.INTEGER, allowNull: false },
        category_title: { type: DataTypes.STRING, allowNull: false },
        category_type: { type: DataTypes.STRING, allowNull: false },
        parentId: { type: DataTypes.INTEGER, allowNull: true, defaultValue: null },
        optional: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        created: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        updated: { type: DataTypes.DATE },
        hidden: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 }
    };

    const options = {
        // disable default timestamp fields (createdAt and updatedAt)
        timestamps: false
    };

    return sequelize.define('categories', attributes, options);
}