const path = require("path");
const { loadApiConfig } = require("../generator/config");

function main() {
  const projectRoot = path.resolve(__dirname, "../..");
  const configPath = path.join(projectRoot, "api.config.yaml");

  try {
    const config = loadApiConfig(configPath);

    console.log("api.config.yaml is valid.\n");
    console.log(
      "Convention: every resource `type` and every non-scalar field `type` (a relation) must be PascalCase, for example Order or Sneaker."
    );
    console.log(`Resources: ${config.resources.length}`);

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
        .map((operation) => `${operation}=${resource.permissions[operation]}`)
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
    console.error("api.config.yaml is invalid.\n");
    console.error(error.message);
    process.exit(1);
  }
}

main();
