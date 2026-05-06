const express = require("express");
const { optionalAuth, requireAuth } = require("./auth");

function registerGeneratedResources(app, db, resources, config = {}) {
  const resourceMap = new Map(resources.map((resource) => [resource.type, resource]));
  for (const resource of resources) {
    app.use(resource.path, buildCrudRouter(db, resource, resourceMap, config));
  }
}

function buildCrudRouter(db, resource, resourceMap, config = {}) {
  const router = express.Router();

  if (resource.operations.includes("list")) {
    router.get("/", optionalAuth, async (req, res) => {
      if (!ensureCollectionPolicy(resource.permissions.list, req, res)) {
        return;
      }

      const { filters, error } = buildQueryFilters(db, resource, req.query);
      if (error) {
        res.status(400).json({ error });
        return;
      }

      const rows = await listRows(db, resource, req.user, filters);
      const payload = await Promise.all(
        rows.map((row) => shapeRecord(db, resourceMap, resource, row, config))
      );
      res.json(payload);
    });
  }

  if (resource.operations.includes("retrieve")) {
    router.get("/:id", optionalAuth, async (req, res) => {
      const row = await getAccessibleRow(
        db,
        resource,
        req.params.id,
        req.user,
        resource.permissions.retrieve
      );
      if (row === null) {
        res.status(404).json({ error: "Record not found." });
        return;
      }
      if (row === false) {
        res.status(401).json({ error: "Authentication required." });
        return;
      }

      res.json(await shapeRecord(db, resourceMap, resource, row, config));
    });
  }

  if (resource.operations.includes("create")) {
    router.post("/", requirePolicyMiddleware(resource.permissions.create), async (req, res, next) => {
      const validationError = validateBody(resource, req.body, false);
      if (validationError) {
        res.status(400).json({ error: validationError });
        return;
      }

      const body = sanitizeBody(db, resource, req.body);
      const fieldNames = resource.fields.map((field) => field.name);
      const values = fieldNames.map((fieldName) => body[fieldName] ?? null);

      if (resource.ownershipEnabled) {
        fieldNames.unshift("owner_id");
        values.unshift(req.user.sub);
      }

      const placeholders = fieldNames.map(() => "?").join(", ");
      let result;
      try {
        result = await db.run(
          `INSERT INTO ${resource.tableName} (${fieldNames.join(", ")}) VALUES (${placeholders})`,
          values
        );
      } catch (err) {
        if (db.isConstraintError(err)) {
          res.status(400).json({ error: err.message });
          return;
        }
        return next(err);
      }

      const created = await db.get(`SELECT * FROM ${resource.tableName} WHERE id = ?`, [
        result.lastInsertRowid,
      ]);

      try {
        res.status(201).json(await shapeRecord(db, resourceMap, resource, created, config));
      } catch (err) {
        next(err);
      }
    });
  }

  if (resource.operations.includes("update")) {
    router.patch("/:id", requirePolicyMiddleware(resource.permissions.update), async (req, res) => {
      const existing = await getAccessibleRow(
        db,
        resource,
        req.params.id,
        req.user,
        resource.permissions.update
      );
      if (!existing) {
        res.status(existing === false ? 401 : 404).json({
          error: existing === false ? "Authentication required." : "Record not found.",
        });
        return;
      }

      const validationError = validateBody(resource, req.body, true);
      if (validationError) {
        res.status(400).json({ error: validationError });
        return;
      }

      const body = sanitizeBody(db, resource, req.body, true);
      const fieldNames = Object.keys(body);
      if (fieldNames.length === 0) {
        res.status(400).json({ error: "No updatable fields were provided." });
        return;
      }

      const assignments = fieldNames.map((fieldName) => `${fieldName} = ?`).join(", ");
      const values = fieldNames.map((fieldName) => body[fieldName]);

      await db.run(`UPDATE ${resource.tableName} SET ${assignments} WHERE id = ?`, [
        ...values,
        req.params.id,
      ]);

      const updated = await db.get(`SELECT * FROM ${resource.tableName} WHERE id = ?`, [
        req.params.id,
      ]);

      res.json(await shapeRecord(db, resourceMap, resource, updated, config));
    });
  }

  if (resource.operations.includes("delete")) {
    router.delete("/:id", requirePolicyMiddleware(resource.permissions.delete), async (req, res) => {
      const existing = await getAccessibleRow(
        db,
        resource,
        req.params.id,
        req.user,
        resource.permissions.delete
      );
      if (!existing) {
        res.status(existing === false ? 401 : 404).json({
          error: existing === false ? "Authentication required." : "Record not found.",
        });
        return;
      }

      await db.run(`DELETE FROM ${resource.tableName} WHERE id = ?`, [req.params.id]);
      await db.run("DELETE FROM shares WHERE resource_type = ? AND resource_id = ?", [
        resource.type,
        req.params.id,
      ]);

      res.status(204).send();
    });
  }

  if (resource.shareable) {
    router.get("/:id/shares", requireAuth, async (req, res) => {
      const owned = await db.get(
        `SELECT * FROM ${resource.tableName} WHERE id = ? AND owner_id = ?`,
        [req.params.id, req.user.sub]
      );
      if (!owned) {
        res.status(404).json({ error: "Record not found." });
        return;
      }

      const shares = await db.all(
        `SELECT s.id, s.shared_with_user_id, u.username, s.created_at
         FROM shares s
         JOIN users u ON u.id = s.shared_with_user_id
         WHERE s.resource_type = ? AND s.resource_id = ?
         ORDER BY u.username`,
        [resource.type, req.params.id]
      );

      res.json(shares);
    });

    router.post("/:id/shares", requireAuth, async (req, res) => {
      const owned = await db.get(
        `SELECT * FROM ${resource.tableName} WHERE id = ? AND owner_id = ?`,
        [req.params.id, req.user.sub]
      );
      if (!owned) {
        res.status(404).json({ error: "Record not found." });
        return;
      }

      const username = String(req.body?.username || "").trim();
      const userId = req.body?.user_id;
      if (!username && !userId) {
        res.status(400).json({ error: "Provide `username` or `user_id` to share a record." });
        return;
      }

      const targetUser = username
        ? await db.get("SELECT id, username FROM users WHERE username = ?", [username])
        : await db.get("SELECT id, username FROM users WHERE id = ?", [userId]);

      if (!targetUser) {
        res.status(404).json({ error: "Target user not found." });
        return;
      }
      if (Number(targetUser.id) === Number(req.user.sub)) {
        res.status(400).json({ error: "Owners already have access to their own records." });
        return;
      }

      const share = await insertShareIfMissing(db, resource.type, req.params.id, targetUser.id, req.user.sub);
      if (!share) {
        res.status(200).json({
          message: "That user already has access.",
          user: targetUser,
        });
        return;
      }

      res.status(201).json({
        ...share,
        username: targetUser.username,
      });
    });

    router.delete("/:id/shares/:shareId", requireAuth, async (req, res) => {
      const owned = await db.get(
        `SELECT * FROM ${resource.tableName} WHERE id = ? AND owner_id = ?`,
        [req.params.id, req.user.sub]
      );
      if (!owned) {
        res.status(404).json({ error: "Record not found." });
        return;
      }

      const result = await db.run(
        "DELETE FROM shares WHERE id = ? AND resource_type = ? AND resource_id = ?",
        [req.params.shareId, resource.type, req.params.id]
      );

      if (result.changes === 0) {
        res.status(404).json({ error: "Share not found." });
        return;
      }

      res.status(204).send();
    });
  }

  return router;
}

