"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("participare", {
      participareId: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      studentId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "profil",
          key: "profilId",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      activitateId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "activitate",
          key: "activitateId",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      joinedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
      lastActionAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
    });

    await queryInterface.addConstraint("participare", {
      fields: ["studentId", "activitateId"],
      type: "unique",
      name: "uniq_participare_student_activitate",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("participare");
  },
};
