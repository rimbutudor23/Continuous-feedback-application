"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface
      .removeConstraint("cod", "cod_continut_key")
      .catch(() => null);

    await queryInterface.addConstraint("cod", {
      fields: ["profesorId", "continut"],
      type: "unique",
      name: "uniq_cod_profesor_continut",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeConstraint("cod", "uniq_cod_profesor_continut");

    await queryInterface.addConstraint("cod", {
      fields: ["continut"],
      type: "unique",
      name: "cod_continut_key",
    });
  },
};
