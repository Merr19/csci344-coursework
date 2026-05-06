#!/usr/bin/env node
const path = require("path");
const { initDatabase } = require("../runtime/db");
const { resolveApiConfigPath, resolveSeedDir } = require("../runtime/profileConfig");
const { loadApiConfig } = require("../generator/config");
const { writeArtifacts } = require("../generator/artifacts");
const { isManagedDatabaseEmpty, seedDatabase } = require("../runtime/seedData");

const projectRoot = path.resolve(__dirname, "../..");

async function main() {
  const argv = process.argv.slice(2);
  const { absolutePath: configPath, relativePath: configRelativePath } = resolveApiConfigPath(projectRoot, argv);
  const config = loadApiConfig(configPath);
  const seedDir = resolveSeedDir(argv, config.meta?.seedDir || "data/sample-data");
  const shouldSeed = String(process.env.AUTO_SEED_ON_EMPTY || "true").trim().toLowerCase();

  writeArtifacts(projectRoot, config, {
    noSeed: true,
    seedDir,
  });

  const db = await initDatabase(projectRoot);

  try {
    const isEmpty = await isManagedDatabaseEmpty(projectRoot, db);
    if (!isEmpty) {
      console.log(
        `Activated ${configRelativePath} with seed directory ${seedDir}. Database already has data, so bootstrap seed was skipped.`
      );
      return;
    }

    if (shouldSeed === "false" || shouldSeed === "0" || shouldSeed === "off") {
      console.log(
        `Activated ${configRelativePath} with seed directory ${seedDir}. Database is empty, but AUTO_SEED_ON_EMPTY is disabled. Schema only.`
      );
      return;
    }

    const result = await seedDatabase(projectRoot, db, {
      seedDir,
      truncateExisting: false,
    });

    console.log(
      `Activated ${configRelativePath} and bootstrapped database from committed seed data in ${result.seedDir}.`
    );
    for (const line of result.lines) {
      console.log(line);
    }
  } finally {
    await db.close();
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
