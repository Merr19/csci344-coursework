const path = require("path");
const { loadApiConfig } = require("../generator/config");
const { resolveApiConfigPath } = require("../runtime/profileConfig");

function main() {
  const projectRoot = path.resolve(__dirname, "../..");
  const argv = process.argv.slice(2);
  const { absolutePath, relativePath } = resolveApiConfigPath(projectRoot, argv);

  try {
    const config = loadApiConfig(absolutePath);

    console.log(`${relativePath} is valid.\n`);
    console.log(
      "Convention: every resource `type` and every non-scalar field `type` (a relation) must be PascalCase, for example Order or Sneaker."
    );
    console.log(`Resources: ${config.resources.length}`);
    console.log("\nManaged resources:");
    console.log(
      `- User fields: ${config.userResource.fields
        .map((field) => {
          const choices = field.choices ? ` choices=[${field.choices.join(", ")}]` : "";
          const def = Object.prototype.hasOwnProperty.call(field, "default")
            ? ` default=${field.default}`
            : "";
          return `${field.name}:${field.type}${choices}${def}`;
        })
        .join(", ")}`
    );

    for (const resource of config.resources) {
      console.log(`\n- ${resource.type}`);
      console.log(`  path: ${resource.path}`);
      console.log(`  operations: ${resource.operations.join(", ")}`);
      console.log(
        `  fields: ${resource.fields
          .map((field) =>
            field.relation
              ? `${field.name}:${field.type} [id -> ${field.relation.resourceType}.${field.relation.targetField || "id"}]`
              : `${field.name}:${field.type}`
          )
          .join(", ")}`
      );
      const authSummary = resource.operations
        .map((operation) => `${operation}=${formatPolicy(resource.permissions[operation])}`)
        .join(", ");
      console.log(
        `  auth: ${authSummary}`
      );

      if (resource.shareable) {
        console.log("  sharing: enabled");
      }
      if (resource.ownershipEnabled) {
        console.log("  ownership: owner_id will be added automatically");
      }
      if ((resource.queryFilters || []).length > 0) {
        console.log(
          `  query: ${resource.queryFilters
            .map((filter) => `${filter.param} -> ${filter.fieldName} (${filter.op})`)
            .join(", ")}`
        );
      }
      if (Object.keys(resource.views || {}).length > 0) {
        console.log(`  views: ${Object.keys(resource.views).join(", ")}`);
      }
    }

    console.log("\nBuilt-in resources:");
    console.log("- users table and auth endpoints are provided automatically");
    console.log("- the global shares table is provided automatically for shareable resources");
  } catch (error) {
    console.error(`${relativePath} is invalid.\n`);
    console.error(error.message);
    process.exit(1);
  }
}

function formatPolicy(policy) {
  return Array.isArray(policy) ? `[${policy.join(", ")}]` : policy;
}

main();
