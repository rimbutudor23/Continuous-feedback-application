"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Profil extends Model {
    static associate(models) {
      this.hasMany(models.Cod, {
        foreignKey: "profesorId",
        as: "coduri",
      });

      this.hasMany(models.Activitate, {
        foreignKey: "profesorId",
        as: "activitati",
      });

      this.hasMany(models.Participare, {
        foreignKey: "studentId",
        as: "participari",
      });
    }
  }

  Profil.init(
    {
      profilId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      numeUtilizator: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
      },
      tip: {
        type: DataTypes.ENUM("profesor", "student"),
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true,
        },
      },
      parola: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "Profil",
      tableName: "profil",
      timestamps: true,
    }
  );

  return Profil;
};
