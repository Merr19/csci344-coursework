const path = require("path");
const { loadApiConfig } = require("../generator/config");
const { writeArtifacts } = require("../generator/artifacts");
const { recreateDatabase } = require("../runtime/db");
const { confirmDestructiveAction } = require("../runtime/confirm");
const { resolveApiConfigPath, resolveSeedDir } = require("../runtime/profileConfig");

async function main() {
  const projectRoot = path.resolve(__dirname, "../..");
  const argv = process.argv.slice(2);
  const noSeed = argv.includes("--no-seed");
  const headersOnly = argv.includes("--headers-only");
  const skipDbReset = argv.includes("--skip-db-reset");
  const { absolutePath: configPath, relativePath: configRelativePath } = resolveApiConfigPath(projectRoot, argv);
  const config = loadApiConfig(configPath);
  const seedDir = resolveSeedDir(argv, config.meta?.seedDir || "data/sample-data");
  if (!skipDbReset) {
    const confirmed = await confirmDestructiveAction(
      argv,
      "Are you sure you want to replace all of the data?"
    );

    if (!confirmed) {
      console.log("Generate cancelled.");
      process.exit(0);
    }
  }

  writeArtifacts(projectRoot, config, {
    noSeed,
    sampleRows: headersOnly ? 0 : 5,
    seedDir,
  });

  console.log(`Generated ${config.resources.length} resource(s) from ${configRelativePath}.`);
  if (skipDbReset) {
    console.log("Skipped database reset. Generated artifacts and committed seed files only.");
  } else {
    const dbPath = await recreateDatabase(projectRoot);
    console.log(`Recreated database at ${dbPath}.`);
  }
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
