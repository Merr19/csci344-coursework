const fs = require("fs");
const path = require("path");
const YAML = require("yaml");

const ALLOWED_TYPES = new Set([
  "string",
  "image_url",
  "text",
  "integer",
  "number",
  "boolean",
  "date",
  "datetime",
]);

const ALLOWED_OPERATIONS = new Set([
  "list",
  "retrieve",
  "create",
  "update",
  "delete",
]);

const ALLOWED_POLICIES = new Set([
  "public",
  "user",
  "owner",
  "owner_or_shared",
]);

function loadApiConfig(configPath) {
  const raw = fs.readFileSync(configPath, "utf8");
  const document = YAML.parseDocument(raw);
  if (document.errors.length > 0) {
    throw new Error(document.errors[0].message);
  }
  const parsed = document.toJSON();
  return normalizeConfig(parsed ?? {}, configPath);
}

function normalizeConfig(config, configPath) {
  if (!Array.isArray(config.resources) || config.resources.length === 0) {
    throw new Error("`api.config.yaml` must define a non-empty `resources` array.");
  }

  const seenTypes = new Set();
  const seenPaths = new Set();

  const normalizedResources = config.resources.map((resource) => {
    const resourceType = normalizeResourceType(resource?.type, "Each resource must have a `type`.");
    if (seenTypes.has(resourceType)) {
      throw new Error(`Duplicate resource type: ${resourceType}`);
    }
    seenTypes.add(resourceType);

    const fileBase = defaultCollectionBase(resourceType);
    const pathValue = resource.path || `/api/${fileBase}`;
    if (seenPaths.has(pathValue)) {
      throw new Error(`Duplicate resource path: ${pathValue}`);
    }
    seenPaths.add(pathValue);

    const operations = Array.isArray(resource.operations) && resource.operations.length > 0
      ? resource.operations
      : ["list", "retrieve", "create", "update", "delete"];

    for (const operation of operations) {
      if (!ALLOWED_OPERATIONS.has(operation)) {
        throw new Error(`Unsupported operation \`${operation}\` in resource \`${resourceType}\`.`);
      }
    }

    if (!Array.isArray(resource.fields) || resource.fields.length === 0) {
      throw new Error(`Resource \`${resourceType}\` must define at least one field.`);
    }
    if (Array.isArray(resource.relations) && resource.relations.length > 0) {
      throw new Error(
        `Resource \`${resourceType}\` uses deprecated \`relations\`. Define relationships with typed fields instead.`
      );
    }

    const seenFieldNames = new Set();
    const fields = resource.fields.map((field) => {
      if (!field?.name || !field?.type) {
        throw new Error(`Every field in resource \`${resourceType}\` needs \`name\` and \`type\`.`);
      }
      if (field.name === "id" || field.name === "owner_id") {
        throw new Error(`Field name \`${field.name}\` is reserved in resource \`${resourceType}\`.`);
      }
      if (seenFieldNames.has(field.name)) {
        throw new Error(`Duplicate field \`${field.name}\` in resource \`${resourceType}\`.`);
      }
      seenFieldNames.add(field.name);

      if (field.references != null) {
        throw new Error(
          `Field \`${resourceType}.${field.name}\` uses deprecated \`references\`. Use a typed relation field instead.`
        );
      }

      return normalizeField(field, resourceType);
    });

    const permissions = {
      list: resource.permissions?.list || resource.auth?.list || "public",
      retrieve: resource.permissions?.retrieve || resource.auth?.retrieve || "public",
      create: resource.permissions?.create || resource.auth?.create || "user",
      update: resource.permissions?.update || resource.auth?.update || "owner",
      delete: resource.permissions?.delete || resource.auth?.delete || "owner",
    };

    for (const [operation, policy] of Object.entries(permissions)) {
      if (!ALLOWED_POLICIES.has(policy)) {
        throw new Error(
          `Unsupported permissions policy \`${policy}\` on ${resourceType}.${operation}.`
        );
      }
    }

    const enabledPolicies = operations.map((operation) => permissions[operation]);
    const ownershipEnabled = enabledPolicies.some((policy) =>
      ["user", "owner", "owner_or_shared"].includes(policy)
    );

    if (
      operations.includes("create") &&
      (permissions.update === "owner" ||
        permissions.delete === "owner" ||
        permissions.list === "owner" ||
        permissions.retrieve === "owner" ||
        permissions.list === "owner_or_shared" ||
        permissions.retrieve === "owner_or_shared") &&
      permissions.create === "public"
    ) {
      throw new Error(
        `Resource \`${resourceType}\` cannot use owner-based rules if \`create\` is public.`
      );
    }

    if (
      !resource.shareable &&
      (permissions.list === "owner_or_shared" || permissions.retrieve === "owner_or_shared")
    ) {
      throw new Error(
        `Resource \`${resourceType}\` uses \`owner_or_shared\` but is not marked \`shareable: true\`.`
      );
    }

    return {
      type: resourceType,
      tableName: fileBase.replace(/-/g, "_"),
      fileBase,
      path: pathValue,
      operations,
      shareable: Boolean(resource.shareable),
      ownershipEnabled,
      fields,
      permissions,
      queryFilters: [],
    };
  });

  const resourceMap = new Map(normalizedResources.map((resource) => [resource.type, resource]));

  for (const resource of normalizedResources) {
    for (const field of resource.fields) {
      if (!field.relation) {
        continue;
      }
      const target = resourceMap.get(field.relation.resourceType);
      if (!target) {
        throw new Error(
          `Field \`${resource.type}.${field.name}\` references missing resource type \`${field.relation.resourceType}\`.`
        );
      }
      const targetField = field.relation.targetField || "id";
      if (targetField !== "id" && !target.fields.some((candidate) => candidate.name === targetField)) {
        throw new Error(
          `Field \`${resource.type}.${field.name}\` references missing field \`${targetField}\` on \`${target.type}\`.`
        );
      }
    }

    resource.queryFilters = buildResourceQueryFilters(resource);
  }

  return {
    meta: {
      configPath: path.basename(configPath),
      generatedAt: new Date().toISOString(),
    },
    resources: normalizedResources,
  };
}

