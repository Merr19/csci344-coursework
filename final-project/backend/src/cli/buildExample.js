#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { confirmDestructiveAction } = require("../runtime/confirm");
const { loadApiConfig } = require("../generator/config");
const { writeArtifacts } = require("../generator/artifacts");
const { initDatabase, recreateDatabase } = require("../runtime/db");
const { seedDatabase } = require("../runtime/seedData");
const { getCliOption } = require("../runtime/seedDir");

async function main() {
  const argv = process.argv.slice(2);
  const exampleDirName = getCliOption(argv, "--dir") || process.env.npm_config_dir;
  if (!exampleDirName) {
    throw new Error("build:example requires --dir <example-name> (for example `npm run build:example -- --dir plants`).");
  }

  const projectRoot = path.resolve(__dirname, "../..");
  const exampleDir = path.join(projectRoot, "examples", exampleDirName);
  const configPath = path.join(exampleDir, "api.config.yaml");
  const seedDir = resolveExampleSeedDir(projectRoot, exampleDirName);
  const sourceSeedDir = path.join(projectRoot, seedDir);
  const rootConfigPath = path.join(projectRoot, "api.config.yaml");
  const rootSeedDir = path.join(projectRoot, "data", "sample-data");
  const imagesSourceDir = path.join(exampleDir, "images");
  const imagesTargetDir = path.join(projectRoot, "public", "student", "images", exampleDirName);

  if (!fs.existsSync(exampleDir) || !fs.statSync(exampleDir).isDirectory()) {
    throw new Error(`Example directory not found: examples/${exampleDirName}`);
  }
  if (!fs.existsSync(configPath)) {
    throw new Error(`Missing example config: examples/${exampleDirName}/api.config.yaml`);
  }

  const confirmed = await confirmDestructiveAction(
    argv,
    `Are you sure you want to rebuild the database from examples/${exampleDirName}?`
  );
  if (!confirmed) {
    console.log("Build example cancelled.");
    process.exit(0);
  }

  overwriteProjectDefaults(configPath, sourceSeedDir, rootConfigPath, rootSeedDir);
  console.log("Updated root api.config.yaml and data/sample-data from the selected example.");

  const config = loadApiConfig(configPath);

  console.log(`Validated examples/${exampleDirName}/api.config.yaml.`);

  writeArtifacts(projectRoot, config, {
    noSeed: true,
    seedDir,
  });
  console.log(`Generated artifacts from examples/${exampleDirName}/api.config.yaml.`);

  const dbPath = await recreateDatabase(projectRoot);
  console.log(`Recreated database at ${dbPath}.`);

  const db = await initDatabase(projectRoot);
  try {
    const result = await seedDatabase(projectRoot, db, {
      seedDir,
      truncateExisting: true,
    });
    for (const line of result.lines) {
      console.log(line);
    }
    console.log(`Seeded from ${seedDir}.`);
  } finally {
    await db.close();
  }

  if (fs.existsSync(imagesSourceDir) && fs.statSync(imagesSourceDir).isDirectory()) {
    removeDirectoryIfExists(imagesTargetDir);
    copyDirectory(imagesSourceDir, imagesTargetDir);
    console.log(`Copied example images to public/student/images/${exampleDirName}.`);
  } else {
    console.log(`No images directory found in examples/${exampleDirName}; skipped image sync.`);
  }
}

function overwriteProjectDefaults(sourceConfigPath, sourceSeedDir, rootConfigPath, rootSeedDir) {
  fs.copyFileSync(sourceConfigPath, rootConfigPath);
  removeDirectoryIfExists(rootSeedDir);
  copyDirectory(sourceSeedDir, rootSeedDir);
}

function removeDirectoryIfExists(targetDir) {
  if (fs.existsSync(targetDir)) {
    fs.rmSync(targetDir, { recursive: true, force: true });
  }
}

function copyDirectory(sourceDir, targetDir) {
  fs.mkdirSync(targetDir, { recursive: true });
  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);
    if (entry.isDirectory()) {
      copyDirectory(sourcePath, targetPath);
      continue;
    }
    fs.copyFileSync(sourcePath, targetPath);
  }
}

function resolveExampleSeedDir(projectRoot, exampleDirName) {
  const nestedSeedDir = path.join("examples", exampleDirName, "seed");
  if (fs.existsSync(path.join(projectRoot, nestedSeedDir, "order.json"))) {
    return nestedSeedDir;
  }

  const rootSeedDir = path.join("examples", exampleDirName);
  if (fs.existsSync(path.join(projectRoot, rootSeedDir, "order.json"))) {
    return rootSeedDir;
  }

  return nestedSeedDir;
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
