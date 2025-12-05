"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("profil", {
      profilId: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      numeUtilizator: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      tip: {
        type: Sequelize.ENUM("profesor", "student"),
        allowNull: false,
      },
      email: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true,
      },
      parola: {
        type: Sequelize.STRING(255),
        allowNull: false,
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

    await queryInterface.createTable("cod", {
      codId: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      continut: {
        type: Sequelize.STRING(20),
        allowNull: false,
        unique: true,
      },
      profesorId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "profil",
          key: "profilId",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      esteAleatoriu: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
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

    await queryInterface.createTable("activitate", {
      activitateId: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      profesorId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "profil",
          key: "profilId",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      codId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "cod",
          key: "codId",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      titlu: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      descriere: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      oraInceput: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      oraSfarsit: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      accesibilDeLa: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      accesibilPanaLa: {
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

    await queryInterface.createTable("feedback", {
      feedbackId: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
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
      emoticon: {
        type: Sequelize.SMALLINT,
        allowNull: false,
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
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("feedback");
    await queryInterface.dropTable("activitate");
    await queryInterface.dropTable("cod");
    await queryInterface.dropTable("profil");
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_profil_tip";'
    );
  },
};
