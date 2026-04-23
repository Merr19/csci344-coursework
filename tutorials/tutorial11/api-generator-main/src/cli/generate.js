const path = require("path");
const { loadApiConfig } = require("../generator/config");
const { writeArtifacts } = require("../generator/artifacts");
const { recreateDatabase } = require("../runtime/db");
const { confirmDestructiveAction } = require("../runtime/confirm");
const { getCliOption, normalizeSeedDir } = require("../runtime/seedDir");

async function main() {
  const projectRoot = path.resolve(__dirname, "../..");
  const configPath = path.join(projectRoot, "api.config.yaml");
  const argv = process.argv.slice(2);
  const noSeed = argv.includes("--no-seed");
  const headersOnly = argv.includes("--headers-only");
  const config = loadApiConfig(configPath);
  const seedDir = normalizeSeedDir(
    getCliOption(argv, "--seed-dir"),
    config.meta?.seedDir || "data/sample-data"
  );
  const confirmed = await confirmDestructiveAction(
    argv,
    "Are you sure you want to replace all of the data?"
  );

  if (!confirmed) {
    console.log("Generate cancelled.");
    process.exit(0);
  }

  writeArtifacts(projectRoot, config, {
    noSeed,
    sampleRows: headersOnly ? 0 : 5,
    seedDir,
  });
  const dbPath = recreateDatabase(projectRoot);

  console.log(`Generated ${config.resources.length} resource(s) from ${path.basename(configPath)}.`);
  console.log(`Recreated SQLite database at ${dbPath}.`);
  if (!noSeed) {
    console.log(
      `Wrote sample CSV seed files under ${seedDir}/ (use --no-seed to skip, --headers-only for empty rows).`
    );
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
