"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addConstraint("profil", {
      fields: ["numeUtilizator"],
      type: "unique",
      name: "uniq_profil_numeUtilizator",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeConstraint(
      "profil",
      "uniq_profil_numeUtilizator"
    );
  },
};
