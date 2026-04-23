#!/usr/bin/env node
/**
 * Loads data from generated seed CSV files directly into the local SQLite database.
 * Run `npm run generate`, then: npm run seed
 *
 * Expects a fresh database (e.g. after `npm run generate`) so auto-increment ids
 * match foreign-key values in the sample CSVs (1, 2, ... per table).
 */

const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const { confirmDestructiveAction } = require("../runtime/confirm");
const { initDatabase } = require("../runtime/db");
const { getCliOption, normalizeSeedDir } = require("../runtime/seedDir");

const projectRoot = path.resolve(__dirname, "../..");

function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cur += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
}

function parseCsvFile(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length < 2) {
    return [];
  }
  const headers = parseCsvLine(lines[0]).map((h) => h.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cells = parseCsvLine(lines[i]);
    const row = {};
    headers.forEach((h, j) => {
      row[h] = cells[j] !== undefined ? cells[j] : "";
    });
    rows.push(row);
  }
  return rows;
}

function coerceValue(field, raw) {
  const s = String(raw).trim();
  if (s === "") {
    return undefined;
  }
  const storageType = field.storageType || field.type;
  switch (storageType) {
    case "boolean": {
      const lower = s.toLowerCase();
      if (lower === "true" || s === "1") {
        return true;
      }
      if (lower === "false" || s === "0") {
        return false;
      }
      throw new Error(`Invalid boolean for ${field.name}: ${raw}`);
    }
    case "integer": {
      const n = parseInt(s, 10);
      if (!Number.isFinite(n)) {
        throw new Error(`Invalid integer for ${field.name}: ${raw}`);
      }
      return n;
    }
    case "number": {
      const x = parseFloat(s);
      if (!Number.isFinite(x)) {
        throw new Error(`Invalid number for ${field.name}: ${raw}`);
      }
      return x;
    }
    case "string":
    case "text":
    case "date":
    case "datetime":
    default:
      return s;
  }
}

function rowToBody(resource, row) {
  const body = {};
  for (const field of resource.fields) {
    if (!Object.prototype.hasOwnProperty.call(row, field.name)) {
      continue;
    }
    const raw = row[field.name];
    const value = coerceValue(field, raw);
    if (value === undefined) {
      if (field.required) {
        throw new Error(`Missing required field ${resource.type}.${field.name}`);
      }
      continue;
    }
    body[field.name] = value;
  }
  return body;
}

function normalizeValue(type, value) {
  if (value === undefined || value === null) {
    return null;
  }
  if (type === "boolean") {
    return value ? 1 : 0;
  }
  return value;
}

function findResource(config, resourceType) {
  return config.resources.find((r) => r.type === resourceType);
}

async function insertUsers(db, userRows, seedCol) {
  const preparedRows = [];
  for (const row of userRows) {
    const username = String(row.username || "").trim();
    const password = String(row.password || "");
    if (!username || !password) {
      throw new Error("Each row in users.csv must include username and password.");
    }
    preparedRows.push({
      username,
      passwordHash: await bcrypt.hash(password, 10),
      isSeedUser: String(row[seedCol] || "").trim().toLowerCase() === "yes",
    });
  }

  const adminUser = db.prepare("SELECT id, username FROM users WHERE username = ?").get("admin");
  const seedUser = adminUser
    ? { username: adminUser.username, isSeedUser: true }
    : preparedRows.find((row) => row.isSeedUser) || preparedRows[0];
  const userIdByUsername = new Map();
  const insertUser = db.prepare("INSERT INTO users (username, password_hash) VALUES (?, ?)");
  const updateUserPassword = db.prepare("UPDATE users SET password_hash = ? WHERE id = ?");
  const selectUser = db.prepare("SELECT id FROM users WHERE username = ?");
  const upsertUsers = db.transaction((rows) => {
    for (const row of rows) {
      const existing = selectUser.get(row.username);
      if (existing) {
        updateUserPassword.run(row.passwordHash, existing.id);
        userIdByUsername.set(row.username, Number(existing.id));
        continue;
      }

      const result = insertUser.run(row.username, row.passwordHash);
      userIdByUsername.set(row.username, Number(result.lastInsertRowid));
    }
  });

  upsertUsers(preparedRows);

  return {
    count: preparedRows.length,
    seedUser,
    seedUserId: adminUser ? Number(adminUser.id) : userIdByUsername.get(seedUser.username),
  };
}

