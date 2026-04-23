const path = require("path");

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

function normalizeSeedDir(value, fallback = "data/sample-data") {
  const baseValue = typeof value === "string" && value.trim() ? value.trim() : fallback;
  const normalized = path.normalize(baseValue);

  if (
    !normalized ||
    normalized === "." ||
    normalized === ".." ||
    path.isAbsolute(normalized) ||
    normalized.startsWith(`..${path.sep}`)
  ) {
    throw new Error("Seed directory must be a project-relative path.");
  }

  return normalized;
}

module.exports = {
  getCliOption,
  normalizeSeedDir,
};
