const fs = require("fs");
const path = require("path");
const { writeSeedArtifacts } = require("./seedArtifacts");
const { normalizeSeedDir } = require("../runtime/seedDir");

function writeArtifacts(projectRoot, config, seedOptions = {}) {
  const seedDir = normalizeSeedDir(seedOptions.seedDir, config.meta?.seedDir || "data/sample-data");
  const configWithMeta = {
    ...config,
    meta: {
      ...config.meta,
      seedDir,
    },
  };
  const generatedDir = path.join(projectRoot, "generated");
  const routesDir = path.join(generatedDir, "routes");
  const validatorsDir = path.join(generatedDir, "validators");
  const docsDir = path.join(generatedDir, "docs");

  fs.mkdirSync(routesDir, { recursive: true });
  fs.mkdirSync(validatorsDir, { recursive: true });
  fs.mkdirSync(docsDir, { recursive: true });

  fs.writeFileSync(
    path.join(generatedDir, "config.json"),
    JSON.stringify(configWithMeta, null, 2)
  );

  const publicDir = path.join(projectRoot, "public");
  fs.mkdirSync(publicDir, { recursive: true });
  fs.writeFileSync(
    path.join(publicDir, "generated-config.json"),
    JSON.stringify(configWithMeta, null, 2)
  );

  fs.writeFileSync(
    path.join(generatedDir, "schema.sql"),
    buildSchemaSql(configWithMeta, "sqlite")
  );
  fs.writeFileSync(
    path.join(generatedDir, "schema.sqlite.sql"),
    buildSchemaSql(configWithMeta, "sqlite")
  );
  fs.writeFileSync(
    path.join(generatedDir, "schema.postgres.sql"),
    buildSchemaSql(configWithMeta, "postgres")
  );
  fs.writeFileSync(
    path.join(docsDir, "routes.json"),
    JSON.stringify(buildDocs(configWithMeta), null, 2)
  );
  fs.writeFileSync(
    path.join(docsDir, "openapi.json"),
    JSON.stringify(buildOpenApi(configWithMeta), null, 2)
  );

  const routeModules = [];
  for (const resource of configWithMeta.resources) {
    const validatorModulePath = `../validators/${resource.fileBase}.js`;
    const routeModulePath = path.join(routesDir, `${resource.fileBase}.js`);
    const validatorModule = buildValidatorModule(resource);
    const routeModule = buildRouteModule(resource, validatorModulePath);

    fs.writeFileSync(
      path.join(validatorsDir, `${resource.fileBase}.js`),
      validatorModule
    );
    fs.writeFileSync(routeModulePath, routeModule);
    routeModules.push(resource.fileBase);
  }

  fs.writeFileSync(
    path.join(routesDir, "index.js"),
    [
      ...routeModules.map(
        (moduleName) => `const ${toIdentifier(moduleName)} = require("./${moduleName}");`
      ),
      "",
      "module.exports = [",
      ...routeModules.map((moduleName) => `  ${toIdentifier(moduleName)},`),
      "];",
      "",
    ].join("\n")
  );

  writeSeedArtifacts(projectRoot, configWithMeta, {
    ...seedOptions,
    seedDir,
  });
}

function buildSchemaSql(config, dialect = "sqlite") {
  const resourceMap = new Map(config.resources.map((resource) => [resource.type, resource]));
  return config.resources
    .map((resource) => {
      const columnLines = [
        dialect === "postgres"
          ? "id BIGSERIAL PRIMARY KEY"
          : "id INTEGER PRIMARY KEY AUTOINCREMENT",
      ];
      if (resource.ownershipEnabled) {
        columnLines.push(`owner_id ${dialect === "postgres" ? "BIGINT" : "INTEGER"} NOT NULL`);
      }

      for (const field of resource.fields) {
        const required = field.required ? " NOT NULL" : "";
        const defaultSql = Object.prototype.hasOwnProperty.call(field, "default")
          ? ` DEFAULT ${sqlLiteral(field.default, dialect)}`
          : "";
        const choicesSql = field.choices
          ? ` CHECK (${field.name} IN (${field.choices.map((choice) => sqlLiteral(choice, dialect)).join(", ")}))`
          : "";
        columnLines.push(
          `${field.name} ${sqlTypeForField(field.storageType, dialect)}${required}${defaultSql}${choicesSql}`
        );
      }

      if (resource.ownershipEnabled) {
        columnLines.push("FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE");
      }

      for (const field of resource.fields) {
        if (field.relation) {
          const target = resourceMap.get(field.relation.resourceType);
          const targetTableName = field.relation.builtIn
            ? field.relation.tableName
            : target?.tableName || field.relation.resourceType;
          columnLines.push(
            `FOREIGN KEY (${field.name}) REFERENCES ${targetTableName}(${field.relation.targetField || "id"})`
          );
        }
      }

      return [
        `CREATE TABLE IF NOT EXISTS ${resource.tableName} (`,
        `  ${columnLines.join(",\n  ")}`,
        ");",
        "",
      ].join("\n");
    })
    .join("\n");
}