function normalizeField(field, resourceType) {
  const authoredType = normalizeFieldType(field.type, resourceType, field.name);
  const relation = isScalarType(authoredType)
    ? null
    : {
        resourceType: authoredType,
        targetField: "id",
      };
  const storageType = relation ? "integer" : authoredType;

  return {
    name: field.name,
    type: authoredType,
    storageType,
    required: Boolean(field.required),
    relation,
    query: normalizeQueryConfig(field.query, {
      resourceName: resourceType,
      subjectLabel: `field \`${resourceType}.${field.name}\``,
      type: storageType,
      defaultParam: field.name,
    }),
  };
}

function normalizeResourceType(typeValue, emptyMessage) {
  const type = typeof typeValue === "string" ? typeValue.trim() : "";
  if (!type) {
    throw new Error(emptyMessage);
  }
  if (!isCapitalizedType(type)) {
    throw new Error(`Resource type \`${type}\` must be capitalized (for example \`Order\`).`);
  }
  return type;
}

function normalizeFieldType(typeValue, resourceType, fieldName) {
  const type = typeof typeValue === "string" ? typeValue.trim() : "";
  if (!type) {
    throw new Error(`Field \`${resourceType}.${fieldName}\` must define a \`type\`.`);
  }
  if (isScalarType(type)) {
    return type;
  }
  if (!isCapitalizedType(type)) {
    throw new Error(
      `Relation field \`${resourceType}.${fieldName}\` must use a capitalized resource type like \`Sneaker\`.`
    );
  }
  return type;
}

function normalizeQueryConfig(queryConfig, options) {
  if (queryConfig == null || queryConfig === false) {
    return null;
  }

  let normalizedInput = {};
  if (queryConfig === true) {
    normalizedInput = {};
  } else if (typeof queryConfig === "string") {
    normalizedInput = { param: queryConfig };
  } else if (typeof queryConfig === "object" && !Array.isArray(queryConfig)) {
    normalizedInput = queryConfig;
  } else {
    throw new Error(
      `${options.subjectLabel} has invalid \`query\` config. Use \`true\`, a param name string, or an object.`
    );
  }

  const param = typeof normalizedInput.param === "string" && normalizedInput.param.trim()
    ? normalizedInput.param.trim()
    : options.defaultParam;
  const allowedOps = options.allowedOps || allowedQueryOpsForType(options.type);
  const op = typeof normalizedInput.op === "string" && normalizedInput.op.trim()
    ? normalizedInput.op.trim()
    : options.defaultOp || defaultQueryOpForType(options.type);

  if (!allowedOps.has(op)) {
    throw new Error(
      `${options.subjectLabel} uses unsupported query op \`${op}\`. Allowed: ${[...allowedOps].join(", ")}.`
    );
  }

  return { param, op };
}

function defaultQueryOpForType(type) {
  switch (type) {
    case "string":
    case "text":
    case "image_url":
      return "contains";
    default:
      return "eq";
  }
}

function allowedQueryOpsForType(type) {
  switch (type) {
    case "string":
    case "text":
    case "image_url":
      return new Set(["contains", "eq"]);
    default:
      return new Set(["eq"]);
  }
}

function buildResourceQueryFilters(resource) {
  const queryFilters = [];
  const seenParams = new Map();

  for (const field of resource.fields) {
    if (!field.query) {
      continue;
    }
    const previous = seenParams.get(field.query.param);
    if (previous && previous !== field.name) {
      throw new Error(
        `Resource \`${resource.type}\` reuses query param \`${field.query.param}\` for both \`${previous}\` and \`${field.name}\`.`
      );
    }
    seenParams.set(field.query.param, field.name);
    queryFilters.push({
      param: field.query.param,
      fieldName: field.name,
      op: field.query.op,
      type: field.type,
      storageType: field.storageType,
      relation: field.relation || null,
    });
  }

  if (resource.ownershipEnabled) {
    const ownerParam = "owner_id";
    const previous = seenParams.get(ownerParam);
    if (previous) {
      throw new Error(
        `Resource \`${resource.type}\` reuses query param \`${ownerParam}\` for both \`${previous}\` and \`owner_id\`.`
      );
    }
    queryFilters.push({
      param: ownerParam,
      fieldName: ownerParam,
      op: "eq",
      type: "integer",
      storageType: "integer",
      relation: null,
    });
  }

  return queryFilters;
}

function isScalarType(type) {
  return ALLOWED_TYPES.has(type);
}

function isCapitalizedType(type) {
  return /^[A-Z][A-Za-z0-9]*$/.test(type);
}

function defaultCollectionBase(type) {
  return pluralizeWord(toKebabCase(type));
}

function pluralizeWord(value) {
  if (/(s|x|z|sh|ch)$/i.test(value)) {
    return `${value}es`;
  }
  if (/[^aeiou]y$/i.test(value)) {
    return `${value.slice(0, -1)}ies`;
  }
  return `${value}s`;
}

function toKebabCase(value) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/_/g, "-")
    .toLowerCase();
}

module.exports = {
  loadApiConfig,
  normalizeConfig,
  toKebabCase,
};
