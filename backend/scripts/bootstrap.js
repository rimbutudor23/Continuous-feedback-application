require("dotenv").config();

const { Client } = require("pg");
const { execSync } = require("child_process");
const path = require("path");

const DB_NAME = process.env.PGDATABASE || "continuous_feedback_app";
const DB_USER = process.env.PGUSER || "postgres";
const DB_PASS = process.env.PGPASSWORD || null;
const DB_HOST = process.env.PGHOST || "127.0.0.1";
const DB_PORT = process.env.PGPORT || 5432;

const SERVER_ENTRY = path.join(__dirname, "..", "src", "server.js");

async function ensureDatabase() {
  const client = new Client({
    user: DB_USER,
    password: DB_PASS,
    host: DB_HOST,
    port: DB_PORT,
    database: "postgres",
  });

  await client.connect();

  const res = await client.query(
    "SELECT 1 FROM pg_database WHERE datname = $1",
    [DB_NAME]
  );

  if (res.rowCount === 0) {
    console.log(`[DB] Database "${DB_NAME}" nu exista, o creez...`);
    await client.query(`CREATE DATABASE "${DB_NAME}"`);
    console.log(`[DB] Database "${DB_NAME}" a fost creata.`);
  } else {
    console.log(`[DB] Database "${DB_NAME}" exista deja.`);
  }

  await client.end();
}

async function runMigrations() {
  console.log("[DB] Rulez migrarile Sequelize...");
  execSync("npx sequelize-cli db:migrate", {
    stdio: "inherit",
  });
  console.log("[DB] Migrarile au fost aplicate.");
}

async function startServer() {
  console.log("[SERVER] Pornesc serverul...");
  require(SERVER_ENTRY);
}

(async () => {
  try {
    await ensureDatabase();
    await runMigrations();
    await startServer();
  } catch (err) {
    console.error("[BOOTSTRAP] Eroare la initializare:", err);
    process.exit(1);
  }
})();
