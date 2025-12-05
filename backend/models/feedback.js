"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Feedback extends Model {
    static associate(models) {
      this.belongsTo(models.Activitate, {
        foreignKey: "activitateId",
        as: "activitate",
      });
    }
  }

  Feedback.init(
    {
      feedbackId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      activitateId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      emoticon: {
        type: DataTypes.SMALLINT,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "Feedback",
      tableName: "feedback",
      timestamps: true,
      updatedAt: false,
    }
  );

  return Feedback;
};
