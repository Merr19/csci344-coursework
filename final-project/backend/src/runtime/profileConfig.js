const path = require("path");
const { normalizeSeedDir } = require("./seedDir");

function getCliOption(argv, flag) {
  const inline = argv.find((arg) => arg.startsWith(`${flag}=`));
  if (inline) {
    return inline.slice(flag.length + 1);
  }

  const index = argv.indexOf(flag);
  if (index === -1) {
    return undefined;
  }

  const value = argv[index + 1];
  if (value === undefined || value.startsWith("--")) {
    throw new Error(`${flag} requires a value.`);
  }

  return value;
}

function normalizeProjectRelativePath(value, fallback, label) {
  const baseValue = typeof value === "string" && value.trim() ? value.trim() : fallback;
  const normalized = path.normalize(baseValue);

  if (
    !normalized ||
    normalized === "." ||
    normalized === ".." ||
    path.isAbsolute(normalized) ||
    normalized.startsWith(`..${path.sep}`)
  ) {
    throw new Error(`${label} must be a project-relative path.`);
  }

  return normalized;
}

function resolveApiConfigPath(projectRoot, argv = []) {
  const relativePath = normalizeProjectRelativePath(
    getCliOption(argv, "--config") || process.env.ACTIVE_API_CONFIG,
    "api.config.yaml",
    "API config path"
  );

  return {
    relativePath,
    absolutePath: path.join(projectRoot, relativePath),
  };
}

function resolveSeedDir(argv = [], fallback = "data/sample-data") {
  return normalizeSeedDir(
    getCliOption(argv, "--seed-dir") || process.env.ACTIVE_SEED_DIR,
    fallback
  );
}

module.exports = {
  getCliOption,
  normalizeProjectRelativePath,
  resolveApiConfigPath,
  resolveSeedDir,
};