function buildDocs(config) {
  return {
    generatedAt: config.meta.generatedAt,
    builtIns: {
      auth: [
        { method: "POST", path: "/auth/register" },
        { method: "POST", path: "/auth/login" },
        { method: "GET", path: "/auth/me" },
        { method: "GET", path: "/auth/users" },
        { method: "PATCH", path: "/auth/users/:id" },
      ],
    },
    resources: config.resources.map((resource) => {
      const endpoints = [];
      if (resource.operations.includes("list")) {
        endpoints.push({
          method: "GET",
          path: resource.path,
          permissions: resource.permissions.list,
          query: buildDocsQueryParams(resource),
        });
      }
      if (resource.operations.includes("retrieve")) {
        endpoints.push({
          method: "GET",
          path: `${resource.path}/:id`,
          permissions: resource.permissions.retrieve,
        });
      }
      if (resource.operations.includes("create")) {
        endpoints.push({
          method: "POST",
          path: resource.path,
          permissions: resource.permissions.create,
        });
      }
      if (resource.operations.includes("update")) {
        endpoints.push({
          method: "PATCH",
          path: `${resource.path}/:id`,
          permissions: resource.permissions.update,
        });
      }
      if (resource.operations.includes("delete")) {
        endpoints.push({
          method: "DELETE",
          path: `${resource.path}/:id`,
          permissions: resource.permissions.delete,
        });
      }
      if (resource.shareable) {
        endpoints.push(
          { method: "GET", path: `${resource.path}/:id/shares`, permissions: "owner" },
          { method: "POST", path: `${resource.path}/:id/shares`, permissions: "owner" },
          { method: "DELETE", path: `${resource.path}/:id/shares/:shareId`, permissions: "owner" }
        );
      }
      return {
        type: resource.type,
        path: resource.path,
        shareable: resource.shareable,
        endpoints,
      };
    }),
  };
}

