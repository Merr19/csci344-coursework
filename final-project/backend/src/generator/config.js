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
    throw new Error(`\`${path.basename(configPath)}\` must define a non-empty \`resources\` array.`);
  }

  const seenTypes = new Set();
  const seenPaths = new Set();
  let userResourceInput = null;
  const appResourceInputs = [];

  for (const resource of config.resources) {
    const resourceType = normalizeResourceType(resource?.type, "Each resource must have a `type`.");
    if (seenTypes.has(resourceType)) {
      throw new Error(`Duplicate resource type: ${resourceType}`);
    }
    seenTypes.add(resourceType);
    if (resourceType === "User") {
      userResourceInput = resource;
    } else {
      appResourceInputs.push(resource);
    }
  }

  const userResource = normalizeUserResource(userResourceInput);

  const normalizedResources = appResourceInputs.map((resource) => {
    const resourceType = normalizeResourceType(resource?.type, "Each resource must have a `type`.");

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
      if (field.choices != null && !Array.isArray(field.choices)) {
        throw new Error(`Field \`${resourceType}.${field.name}\` \`choices\` must be an array.`);
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
      permissions[operation] = normalizePermissionPolicy(
        policy,
        resourceType,
        operation,
        userResource
      );
    }

    const enabledPolicies = operations.flatMap((operation) => permissionTerms(permissions[operation]));
    const ownershipEnabled = enabledPolicies.some((policy) =>
      ["user", "owner", "owner_or_shared"].includes(policy)
    );

    if (
      operations.includes("create") &&
      (hasPermissionTerm(permissions.update, "owner") ||
        hasPermissionTerm(permissions.delete, "owner") ||
        hasPermissionTerm(permissions.list, "owner") ||
        hasPermissionTerm(permissions.retrieve, "owner") ||
        hasPermissionTerm(permissions.list, "owner_or_shared") ||
        hasPermissionTerm(permissions.retrieve, "owner_or_shared")) &&
      hasPermissionTerm(permissions.create, "public")
    ) {
      throw new Error(
        `Resource \`${resourceType}\` cannot use owner-based rules if \`create\` is public.`
      );
    }

    if (
      !resource.shareable &&
      (hasPermissionTerm(permissions.list, "owner_or_shared") ||
        hasPermissionTerm(permissions.retrieve, "owner_or_shared"))
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
      if (field.relation.resourceType === "User") {
        field.relation.builtIn = true;
        field.relation.tableName = "users";
      } else if (!target) {
        throw new Error(
          `Field \`${resource.type}.${field.name}\` references missing resource type \`${field.relation.resourceType}\`.`
        );
      }
      const targetField = field.relation.targetField || "id";
      if (
        target &&
        targetField !== "id" &&
        !target.fields.some((candidate) => candidate.name === targetField)
      ) {
        throw new Error(
          `Field \`${resource.type}.${field.name}\` references missing field \`${targetField}\` on \`${target.type}\`.`
        );
      }
    }

    resource.queryFilters = buildResourceQueryFilters(resource);
  }

  return {
    meta: {
      configPath: path.normalize(configPath),
      generatedAt: new Date().toISOString(),
    },
    userResource,
    resources: normalizedResources,
  };
}

function normalizeUserResource(resource) {
  const input = resource || {
    type: "User",
    fields: [defaultRoleField()],
  };
  const forbiddenKeys = ["path", "operations", "permissions", "auth", "shareable"];
  for (const key of forbiddenKeys) {
    if (Object.prototype.hasOwnProperty.call(input, key)) {
      throw new Error(`User is a managed resource. Do not configure \`${key}\` on resource \`User\`.`);
    }
  }
  if (!Array.isArray(input.fields) || input.fields.length === 0) {
    throw new Error("Managed resource `User` must define `fields`, including `role`.");
  }

  const reserved = new Set(["id", "username", "password", "password_hash", "created_at"]);
  const seenFieldNames = new Set();
  const fields = input.fields.map((field) => {
    if (!field?.name || !field?.type) {
      throw new Error("Every field in managed resource `User` needs `name` and `type`.");
    }
    if (reserved.has(field.name)) {
      throw new Error(`Field name \`${field.name}\` is reserved in managed resource \`User\`.`);
    }
    if (seenFieldNames.has(field.name)) {
      throw new Error(`Duplicate field \`${field.name}\` in managed resource \`User\`.`);
    }
    seenFieldNames.add(field.name);
    if (field.choices != null && !Array.isArray(field.choices)) {
      throw new Error(`Field \`User.${field.name}\` \`choices\` must be an array.`);
    }

    const normalized = normalizeField(field, "User");
    if (normalized.relation) {
      throw new Error(
        `Field \`User.${field.name}\` cannot be a relation. Managed User fields must be scalar.`
      );
    }
    return normalized;
  });

  const role = fields.find((field) => field.name === "role");
  if (!role) {
    throw new Error("Managed resource `User` must include a `role` field.");
  }
  if (role.type !== "string" || role.storageType !== "string") {
    throw new Error("Managed resource `User.role` must have type `string`.");
  }
  if (!role.required) {
    throw new Error("Managed resource `User.role` must be required.");
  }
  if (!Array.isArray(role.choices) || role.choices.length === 0) {
    throw new Error("Managed resource `User.role` must define `choices`.");
  }
  for (const requiredRole of ["user", "admin"]) {
    if (!role.choices.includes(requiredRole)) {
      throw new Error(`Managed resource \`User.role\` choices must include \`${requiredRole}\`.`);
    }
  }
  if (!Object.prototype.hasOwnProperty.call(role, "default")) {
    throw new Error("Managed resource `User.role` must define `default`.");
  }

  return {
    type: "User",
    tableName: "users",
    fields,
  };
}

