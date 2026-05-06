#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { askQuestion } = require("../runtime/confirm");
const { loadApiConfig } = require("../generator/config");
const { initDatabase } = require("../runtime/db");
const { resolveApiConfigPath, resolveSeedDir, getCliOption } = require("../runtime/profileConfig");
const { dependencyOrder } = require("../generator/seedArtifacts");

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--help")) {
    printHelp();
    return;
  }

  const projectRoot = path.resolve(__dirname, "../..");
  const generatedProfile = readGeneratedProfile(projectRoot);
  const hasConfigOverride = Boolean(getCliOption(argv, "--config") || process.env.ACTIVE_API_CONFIG);
  const hasSeedOverride = Boolean(getCliOption(argv, "--seed-dir") || process.env.ACTIVE_SEED_DIR);

  let { absolutePath: configPath, relativePath: configRelativePath } = resolveApiConfigPath(projectRoot, argv);
  if (!hasConfigOverride && generatedProfile?.meta?.configPath) {
    const fromGenerated = asProjectPath(projectRoot, generatedProfile.meta.configPath);
    if (fromGenerated && fs.existsSync(fromGenerated.absolutePath)) {
      configPath = fromGenerated.absolutePath;
      configRelativePath = fromGenerated.displayPath;
    }
  }
  const config = loadApiConfig(configPath);
  let seedDir = resolveSeedDir(argv, config.meta?.seedDir || "data/sample-data");
  if (!hasSeedOverride && generatedProfile?.meta?.seedDir) {
    seedDir = resolveSeedDir([], generatedProfile.meta.seedDir);
  }
  const sourceConfigPath = configPath;
  const sourceExampleName = extractExampleNameFromConfigPath(configRelativePath);

  if (!fs.existsSync(sourceConfigPath)) {
    throw new Error(`Config file not found: ${configRelativePath}`);
  }
  const explicitName = getCliOption(argv, "--dir") || process.env.npm_config_dir;
  const exampleName = await promptExampleName(explicitName);
  const targetExampleDir = path.join(projectRoot, "examples", exampleName);
  const targetSeedDir = resolveTargetSeedDir(targetExampleDir, seedDir);

  const canWrite = await ensureTargetWritable(targetExampleDir, argv);
  if (!canWrite) {
    console.log("Export cancelled.");
    return;
  }

  fs.mkdirSync(targetSeedDir, { recursive: true });
  fs.copyFileSync(sourceConfigPath, path.join(targetExampleDir, "api.config.yaml"));
  await exportSeedFromDatabase(projectRoot, config, targetSeedDir);
  const copiedImages = copyExampleImagesIfPresent(projectRoot, sourceExampleName, targetExampleDir);

  const targetSeedRelative = path.relative(projectRoot, targetSeedDir);

  console.log(`Exported active example to examples/${exampleName}.`);
  console.log(`- Config: ${configRelativePath} -> examples/${exampleName}/api.config.yaml`);
  console.log(`- Seed files: database -> ${targetSeedRelative}`);
  if (copiedImages) {
    console.log(`- Images: public/student/images/${sourceExampleName} -> examples/${exampleName}/images`);
  } else {
    console.log("- Images: none copied (no matching public/student/images source found)");
  }
}

function printHelp() {
  console.log(`Export active config + seed files into examples/<subfolder>.

Usage:
  npm run export:example
  npm run export:example -- --dir plants-copy
  npm run export:example -- --config examples/plants/api.config.yaml --seed-dir examples/plants/seed

Options:
  --dir       Example subfolder name under examples/ (if omitted, prompts)
  --config    Source API config path (defaults to active profile or api.config.yaml)
  --seed-dir  Source seed directory (defaults to active profile or config meta seedDir)
  --yes       Overwrite existing target folder without prompt
  --help      Show this help message
`);
}

async function promptExampleName(initialName) {
  if (isValidExampleName(initialName)) {
    return initialName.trim();
  }

  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error(
      "Missing --dir in non-interactive mode. Re-run with --dir <example-name>."
    );
  }

  while (true) {
    const answer = (await askQuestion("Create which examples subfolder? (name only): ")).trim();
    if (isValidExampleName(answer)) {
      return answer;
    }
    console.log("Invalid name. Use letters, numbers, -, or _.");
  }
}

function isValidExampleName(value) {
  if (typeof value !== "string") {
    return false;
  }
  const trimmed = value.trim();
  return /^[a-zA-Z0-9_-]+$/.test(trimmed);
}

function resolveTargetSeedDir(targetExampleDir, sourceSeedDirRelative) {
  const sourceDirName = path.basename(path.normalize(sourceSeedDirRelative));
  if (sourceDirName === "seed") {
    return path.join(targetExampleDir, "seed");
  }
  return targetExampleDir;
}

function readGeneratedProfile(projectRoot) {
  const profilePath = path.join(projectRoot, "generated", "config.json");
  if (!fs.existsSync(profilePath)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(profilePath, "utf8"));
  } catch {
    return null;
  }
}