async function insertShareIfMissing(db, resourceType, resourceId, sharedWithUserId, sharedByUserId) {
  if (db.dialect === "postgres") {
    const result = await db.run(
      `INSERT INTO shares
         (resource_type, resource_id, shared_with_user_id, shared_by_user_id)
       VALUES (?, ?, ?, ?)
       ON CONFLICT (resource_type, resource_id, shared_with_user_id) DO NOTHING`,
      [resourceType, resourceId, sharedWithUserId, sharedByUserId]
    );

    if (result.changes === 0) {
      return null;
    }
  } else {
    const result = await db.run(
      `INSERT OR IGNORE INTO shares
         (resource_type, resource_id, shared_with_user_id, shared_by_user_id)
       VALUES (?, ?, ?, ?)`,
      [resourceType, resourceId, sharedWithUserId, sharedByUserId]
    );

    if (result.changes === 0) {
      return null;
    }
  }

  return db.get(
    `SELECT id, resource_type, resource_id, shared_with_user_id, shared_by_user_id, created_at
     FROM shares
     WHERE resource_type = ? AND resource_id = ? AND shared_with_user_id = ?`,
    [resourceType, resourceId, sharedWithUserId]
  );
}

async function listRows(db, resource, user, filters = []) {
  const params = [];
  const whereClauses = [];
  let joinSql = "";

  const listPolicy = resource.permissions.list;
  if (hasPermissionTerm(listPolicy, "public") || policyAllowsAuthenticatedAccess(listPolicy, user)) {
    // No ownership filter needed.
  } else if (hasPermissionTerm(listPolicy, "owner_or_shared")) {
    joinSql = `
        LEFT JOIN shares s
          ON s.resource_type = ?
         AND s.resource_id = t.id
         AND s.shared_with_user_id = ?`;
    params.push(resource.type, user.sub);
    whereClauses.push("(t.owner_id = ? OR s.shared_with_user_id = ?)");
    params.push(user.sub, user.sub);
  } else if (hasPermissionTerm(listPolicy, "owner")) {
    whereClauses.push("t.owner_id = ?");
    params.push(user.sub);
  } else {
    return [];
  }

  for (const filter of filters) {
    const condition = sqlConditionForFilter(filter);
    if (!condition) {
      continue;
    }
    whereClauses.push(condition.sql);
    params.push(...condition.params);
  }

  const sql = [
    `SELECT DISTINCT t.* FROM ${resource.tableName} t`,
    joinSql,
    whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "",
    "ORDER BY t.id DESC",
  ]
    .filter(Boolean)
    .join("\n");

  return db.all(sql, params);
}