function buildOpenApi(config) {
  const resourceMap = new Map(config.resources.map((resource) => [resource.type, resource]));
  const userFields = config.userResource?.fields || [];
  const registerRequired = [
    "username",
    "password",
    ...userFields
      .filter((field) => field.required && !Object.prototype.hasOwnProperty.call(field, "default"))
      .map((field) => field.name),
  ];
  const managedUserPatchSchema = {
    type: "object",
    minProperties: 1,
    properties: Object.fromEntries(
      userFields.map((field) => [field.name, openApiTypeForField(field)])
    ),
    additionalProperties: false,
  };
  const paths = {
    "/auth/register": {
      post: {
        tags: ["auth"],
        summary: "Register a new user",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: registerRequired,
                properties: {
                  username: { type: "string" },
                  password: { type: "string", format: "password" },
                  ...Object.fromEntries(
                    userFields.map((field) => [field.name, openApiTypeForField(field)])
                  ),
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "Registered successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AuthResponse" },
              },
            },
          },
        },
      },
    },
    "/auth/login": {
      post: {
        tags: ["auth"],
        summary: "Log in and receive a bearer token",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["username", "password"],
                properties: {
                  username: { type: "string" },
                  password: { type: "string", format: "password" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Logged in successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AuthResponse" },
              },
            },
          },
        },
      },
    },
    "/auth/me": {
      get: {
        tags: ["auth"],
        summary: "Fetch the current user",
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: "Current user",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CurrentUser" },
              },
            },
          },
        },
      },
    },
    "/auth/users": {
      get: {
        tags: ["auth"],
        summary: "List registered users",
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: "Users",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/CurrentUser" },
                },
              },
            },
          },
        },
      },
    },
    "/auth/users/{id}": {
      parameters: [idParameter()],
      patch: {
        tags: ["auth"],
        summary: "Update managed User fields",
        description:
          "Allows users to update their own managed User fields, and admins to update any user. Only admins may update `role`. Username and password fields are not editable here.",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: managedUserPatchSchema,
            },
          },
        },
        responses: {
          200: {
            description: "Updated user",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CurrentUser" },
              },
            },
          },
          ...errorResponses(),
        },
      },
    },
  };

  const components = {
    schemas: {
      AuthUser: {
        type: "object",
        properties: {
          id: { type: "integer" },
          username: { type: "string" },
          ...Object.fromEntries(
            userFields.map((field) => [field.name, openApiTypeForField(field)])
          ),
        },
      },
      AuthResponse: {
        type: "object",
        properties: {
          user: { $ref: "#/components/schemas/AuthUser" },
          token: { type: "string" },
        },
      },
      CurrentUser: {
        type: "object",
        properties: {
          id: { type: "integer" },
          username: { type: "string" },
          ...Object.fromEntries(
            userFields.map((field) => [field.name, openApiTypeForField(field)])
          ),
          created_at: { type: "string" },
        },
      },
      ShareRequest: {
        type: "object",
        properties: {
          username: { type: "string" },
          user_id: { type: "integer" },
        },
      },
      ShareRecord: {
        type: "object",
        properties: {
          id: { type: "integer" },
          resource_type: { type: "string" },
          resource_id: { type: "integer" },
          shared_with_user_id: { type: "integer" },
          shared_by_user_id: { type: "integer" },
          created_at: { type: "string" },
          username: { type: "string" },
        },
      },
      ErrorResponse: {
        type: "object",
        properties: {
          error: { type: "string" },
        },
      },
    },
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
  };

  for (const resource of config.resources) {
    const createSchemaName = `${pascalCase(resource.type)}CreateInput`;
    const updateSchemaName = `${pascalCase(resource.type)}UpdateInput`;
    const fullSchemaName = `${pascalCase(resource.type)}Record`;

    components.schemas[createSchemaName] = buildInputSchema(resource, false);
    components.schemas[updateSchemaName] = buildInputSchema(resource, true);
    components.schemas[fullSchemaName] = buildFullRecordSchema(resourceMap, resource);

    if (resource.operations.includes("list")) {
      paths[resource.path] ||= {};
      paths[resource.path].get = {
        tags: [resource.type],
        summary: `List ${resource.type}`,
        ...(buildOpenApiQueryParameters(resource).length > 0
          ? { parameters: buildOpenApiQueryParameters(resource) }
          : {}),
        responses: {
          200: {
            description: "List of records",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: `#/components/schemas/${fullSchemaName}` },
                },
              },
            },
          },
          ...errorResponses(),
        },
        ...securityForPolicy(resource.permissions.list),
      };
    }

    if (resource.operations.includes("create")) {
      paths[resource.path] ||= {};
      paths[resource.path].post = {
        tags: [resource.type],
        summary: `Create a ${resource.type} record`,
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: `#/components/schemas/${createSchemaName}` },
            },
          },
        },
        responses: {
          201: {
            description: "Created successfully",
            content: {
              "application/json": {
                schema: { $ref: `#/components/schemas/${fullSchemaName}` },
              },
            },
          },
          ...errorResponses(),
        },
        ...securityForPolicy(resource.permissions.create),
      };
    }

    const detailPath = `${resource.path}/{id}`;
    if (resource.operations.includes("retrieve")) {
      paths[detailPath] ||= { parameters: [idParameter()] };
      paths[detailPath].get = {
        tags: [resource.type],
        summary: `Fetch one ${resource.type} record`,
        responses: {
          200: {
            description: "Record found",
            content: {
              "application/json": {
                schema: { $ref: `#/components/schemas/${fullSchemaName}` },
              },
            },
          },
          ...errorResponses(),
        },
        ...securityForPolicy(resource.permissions.retrieve),
      };
    }

    if (resource.operations.includes("update")) {
      paths[detailPath] ||= { parameters: [idParameter()] };
      paths[detailPath].patch = {
        tags: [resource.type],
        summary: `Update one ${resource.type} record`,
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: `#/components/schemas/${updateSchemaName}` },
            },
          },
        },
        responses: {
          200: {
            description: "Updated successfully",
            content: {
              "application/json": {
                schema: { $ref: `#/components/schemas/${fullSchemaName}` },
              },
            },
          },
          ...errorResponses(),
        },
        ...securityForPolicy(resource.permissions.update),
      };
    }

    if (resource.operations.includes("delete")) {
      paths[detailPath] ||= { parameters: [idParameter()] };
      paths[detailPath].delete = {
        tags: [resource.type],
        summary: `Delete one ${resource.type} record`,
        responses: {
          204: { description: "Deleted successfully" },
          ...errorResponses(),
        },
        ...securityForPolicy(resource.permissions.delete),
      };
    }

    if (resource.shareable) {
      const sharePath = `${resource.path}/{id}/shares`;
      const deleteSharePath = `${resource.path}/{id}/shares/{shareId}`;

      paths[sharePath] = {
        parameters: [idParameter()],
        get: {
          tags: [resource.type],
          summary: `List shares for a ${resource.type} record`,
          security: [{ BearerAuth: [] }],
          responses: {
            200: {
              description: "Shares",
              content: {
                "application/json": {
                  schema: {
                    type: "array",
                    items: { $ref: "#/components/schemas/ShareRecord" },
                  },
                },
              },
            },
            ...errorResponses(),
          },
        },
        post: {
          tags: [resource.type],
          summary: `Share a ${resource.type} record with another user`,
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ShareRequest" },
              },
            },
          },
          responses: {
            201: {
              description: "Shared successfully",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ShareRecord" },
                },
              },
            },
            ...errorResponses(),
          },
        },
      };

      paths[deleteSharePath] = {
        parameters: [
          idParameter(),
          {
            in: "path",
            name: "shareId",
            required: true,
            schema: { type: "integer" },
          },
        ],
        delete: {
          tags: [resource.type],
          summary: `Remove a share from a ${resource.type} record`,
          security: [{ BearerAuth: [] }],
          responses: {
            204: { description: "Share removed" },
            ...errorResponses(),
          },
        },
      };
    }
  }

  return {
    openapi: "3.0.3",
    info: {
      title: "API Generator Starter API",
      version: "1.0.0",
      description:
        "Interactive API documentation generated from api.config.yaml and the built-in auth/sharing system.",
    },
    servers: [{ url: "/" }],
    tags: [
      { name: "auth" },
      ...config.resources.map((resource) => ({ name: resource.type })),
    ],
    components,
    paths,
  };
}

