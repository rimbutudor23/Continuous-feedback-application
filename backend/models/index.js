"use strict";

const fs = require("fs");
const path = require("path");
const Sequelize = require("sequelize");
const process = require("process");
const basename = path.basename(__filename);
const env = process.env.NODE_ENV || "development";

let config = {};
try {
  const configPath = path.join(__dirname, "/../config/config.json");
  if (fs.existsSync(configPath)) {
    const allConfigs = require(configPath);
    config = allConfigs[env] || {};
  }
} catch (error) {
  console.warn(
    "[Sequelize] Warning: Could not load config.json (this is fine if using DATABASE_URL)."
  );
}

const db = {};
let sequelize;

console.log(`[Sequelize Init] Environment: ${env}`);

if (process.env.DATABASE_URL) {
  console.log(
    "[Sequelize Init] Connecting using DATABASE_URL (Neon/Production detected)"
  );
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: "postgres",
    protocol: "postgres",
    logging: false,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
  });
} else if (config.database && config.username) {
  console.log("[Sequelize Init] Connecting using config.json (Localhost)");
  sequelize = new Sequelize(
    config.database,
    config.username,
    config.password,
    config
  );
} else {
  console.error(
    "[Sequelize Init] CRITICAL: No DATABASE_URL and no valid config.json found!"
  );
}

fs.readdirSync(__dirname)
  .filter((file) => {
    return (
      file.indexOf(".") !== 0 &&
      file !== basename &&
      file.slice(-3) === ".js" &&
      file.indexOf(".test.js") === -1
    );
  })
  .forEach((file) => {
    const model = require(path.join(__dirname, file))(
      sequelize,
      Sequelize.DataTypes
    );
    db[model.name] = model;
  });

Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
