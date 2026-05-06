#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { initDatabase, resolveDatabaseProvider } = require("../runtime/db");
const { getCliOption } = require("../runtime/seedDir");

function csvCell(value) {
  if (value === null || value === undefined) {
    return "";
  }

  const asText = String(value);
  if (!/[",\n\r]/.test(asText)) {
    return asText;
  }

  return `"${asText.replace(/"/g, "\"\"")}"`;
}

function writeCsv(filePath, rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    fs.writeFileSync(filePath, "", "utf8");
    return;
  }

  const headers = Object.keys(rows[0]);
  const lines = [headers.map(csvCell).join(",")];
  for (const row of rows) {
    lines.push(headers.map((header) => csvCell(row[header])).join(","));
  }
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`, "utf8");
}

function parseTableList(value) {
  if (!value || !value.trim()) {
    return null;
  }
  return value
    .split(",")
    .map((tableName) => tableName.trim())
    .filter(Boolean);
}

function printHelp() {
  console.log(`Export database tables to CSV files.

Usage:
  npm run export:csv -- [--db <path>] [--out-dir <path>] [--tables users,orders]

Options:
  --db       Path to sqlite database file (default: data/app.db; sqlite only)
  --out-dir  Output directory for CSV files (default: data/csv-export)
  --tables   Comma-separated list of tables to export (default: all tables)
  --help     Show this help message
`);
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--help")) {
    printHelp();
    return;
  }

  const projectRoot = path.resolve(__dirname, "../..");
  const dbArg = getCliOption(argv, "--db");
  const outDirArg = getCliOption(argv, "--out-dir");
  const tablesArg = getCliOption(argv, "--tables");
  const provider = resolveDatabaseProvider();

  const outDir = path.resolve(projectRoot, outDirArg || path.join("data", "csv-export"));
  const requestedTables = parseTableList(tablesArg);

  if (dbArg && provider !== "sqlite") {
    throw new Error("--db is only supported when DATABASE_PROVIDER=sqlite.");
  }

  let dbPath = null;
  if (provider === "sqlite") {
    dbPath = path.resolve(projectRoot, dbArg || path.join("data", "app.db"));
    if (!fs.existsSync(dbPath)) {
      throw new Error(`Database file not found: ${dbPath}`);
    }
  }

  fs.mkdirSync(outDir, { recursive: true });

  const db = await initDatabase(projectRoot, {
    initializeSchema: false,
    ...(dbPath ? { dbPath, readonly: true, fileMustExist: true } : {}),
  });

  try {
    const availableTables = await db.listTables();
    if (availableTables.length === 0) {
      console.log("No tables found to export.");
      return;
    }

    const selectedTables = requestedTables || availableTables;
    const missingTables = selectedTables.filter((tableName) => !availableTables.includes(tableName));
    if (missingTables.length > 0) {
      throw new Error(`Unknown table(s): ${missingTables.join(", ")}`);
    }

    for (const tableName of selectedTables) {
      const rows = await db.all(`SELECT * FROM "${tableName}"`);
      const csvPath = path.join(outDir, `${tableName}.csv`);
      writeCsv(csvPath, rows);
      console.log(`Wrote ${tableName}.csv (${rows.length} rows)`);
    }

    console.log(`\nCSV export complete: ${outDir}`);
  } finally {
    await db.close();
  }
}

main().catch((error) => {
  console.error(error.message || String(error));
  process.exit(1);
});