function insertResourceRows(db, resource, rows, ownerId) {
  const fieldNames = resource.fields.map((field) => field.name);
  const insertFieldNames = resource.ownershipEnabled ? ["owner_id", ...fieldNames] : fieldNames;
  const placeholders = insertFieldNames.map(() => "?").join(", ");
  const insertRow = db.prepare(
    `INSERT INTO ${resource.tableName} (${insertFieldNames.join(", ")}) VALUES (${placeholders})`
  );

  const insertManyRows = db.transaction((inputRows) => {
    inputRows.forEach((row, index) => {
      const body = rowToBody(resource, row);
      const values = fieldNames.map((fieldName) => {
        const field = resource.fields.find((candidate) => candidate.name === fieldName);
        const storageType = field.storageType || field.type;
        return normalizeValue(storageType, body[fieldName]);
      });

      if (resource.ownershipEnabled) {
        values.unshift(ownerId);
      }

      try {
        insertRow.run(...values);
      } catch (err) {
        throw new Error(`Could not insert ${resource.type} row ${index + 1}: ${err.message}`);
      }
    });
  });

  insertManyRows(rows);
}

async function main() {
  const argv = process.argv.slice(2);
  const confirmed = await confirmDestructiveAction(
    argv,
    "Are you sure you want to replace all of the data?"
  );
  if (!confirmed) {
    console.log("Seed cancelled.");
    process.exit(0);
  }

  const configPath = path.join(projectRoot, "generated", "config.json");
  if (!fs.existsSync(configPath)) {
    console.error("Missing generated/config.json. Run `npm run generate` first.");
    process.exit(1);
  }

  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  const seedDir = normalizeSeedDir(getCliOption(argv, "--seed-dir"), config.meta?.seedDir || "data/sample-data");
  const orderPath = path.join(projectRoot, seedDir, "order.json");
  if (!fs.existsSync(orderPath)) {
    console.error(
      `Missing ${seedDir}/order.json. Run \`npm run generate\` (without --no-seed) first.`
    );
    process.exit(1);
  }

  const order = JSON.parse(fs.readFileSync(orderPath, "utf8"));

  const usersPath = path.join(projectRoot, seedDir, order.usersFile || "users.csv");
  const userRows = parseCsvFile(usersPath);
  if (userRows.length === 0) {
    console.error("No rows in users.csv.");
    process.exit(1);
  }

  const seedCol = order.seedUserColumn || "seed_as";
  const db = initDatabase(projectRoot);

  try {
    const { count, seedUser, seedUserId } = await insertUsers(db, userRows, seedCol);
    console.log(`Seeded ${count} user row(s) -> users`);

    for (const entry of order.resources) {
      const resource = findResource(config, entry.type);
      if (!resource) {
        console.warn(`Skipping unknown resource type ${entry.type} in order.json`);
        continue;
      }
      const csvPath = path.join(projectRoot, seedDir, entry.file);
      if (!fs.existsSync(csvPath)) {
        console.warn(`Missing ${entry.file}, skipping.`);
        continue;
      }

      const rows = parseCsvFile(csvPath);
      insertResourceRows(db, resource, rows, seedUserId);
      console.log(`Seeded ${rows.length} row(s) -> ${resource.path}`);
    }

    console.log(`Seed owner: ${seedUser.username}`);
    console.log("Seed complete.");
  } finally {
    db.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