function buildValidatorModule(resource) {
  return [
    `module.exports = ${JSON.stringify(
      {
        resource: resource.type,
        fields: resource.fields,
      },
      null,
      2
    )};`,
    "",
  ].join("\n");
}

function buildRouteModule(resource, validatorModulePath) {
  return [
    `const validator = require("${validatorModulePath}");`,
    "",
    `module.exports = ${JSON.stringify(resource, null, 2)};`,
    "module.exports.validator = validator;",
    "",
  ].join("\n");
}

function sqlTypeForField(type, dialect = "sqlite") {
  switch (type) {
    case "integer":
      return dialect === "postgres" ? "BIGINT" : "INTEGER";
    case "number":
      return dialect === "postgres" ? "DOUBLE PRECISION" : "REAL";
    case "boolean":
      return dialect === "postgres" ? "BOOLEAN" : "INTEGER";
    case "date":
    case "datetime":
    case "image_url":
    case "string":
    case "text":
    default:
      return "TEXT";
  }
}

function buildInputSchema(resource, partial) {
  const required = partial
    ? []
    : resource.fields.filter((field) => field.required).map((field) => field.name);

  return {
    type: "object",
    ...(required.length > 0 ? { required } : {}),
    properties: Object.fromEntries(
      resource.fields.map((field) => [field.name, openApiTypeForField(field)])
    ),
  };
}

