const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  model = sequelize.define('accounttasks', {
    accountId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: false,
      references: {
        model: 'accounts',
        key: 'id',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      }
    },
    taskId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: false
    }
  }, {
    sequelize,
    tableName: 'accounttasks',
    timestamps: false,
    noPrimaryKey: true,
    indexes: [
      {
        name: "accountId",
        using: "BTREE",
        fields: [
          { name: "accountId" },
        ]
      },
    ]
  });
  model.removeAttribute('id');
  return model;
};
