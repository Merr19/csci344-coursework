const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");

const DEFAULT_USERS = [
  { username: "admin", password: "password" },
  { username: "user", password: "password" },
];

function initDatabase(projectRoot) {
  const dataDir = path.join(projectRoot, "data");
  fs.mkdirSync(dataDir, { recursive: true });

  const dbPath = getDatabasePath(projectRoot);
  const db = new Database(dbPath);

  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS shares (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      resource_type TEXT NOT NULL,
      resource_id INTEGER NOT NULL,
      shared_with_user_id INTEGER NOT NULL,
      shared_by_user_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(resource_type, resource_id, shared_with_user_id),
      FOREIGN KEY (shared_with_user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (shared_by_user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  const generatedSchemaPath = path.join(projectRoot, "generated", "schema.sql");
  if (fs.existsSync(generatedSchemaPath)) {
    db.exec(fs.readFileSync(generatedSchemaPath, "utf8"));
  }

  return db;
}

function recreateDatabase(projectRoot) {
  const dbPath = getDatabasePath(projectRoot);

  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }

  const db = initDatabase(projectRoot);
  createDefaultUsers(db);
  db.close();

  return dbPath;
}

function getDatabasePath(projectRoot) {
  const dataDir = path.join(projectRoot, "data");
  fs.mkdirSync(dataDir, { recursive: true });
  return process.env.DB_PATH || path.join(dataDir, "app.db");
}

function createDefaultUsers(db) {
  const existingUsernames = new Set(
    db.prepare("SELECT username FROM users").all().map((row) => row.username)
  );
  const insertUser = db.prepare("INSERT INTO users (username, password_hash) VALUES (?, ?)");

  const insertDefaults = db.transaction((users) => {
    for (const user of users) {
      if (existingUsernames.has(user.username)) {
        continue;
      }
      insertUser.run(user.username, bcrypt.hashSync(user.password, 10));
    }
  });

  insertDefaults(DEFAULT_USERS);
}

module.exports = {
  createDefaultUsers,
  initDatabase,
  recreateDatabase,
};