function buildQueryFilters(db, resource, rawQuery) {
  const filters = [];
  for (const filter of resource.queryFilters || []) {
    if (!Object.prototype.hasOwnProperty.call(rawQuery, filter.param)) {
      continue;
    }
    const rawValue = rawQuery[filter.param];
    if (Array.isArray(rawValue)) {
      return {
        filters: [],
        error: `Query parameter \`${filter.param}\` must be provided once.`,
      };
    }

    const parsed = parseQueryValue(db, filter, rawValue);
    if (parsed.skip) {
      continue;
    }
    if (parsed.error) {
      return {
        filters: [],
        error: `Query parameter \`${filter.param}\` ${parsed.error}`,
      };
    }
    if (
      filter.choices &&
      !filter.choices.some((choice) => Object.is(choice, parsed.value))
    ) {
      return {
        filters: [],
        error: `Query parameter \`${filter.param}\` must be one of: ${filter.choices.join(", ")}.`,
      };
    }

    filters.push({
      fieldName: filter.fieldName,
      op: filter.op,
      value: parsed.value,
    });
  }

  return { filters, error: null };
}

function parseQueryValue(db, field, rawValue) {
  const value = String(rawValue ?? "").trim();
  if (value === "") {
    return { skip: true, value: null, error: null };
  }

  switch (field.storageType || field.type) {
    case "boolean": {
      const lower = value.toLowerCase();
      if (lower === "true" || value === "1") {
        return { skip: false, value: db.normalizeBoolean(true), error: null };
      }
      if (lower === "false" || value === "0") {
        return { skip: false, value: db.normalizeBoolean(false), error: null };
      }
      return { skip: false, value: null, error: "must be `true`, `false`, `1`, or `0`." };
    }
    case "integer": {
      if (!/^-?\d+$/.test(value)) {
        return { skip: false, value: null, error: "must be an integer." };
      }
      return { skip: false, value: Number(value), error: null };
    }
    case "number": {
      const parsed = Number(value);
      if (!Number.isFinite(parsed)) {
        return { skip: false, value: null, error: "must be a number." };
      }
      return { skip: false, value: parsed, error: null };
    }
    default:
      return { skip: false, value, error: null };
  }
}

