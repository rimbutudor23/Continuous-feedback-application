"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Participare extends Model {
    static associate(models) {
      this.belongsTo(models.Profil, {
        foreignKey: "studentId",
        as: "student",
      });

      this.belongsTo(models.Activitate, {
        foreignKey: "activitateId",
        as: "activitate",
      });
    }
  }

  Participare.init(
    {
      participareId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      studentId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      activitateId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      joinedAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      lastActionAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "Participare",
      tableName: "participare",
      timestamps: true,
    }
  );

  return Participare;
};
