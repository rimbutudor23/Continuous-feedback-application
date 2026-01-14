require("dotenv").config();

const { execSync } = require("child_process");
const path = require("path");

const SERVER_ENTRY = path.join(__dirname, "..", "src", "server.js");

async function runMigrations() {
  console.log("[DB] Rulez migrarile Sequelize...");
  try {
    const cmd = process.env.DATABASE_URL
      ? `npx sequelize-cli db:migrate --url "${process.env.DATABASE_URL}"`
      : `npx sequelize-cli db:migrate`;

    execSync(cmd, { stdio: "inherit" });
    console.log("[DB] Migrarile au fost aplicate cu succes.");
  } catch (error) {
    console.error(
      "[DB] Atentie: Migrarile au intampinat o eroare (sau sunt deja la zi).",
      error.message
    );
  }
}

async function startServer() {
  console.log("[SERVER] Pornesc serverul...");
  require(SERVER_ENTRY);
}

(async () => {
  try {
    await runMigrations();

    await startServer();
  } catch (err) {
    console.error("[BOOTSTRAP] Eroare critica la pornire:", err);
    process.exit(1);
  }
})();