function defaultRoleField() {
  return {
    name: "role",
    type: "string",
    required: true,
    default: "user",
    choices: ["user", "admin"],
    query: true,
  };
}

function normalizePermissionPolicy(policy, resourceType, operation, userResource) {
  const terms = permissionTerms(policy);
  if (terms.length === 0) {
    throw new Error(`Permission policy on ${resourceType}.${operation} must not be empty.`);
  }
  if (terms.includes("public") && terms.length > 1) {
    throw new Error(
      `Permission policy on ${resourceType}.${operation} cannot combine \`public\` with other policies.`
    );
  }
  if (operation === "create" && terms.includes("owner_or_shared")) {
    throw new Error(
      `Permission policy on ${resourceType}.create cannot use \`owner_or_shared\`.`
    );
  }

  const roleChoices = userResource.fields.find((field) => field.name === "role")?.choices || [];
  const seen = new Set();
  for (const term of terms) {
    if (typeof term !== "string" || term.trim() === "") {
      throw new Error(`Permission policy on ${resourceType}.${operation} must use strings.`);
    }
    if (seen.has(term)) {
      throw new Error(`Duplicate permission policy \`${term}\` on ${resourceType}.${operation}.`);
    }
    seen.add(term);
    if (!ALLOWED_POLICIES.has(term) && !roleChoices.includes(term)) {
      throw new Error(
        `Unsupported permissions policy \`${term}\` on ${resourceType}.${operation}.`
      );
    }
  }

  return Array.isArray(policy) ? terms : terms[0];
}

function permissionTerms(policy) {
  if (Array.isArray(policy)) {
    return policy;
  }
  return [policy];
}

function hasPermissionTerm(policy, term) {
  return permissionTerms(policy).includes(term);
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

  const normalized = {
    name: field.name,
    type: authoredType,
    storageType,
    required: Boolean(field.required),
    ...(Object.prototype.hasOwnProperty.call(field, "default")
      ? { default: normalizeDefaultValue(field.default, storageType, resourceType, field.name) }
      : {}),
    ...(Array.isArray(field.choices)
      ? { choices: normalizeChoices(field.choices, storageType, resourceType, field.name) }
      : {}),
    relation,
    query: normalizeQueryConfig(field.query, {
      resourceName: resourceType,
      subjectLabel: `field \`${resourceType}.${field.name}\``,
      type: storageType,
      defaultParam: field.name,
      defaultOp: Array.isArray(field.choices) ? "eq" : undefined,
    }),
  };
  if (
    normalized.choices &&
    Object.prototype.hasOwnProperty.call(normalized, "default") &&
    !normalized.choices.some((choice) => Object.is(choice, normalized.default))
  ) {
    throw new Error(
      `Field \`${resourceType}.${field.name}\` default must be one of its \`choices\`.`
    );
  }
  return normalized;
}

function normalizeChoices(choices, storageType, resourceType, fieldName) {
  if (choices.length === 0) {
    throw new Error(`Field \`${resourceType}.${fieldName}\` has empty \`choices\`.`);
  }
  const normalized = choices.map((choice) =>
    normalizeDefaultValue(choice, storageType, resourceType, fieldName)
  );
  const seen = new Set();
  for (const choice of normalized) {
    const key = JSON.stringify(choice);
    if (seen.has(key)) {
      throw new Error(`Field \`${resourceType}.${fieldName}\` has duplicate choice \`${choice}\`.`);
    }
    seen.add(key);
  }
  return normalized;
}

function normalizeDefaultValue(value, storageType, resourceType, fieldName) {
  if (value === null) {
    return null;
  }
  switch (storageType) {
    case "boolean":
      if (typeof value !== "boolean") {
        throw new Error(`Field \`${resourceType}.${fieldName}\` default/choices must be boolean values.`);
      }
      return value;
    case "integer":
      if (!Number.isInteger(value)) {
        throw new Error(`Field \`${resourceType}.${fieldName}\` default/choices must be integers.`);
      }
      return value;
    case "number":
      if (typeof value !== "number" || !Number.isFinite(value)) {
        throw new Error(`Field \`${resourceType}.${fieldName}\` default/choices must be numbers.`);
      }
      return value;
    default:
      if (typeof value !== "string") {
        throw new Error(`Field \`${resourceType}.${fieldName}\` default/choices must be strings.`);
      }
      return value;
  }
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
      choices: field.choices || null,
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
