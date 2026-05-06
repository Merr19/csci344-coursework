#!/usr/bin/env node
const path = require("path");
const { confirmDestructiveAction } = require("../runtime/confirm");
const { initDatabase } = require("../runtime/db");
const { resolveSeedDir } = require("../runtime/profileConfig");
const { seedDatabase } = require("../runtime/seedData");

const projectRoot = path.resolve(__dirname, "../..");

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

  const db = await initDatabase(projectRoot);

  try {
    const result = await seedDatabase(projectRoot, db, {
      seedDir: resolveSeedDir(argv),
      truncateExisting: true,
    });

    for (const line of result.lines) {
      console.log(line);
    }
    console.log("Seed complete.");
  } finally {
    await db.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
