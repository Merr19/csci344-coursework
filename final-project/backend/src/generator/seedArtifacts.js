const fs = require("fs");
const path = require("path");
const { normalizeSeedDir } = require("../runtime/seedDir");

/**
 * Foreign-key-safe order: each referenced resource type appears before dependents.
 */
function dependencyOrder(resources) {
  const byType = new Map(resources.map((r) => [r.type, r]));
  const result = [];
  const pending = new Set(resources.map((r) => r.type));

  while (pending.size) {
    const ready = [...pending].filter((type) => {
      const r = byType.get(type);
      const prereqs = r.fields
        .map((f) => f.relation?.resourceType)
        .filter((x) => x && byType.has(x));
      return prereqs.every((p) => result.includes(p));
    });
    if (ready.length === 0) {
      throw new Error("Could not order resources for seed files (check for cyclic foreign keys).");
    }
    ready.sort();
    const pick = ready[0];
    result.push(pick);
    pending.delete(pick);
  }

  return result.map((type) => byType.get(type));
}

function sampleValueForField(field, rowIndex) {
  if (Array.isArray(field.choices) && field.choices.length > 0) {
    return String(field.choices[rowIndex % field.choices.length]);
  }
  const n = rowIndex + 1;
  switch (field.type) {
    case "image_url":
      return `https://picsum.photos/300/300?id=${n}`;
    case "string":
      return `Sample ${field.name} ${n}`;
    case "text":
      return `Sample ${field.name} paragraph ${n}.`;
    case "integer":
      return String(n);
    case "number":
      return (12.99 + rowIndex).toFixed(2);
    case "boolean":
      return rowIndex % 2 === 0 ? "true" : "false";
    case "date":
      return `2026-04-0${n}`;
    case "datetime":
      return `2026-04-0${n}T12:00:00Z`;
    default:
      return `value${n}`;
  }
}

function escapeCsvCell(value) {
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function buildSampleCsv(resource, rowsPerResource) {
  const headers = [
    "id",
    ...(resource.ownershipEnabled ? ["owner_id"] : []),
    ...resource.fields.map((f) => f.name),
  ];
  const lines = [headers.join(",")];
  for (let i = 0; i < rowsPerResource; i += 1) {
    const cells = [
      String(i + 1),
      ...(resource.ownershipEnabled ? ["1"] : []),
      ...resource.fields.map((field) => {
        if (field.relation) {
          return String(i + 1);
        }
        return escapeCsvCell(sampleValueForField(field, i));
      }),
    ];
    lines.push(cells.join(","));
  }
  return `${lines.join("\n")}\n`;
}

function buildUsersCsv(userResource = { fields: [] }) {
  const fields = userResource.fields || [];
  const headers = ["id", "username", "password", ...fields.map((field) => field.name), "seed_as"];
  const rows = [
    ["1", "admin", "password", ...fields.map((field) => userSampleValue(field, 0, true)), "yes"],
    ["2", "user1", "password", ...fields.map((field) => userSampleValue(field, 1, false)), "no"],
    ["3", "user2", "password", ...fields.map((field) => userSampleValue(field, 2, false)), "no"],
    ["4", "user3", "password", ...fields.map((field) => userSampleValue(field, 3, false)), "no"],
    ["5", "user4", "password", ...fields.map((field) => userSampleValue(field, 4, false)), "no"],
  ];
  return `${[headers.join(","), ...rows.map((row) => row.map(escapeCsvCell).join(",")), ""].join("\n")}`;
}

function userSampleValue(field, rowIndex, isAdmin) {
  if (field.name === "role") {
    return isAdmin ? "admin" : field.default || "user";
  }
  if (field.name === "email") {
    return isAdmin ? "admin@example.com" : `user${rowIndex}@example.com`;
  }
  if (field.name === "display_name") {
    return isAdmin ? "Admin User" : `User ${rowIndex}`;
  }
  return sampleValueForField(field, rowIndex);
}

function archiveSeedFilesBeforeRewrite(seedDir) {
  if (!fs.existsSync(seedDir)) {
    return;
  }

  const entries = fs.readdirSync(seedDir, { withFileTypes: true });
  const toArchive = [];
  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }
    const { name } = entry;
    if (name.endsWith(".csv") || name === "order.json" || name === "README.txt") {
      toArchive.push(name);
    }
  }

  if (toArchive.length === 0) {
    return;
  }

  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
  const destDir = path.join(seedDir, "archive", timestamp);
  fs.mkdirSync(destDir, { recursive: true });

  for (const name of toArchive) {
    fs.renameSync(path.join(seedDir, name), path.join(destDir, name));
  }
}

function buildSeedReadme(seedDirName) {
  return [
    "API Generator Seed Data",
    "=======================",
    "",
    `This folder contains sample CSV files that you can load into your data API.`,
    "",
    "When you run `npm run generate` again, previous seed files in this folder are moved into",
    "`archive/<timestamp>/` so you can recover older versions if needed.",
    "",
    "Built-in accounts in a freshly generated database:",
    "- admin / password",
    "- user / password",
    "",
    "Extra demo users in users.csv:",
    "- user1 / password",
    "- user2 / password",
    "- user3 / password",
    "- user4 / password",
    "",
    "Load this data into the SQLite database by running:",
    "  npm run seed",
    "",
    "Recommended workflow:",
    "1. Run `npm run generate` after changing `api.config.yaml`.",
    "2. Edit the CSV files in this folder if you want custom seed data.",
    "3. Run `npm run seed` to insert the CSV rows into `data/app.db`.",
    "",
    "Notes:",
    "- `order.json` controls the import order for foreign-key dependencies.",
    "- `users.csv` must include `username` and `password` columns.",
    "- The built-in `admin` account is the default owner for ownership-enabled seeded rows.",
    "- The generated sample foreign-key values assume a fresh database.",
    "",
  ].join("\n");
}

function writeSeedArtifacts(projectRoot, config, options = {}) {
  if (options.noSeed) {
    return;
  }

  const seedDirName = normalizeSeedDir(options.seedDir, config.meta?.seedDir || "data/sample-data");
  const seedDir = path.join(projectRoot, seedDirName);
  archiveSeedFilesBeforeRewrite(seedDir);
  fs.mkdirSync(seedDir, { recursive: true });

  fs.writeFileSync(path.join(seedDir, "users.csv"), buildUsersCsv(config.userResource));
  fs.writeFileSync(path.join(seedDir, "README.txt"), buildSeedReadme(seedDirName));

  const ordered = dependencyOrder(config.resources);
  const rowsPerResource =
    options.sampleRows === undefined ? 5 : Math.max(0, Number(options.sampleRows) || 0);

  const orderPayload = {
    apiVersion: "1",
    baseUrlEnv: "API_BASE",
    directory: seedDirName,
    resources: ordered.map((r) => ({
      type: r.type,
      path: r.path,
      file: `${r.fileBase}.csv`,
    })),
    usersFile: "users.csv",
    seedUserColumn: "seed_as",
  };
  fs.writeFileSync(path.join(seedDir, "order.json"), JSON.stringify(orderPayload, null, 2));

  for (const resource of ordered) {
    const csvPath = path.join(seedDir, `${resource.fileBase}.csv`);
    const body =
      rowsPerResource > 0
        ? buildSampleCsv(resource, rowsPerResource)
        : `${[
            "id",
            ...(resource.ownershipEnabled ? ["owner_id"] : []),
            ...resource.fields.map((f) => f.name),
          ].join(",")}\n`;
    fs.writeFileSync(csvPath, body);
  }
}

module.exports = {
  writeSeedArtifacts,
  dependencyOrder,
};
