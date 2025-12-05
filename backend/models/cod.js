"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Cod extends Model {
    static associate(models) {
      this.belongsTo(models.Profil, {
        foreignKey: "profesorId",
        as: "profesor",
      });

      this.hasMany(models.Activitate, {
        foreignKey: "codId",
        as: "activitati",
      });
    }
  }

  Cod.init(
    {
      codId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      continut: {
        type: DataTypes.STRING(20),
        allowNull: false,
      },
      profesorId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      esteAleatoriu: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: "Cod",
      tableName: "cod",
      timestamps: true,
    }
  );

  return Cod;
};