function sqlConditionForFilter(filter) {
  if (filter.op === "contains") {
    return {
      sql: `t.${filter.fieldName} LIKE ? ESCAPE '\\'`,
      params: [`%${escapeLikeValue(filter.value)}%`],
    };
  }

  return {
    sql: `t.${filter.fieldName} = ?`,
    params: [filter.value],
  };
}

function escapeLikeValue(value) {
  return String(value).replace(/[\\%_]/g, "\\$&");
}

async function getAccessibleRow(db, resource, id, user, policy) {
  if (hasPermissionTerm(policy, "public")) {
    return (await db.get(`SELECT * FROM ${resource.tableName} WHERE id = ?`, [id])) || null;
  }
  if (!user) {
    return false;
  }
  if (policyAllowsAuthenticatedAccess(policy, user)) {
    return (await db.get(`SELECT * FROM ${resource.tableName} WHERE id = ?`, [id])) || null;
  }
  if (hasPermissionTerm(policy, "owner_or_shared")) {
    return (
      (await db.get(
        `SELECT DISTINCT t.*
         FROM ${resource.tableName} t
         LEFT JOIN shares s
           ON s.resource_type = ?
          AND s.resource_id = t.id
          AND s.shared_with_user_id = ?
         WHERE t.id = ? AND (t.owner_id = ? OR s.shared_with_user_id = ?)`,
        [resource.type, user.sub, id, user.sub, user.sub]
      )) || null
    );
  }
  if (hasPermissionTerm(policy, "owner")) {
    return (
      (await db.get(`SELECT * FROM ${resource.tableName} WHERE id = ? AND owner_id = ?`, [
        id,
        user.sub,
      ])) || null
    );
  }
  return null;
}

async function shapeRecord(db, resourceMap, resource, record, config = {}, depth = 0) {
  if (!record) {
    return null;
  }

  const owner = await getOwnerRecord(db, resource, record, config);
  const shaped = coerceRecordValues(db, resource, record);

  if (resource.ownershipEnabled) {
    delete shaped.owner_id;
    delete shaped.creator;
    shaped.owner = owner;
  }

  if (depth > 0) {
    return shaped;
  }

  for (const field of resource.fields || []) {
    if (!field.relation) {
      continue;
    }

    const target = resourceMap.get(field.relation.resourceType);
    const foreignValue = record[field.name];
    if (foreignValue == null) {
      shaped[field.name] = null;
      continue;
    }

    if (field.relation.resourceType === "User") {
      shaped[field.name] = await getUserRecord(db, foreignValue, config);
      continue;
    }

    if (!target) {
      continue;
    }

    const relatedRecord = await db.get(
      `SELECT * FROM ${target.tableName} WHERE ${field.relation.targetField || "id"} = ?`,
      [foreignValue]
    );

    shaped[field.name] = await shapeRecord(db, resourceMap, target, relatedRecord, config, depth + 1);
  }

  return shaped;
}

async function getOwnerRecord(db, resource, record, config = {}) {
  if (!resource.ownershipEnabled || record.owner_id == null) {
    return null;
  }

  return getUserRecord(db, record.owner_id, config);
}

async function getUserRecord(db, userId, config = {}) {
  const fields = config.userResource?.fields || [];
  const columns = ["id", "username", ...fields.map((field) => field.name), "created_at"];
  const user = await db.get(
    `SELECT ${columns.map(quoteIdentifier).join(", ")} FROM users WHERE id = ?`,
    [userId]
  );
  if (!user) {
    return null;
  }
  const shaped = { ...user };
  for (const field of fields) {
    if (Object.prototype.hasOwnProperty.call(shaped, field.name)) {
      shaped[field.name] = db.coerceRowValue(field.storageType || field.type, shaped[field.name]);
    }
  }
  return shaped;
}