function asProjectPath(projectRoot, maybePath) {
  if (typeof maybePath !== "string" || !maybePath.trim()) {
    return null;
  }
  const absolutePath = path.isAbsolute(maybePath)
    ? path.normalize(maybePath)
    : path.join(projectRoot, path.normalize(maybePath));
  const relative = path.relative(projectRoot, absolutePath);
  const displayPath = relative && !relative.startsWith("..") ? relative : absolutePath;
  return { absolutePath, displayPath };
}

function csvCell(value) {
  if (value === null || value === undefined) {
    return "";
  }
  const text = String(value);
  if (!/[",\n\r]/.test(text)) {
    return text;
  }
  return `"${text.replace(/"/g, "\"\"")}"`;
}

function writeCsv(filePath, rows, headers) {
  const headerLine = headers.map(csvCell).join(",");
  const lines = [headerLine];
  for (const row of rows) {
    lines.push(headers.map((header) => csvCell(row[header])).join(","));
  }
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`, "utf8");
}

async function exportSeedFromDatabase(projectRoot, config, targetSeedDir) {
  const db = await initDatabase(projectRoot, { initializeSchema: false });
  try {
    const userFields = config.userResource?.fields || [];
    const userHeaders = ["id", "username", "password", ...userFields.map((field) => field.name), "seed_as"];
    const userRows = await db.all("SELECT * FROM users ORDER BY id ASC");
    const usersCsvRows = userRows.map((row) => ({
      id: row.id,
      username: row.username,
      password: "password",
      ...Object.fromEntries(userFields.map((field) => [field.name, row[field.name]])),
      seed_as: String(row.username || "").trim().toLowerCase() === "admin" ? "yes" : "no",
    }));
    writeCsv(path.join(targetSeedDir, "users.csv"), usersCsvRows, userHeaders);

    const orderedResources = dependencyOrder(config.resources);
    const orderPayload = {
      apiVersion: "1",
      baseUrlEnv: "API_BASE",
      directory: path.relative(projectRoot, targetSeedDir) || path.basename(targetSeedDir),
      resources: orderedResources.map((resource) => ({
        type: resource.type,
        path: resource.path,
        file: `${resource.fileBase}.csv`,
      })),
      usersFile: "users.csv",
      seedUserColumn: "seed_as",
    };
    fs.writeFileSync(path.join(targetSeedDir, "order.json"), JSON.stringify(orderPayload, null, 2));

    for (const resource of orderedResources) {
      const headers = [
        "id",
        ...(resource.ownershipEnabled ? ["owner_id"] : []),
        ...resource.fields.map((field) => field.name),
      ];
      const rows = await db.all(`SELECT * FROM ${quoteIdentifier(resource.tableName)} ORDER BY id ASC`);
      writeCsv(path.join(targetSeedDir, `${resource.fileBase}.csv`), rows, headers);
    }
  } finally {
    await db.close();
  }
}

function quoteIdentifier(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function extractExampleNameFromConfigPath(configRelativePath) {
  const normalized = path.normalize(configRelativePath);
  const parts = normalized.split(path.sep);
  if (parts.length >= 3 && parts[0] === "examples" && parts[2] === "api.config.yaml") {
    return parts[1];
  }
  return null;
}

function copyExampleImagesIfPresent(projectRoot, sourceExampleName, targetExampleDir) {
  if (!sourceExampleName) {
    return false;
  }
  const sourceImagesDir = path.join(projectRoot, "public", "student", "images", sourceExampleName);
  if (!fs.existsSync(sourceImagesDir) || !fs.statSync(sourceImagesDir).isDirectory()) {
    return false;
  }
  const targetImagesDir = path.join(targetExampleDir, "images");
  copyDirectory(sourceImagesDir, targetImagesDir);
  return true;
}

async function ensureTargetWritable(targetDir, argv) {
  if (!fs.existsSync(targetDir)) {
    return true;
  }

  if (argv.includes("--yes")) {
    fs.rmSync(targetDir, { recursive: true, force: true });
    return true;
  }

  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error(
      `Target already exists (${path.relative(path.resolve(__dirname, "../.."), targetDir)}). Re-run with --yes to overwrite.`
    );
  }

  const answer = await askQuestion(
    `examples/${path.basename(targetDir)} already exists. Overwrite it? (yes/no): `
  );
  if (answer.trim().toLowerCase() !== "yes") {
    return false;
  }

  fs.rmSync(targetDir, { recursive: true, force: true });
  return true;
}

function copyDirectory(sourceDir, targetDir) {
  fs.mkdirSync(targetDir, { recursive: true });
  const entries = fs.readdirSync(sourceDir, { withFileTypes: true });
  for (const entry of entries) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);
    if (entry.isDirectory()) {
      copyDirectory(sourcePath, targetPath);
      continue;
    }
    fs.copyFileSync(sourcePath, targetPath);
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