function buildFullRecordSchema(resourceMap, resource, depth = 0) {
  const properties = {
    id: { type: "integer" },
  };

  if (resource.ownershipEnabled) {
    properties.owner = { $ref: "#/components/schemas/CurrentUser" };
  }

  for (const field of resource.fields) {
    if (depth === 0 && field.relation) {
      if (field.relation.resourceType === "User") {
        properties[field.name] = {
          $ref: "#/components/schemas/CurrentUser",
          nullable: !field.required,
        };
        continue;
      }
      const target = resourceMap.get(field.relation.resourceType);
      properties[field.name] = target
        ? {
            ...buildFullRecordSchema(resourceMap, target, depth + 1),
            nullable: !field.required,
          }
        : openApiTypeForField(field);
      continue;
    }

    properties[field.name] = openApiTypeForField(field);
  }

  return {
    type: "object",
    properties,
  };
}

function openApiTypeForField(fieldOrType) {
  const type = typeof fieldOrType === "string" ? fieldOrType : fieldOrType.storageType || fieldOrType.type;
  const schema = (() => {
    switch (type) {
    case "integer":
      return { type: "integer" };
    case "number":
      return { type: "number" };
    case "boolean":
      return { type: "boolean" };
    case "image_url":
      return { type: "string" };
    case "date":
      return { type: "string", format: "date" };
    case "datetime":
      return { type: "string", format: "date-time" };
    case "text":
    case "string":
    default:
      return { type: "string" };
    }
  })();
  if (typeof fieldOrType === "object" && Array.isArray(fieldOrType.choices)) {
    schema.enum = fieldOrType.choices;
  }
  if (typeof fieldOrType === "object" && Object.prototype.hasOwnProperty.call(fieldOrType, "default")) {
    schema.default = fieldOrType.default;
  }
  return schema;
}

function buildDocsQueryParams(resource) {
  return (resource.queryFilters || []).map((filter) => ({
    name: filter.param,
    field: filter.fieldName,
    op: filter.op,
    type: filter.storageType,
    relationType: filter.relation?.resourceType || null,
  }));
}

function buildOpenApiQueryParameters(resource) {
  return (resource.queryFilters || []).map((filter) => ({
      in: "query",
      name: filter.param,
      required: false,
      schema: openApiTypeForField(filter),
      description:
        filter.op === "contains"
          ? `Filter ${resource.type} by ${filter.fieldName} using a partial text match.`
          : `Filter ${resource.type} by ${filter.fieldName} using an exact match.`,
    }));
}

function sqlLiteral(value, dialect = "sqlite") {
  if (value === null) {
    return "NULL";
  }
  if (typeof value === "boolean") {
    return dialect === "postgres" ? (value ? "TRUE" : "FALSE") : value ? "1" : "0";
  }
  if (typeof value === "number") {
    return String(value);
  }
  return `'${String(value).replaceAll("'", "''")}'`;
}

function pascalCase(value) {
  return value
    .split(/[_-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

function securityForPolicy(policy) {
  const terms = Array.isArray(policy) ? policy : [policy];
  return terms.includes("public") ? {} : { security: [{ BearerAuth: [] }] };
}

function idParameter() {
  return {
    in: "path",
    name: "id",
    required: true,
    schema: { type: "integer" },
  };
}

function errorResponses() {
  return {
    400: {
      description: "Bad request",
      content: {
        "application/json": {
          schema: { $ref: "#/components/schemas/ErrorResponse" },
        },
      },
    },
    401: {
      description: "Authentication required or token invalid",
      content: {
        "application/json": {
          schema: { $ref: "#/components/schemas/ErrorResponse" },
        },
      },
    },
    404: {
      description: "Resource not found",
      content: {
        "application/json": {
          schema: { $ref: "#/components/schemas/ErrorResponse" },
        },
      },
    },
  };
}

function toIdentifier(value) {
  return value.replace(/-([a-z])/g, (_, char) => char.toUpperCase()).replace(/[^a-zA-Z0-9_$]/g, "");
}

module.exports = {
  writeArtifacts,
};