function coerceRecordValues(db, resource, record) {
  const shaped = { ...record };
  for (const field of resource.fields || []) {
    if (Object.prototype.hasOwnProperty.call(shaped, field.name)) {
      shaped[field.name] = db.coerceRowValue(field.storageType, shaped[field.name]);
    }
  }
  return shaped;
}

function validateBody(resource, body, partial) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return "Request body must be a JSON object.";
  }

  const allowedFields = new Set(resource.fields.map((field) => field.name));
  for (const key of Object.keys(body)) {
    if (!allowedFields.has(key)) {
      return `Unknown field: ${key}`;
    }
  }

  for (const field of resource.fields) {
    const value = body[field.name];
    if (!partial && field.required && (value === undefined || value === null || value === "")) {
      if (!Object.prototype.hasOwnProperty.call(field, "default")) {
        return `Field \`${field.name}\` is required.`;
      }
    }
    if (value !== undefined && value !== null && !isValidType(field.storageType, value)) {
      if (field.relation) {
        return `Field \`${field.name}\` must be an integer id for \`${field.type}\`.`;
      }
      return `Field \`${field.name}\` must be of type \`${field.type}\`.`;
    }
    if (
      value !== undefined &&
      value !== null &&
      field.choices &&
      !field.choices.some((choice) => Object.is(choice, value))
    ) {
      return `Field \`${field.name}\` must be one of: ${field.choices.join(", ")}.`;
    }
  }

  return null;
}

function sanitizeBody(db, resource, body, partial = false) {
  const clean = {};
  for (const field of resource.fields) {
    if (Object.prototype.hasOwnProperty.call(body, field.name)) {
      clean[field.name] = normalizeValue(db, field.storageType, body[field.name]);
    } else if (!partial && Object.prototype.hasOwnProperty.call(field, "default")) {
      clean[field.name] = normalizeValue(db, field.storageType, field.default);
    } else if (!partial) {
      clean[field.name] = null;
    }
  }
  return clean;
}

function normalizeValue(db, type, value) {
  if (value == null) {
    return null;
  }
  if (type === "boolean") {
    return db.normalizeBoolean(value);
  }
  return value;
}

function isValidType(type, value) {
  switch (type) {
    case "string":
    case "image_url":
    case "text":
    case "date":
    case "datetime":
      return typeof value === "string";
    case "integer":
      return Number.isInteger(value);
    case "number":
      return typeof value === "number" && Number.isFinite(value);
    case "boolean":
      return typeof value === "boolean";
    default:
      return true;
  }
}

function requirePolicyMiddleware(policy) {
  if (hasPermissionTerm(policy, "public")) {
    return (_req, _res, next) => next();
  }
  return (req, res, next) => {
    requireAuth(req, res, () => {
      if (
        !policyAllowsAuthenticatedAccess(policy, req.user) &&
        !hasPermissionTerm(policy, "owner") &&
        !hasPermissionTerm(policy, "owner_or_shared")
      ) {
        res.status(403).json({ error: "Permission denied." });
        return;
      }
      next();
    });
  };
}

function ensureCollectionPolicy(policy, req, res) {
  if (hasPermissionTerm(policy, "public")) {
    return true;
  }
  if (!req.user) {
    res.status(401).json({ error: "Authentication required." });
    return false;
  }
  if (
    !policyAllowsAuthenticatedAccess(policy, req.user) &&
    !hasPermissionTerm(policy, "owner") &&
    !hasPermissionTerm(policy, "owner_or_shared")
  ) {
    res.status(403).json({ error: "Permission denied." });
    return false;
  }
  return true;
}

function permissionTerms(policy) {
  return Array.isArray(policy) ? policy : [policy];
}

function hasPermissionTerm(policy, term) {
  return permissionTerms(policy).includes(term);
}

function policyAllowsAuthenticatedAccess(policy, user) {
  if (!user) {
    return false;
  }
  return permissionTerms(policy).some((term) => term === "user" || user.role === term);
}

function quoteIdentifier(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

module.exports = {
  registerGeneratedResources,
};
