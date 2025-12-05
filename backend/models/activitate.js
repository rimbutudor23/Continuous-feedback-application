"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Activitate extends Model {
    static associate(models) {
      this.belongsTo(models.Profil, {
        foreignKey: "profesorId",
        as: "profesor",
      });

      this.belongsTo(models.Cod, {
        foreignKey: "codId",
        as: "cod",
      });

      this.hasMany(models.Feedback, {
        foreignKey: "activitateId",
        as: "feedbackuri",
      });

      this.hasMany(models.Participare, {
        foreignKey: "activitateId",
        as: "participari",
      });
    }
  }

  Activitate.init(
    {
      activitateId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      profesorId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      codId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      titlu: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      descriere: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      oraInceput: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      oraSfarsit: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      accesibilDeLa: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      accesibilPanaLa: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "Activitate",
      tableName: "activitate",
      timestamps: true,
    }
  );

  return Activitate;
};
