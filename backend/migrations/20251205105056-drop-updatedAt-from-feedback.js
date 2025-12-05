"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.removeColumn("feedback", "updatedAt");
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn("feedback", "updatedAt", {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.fn("NOW"),
    });
  },
};
