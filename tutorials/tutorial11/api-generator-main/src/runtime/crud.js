const express = require("express");
const { optionalAuth, requireAuth } = require("./auth");

function registerGeneratedResources(app, db, resources) {
  const resourceMap = new Map(resources.map((resource) => [resource.type, resource]));
  for (const resource of resources) {
    app.use(resource.path, buildCrudRouter(db, resource, resourceMap));
  }
}

function buildCrudRouter(db, resource, resourceMap) {
  const router = express.Router();

  if (resource.operations.includes("list")) {
    router.get("/", optionalAuth, (req, res) => {
      if (!ensureCollectionPolicy(resource.permissions.list, req, res)) {
        return;
      }

      const { filters, error } = buildQueryFilters(resource, req.query);
      if (error) {
        res.status(400).json({ error });
        return;
      }

      const rows = listRows(db, resource, req.user, filters);
      const payload = rows.map((row) => shapeRecord(db, resourceMap, resource, row));
      res.json(payload);
    });
  }

  if (resource.operations.includes("retrieve")) {
    router.get("/:id", optionalAuth, (req, res) => {
      const row = getAccessibleRow(db, resource, req.params.id, req.user, resource.permissions.retrieve);
      if (row === null) {
        res.status(404).json({ error: "Record not found." });
        return;
      }
      if (row === false) {
        res.status(401).json({ error: "Authentication required." });
        return;
      }

      res.json(shapeRecord(db, resourceMap, resource, row));
    });
  }

  if (resource.operations.includes("create")) {
    router.post("/", requirePolicyMiddleware(resource.permissions.create), (req, res, next) => {
      const validationError = validateBody(resource, req.body, false);
      if (validationError) {
        res.status(400).json({ error: validationError });
        return;
      }

      const body = sanitizeBody(resource, req.body);
      const fieldNames = resource.fields.map((field) => field.name);
      const values = fieldNames.map((fieldName) => body[fieldName] ?? null);

      if (resource.ownershipEnabled) {
        fieldNames.unshift("owner_id");
        values.unshift(req.user.sub);
      }

      const placeholders = fieldNames.map(() => "?").join(", ");
      let result;
      try {
        result = db
          .prepare(
            `INSERT INTO ${resource.tableName} (${fieldNames.join(", ")}) VALUES (${placeholders})`
          )
          .run(...values);
      } catch (err) {
        if (isSqliteConstraintError(err)) {
          res.status(400).json({ error: err.message });
          return;
        }
        return next(err);
      }

      const created = db
        .prepare(`SELECT * FROM ${resource.tableName} WHERE id = ?`)
        .get(result.lastInsertRowid);

      try {
        res
          .status(201)
          .json(shapeRecord(db, resourceMap, resource, created));
      } catch (err) {
        next(err);
      }
    });
  }

  if (resource.operations.includes("update")) {
    router.patch("/:id", requirePolicyMiddleware(resource.permissions.update), (req, res) => {
      const existing = getAccessibleRow(db, resource, req.params.id, req.user, resource.permissions.update);
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

      const body = sanitizeBody(resource, req.body, true);
      const fieldNames = Object.keys(body);
      if (fieldNames.length === 0) {
        res.status(400).json({ error: "No updatable fields were provided." });
        return;
      }

      const assignments = fieldNames.map((fieldName) => `${fieldName} = ?`).join(", ");
      const values = fieldNames.map((fieldName) => body[fieldName]);

      db.prepare(`UPDATE ${resource.tableName} SET ${assignments} WHERE id = ?`).run(
        ...values,
        req.params.id
      );

      const updated = db
        .prepare(`SELECT * FROM ${resource.tableName} WHERE id = ?`)
        .get(req.params.id);

      res.json(shapeRecord(db, resourceMap, resource, updated));
    });
  }

  if (resource.operations.includes("delete")) {
    router.delete("/:id", requirePolicyMiddleware(resource.permissions.delete), (req, res) => {
      const existing = getAccessibleRow(db, resource, req.params.id, req.user, resource.permissions.delete);
      if (!existing) {
        res.status(existing === false ? 401 : 404).json({
          error: existing === false ? "Authentication required." : "Record not found.",
        });
        return;
      }

      db.prepare(`DELETE FROM ${resource.tableName} WHERE id = ?`).run(req.params.id);
      db.prepare("DELETE FROM shares WHERE resource_type = ? AND resource_id = ?").run(
        resource.type,
        req.params.id
      );

      res.status(204).send();
    });
  }

  if (resource.shareable) {
    router.get("/:id/shares", requireAuth, (req, res) => {
      const owned = db
        .prepare(`SELECT * FROM ${resource.tableName} WHERE id = ? AND owner_id = ?`)
        .get(req.params.id, req.user.sub);
      if (!owned) {
        res.status(404).json({ error: "Record not found." });
        return;
      }

      const shares = db
        .prepare(
          `SELECT s.id, s.shared_with_user_id, u.username, s.created_at
           FROM shares s
           JOIN users u ON u.id = s.shared_with_user_id
           WHERE s.resource_type = ? AND s.resource_id = ?
           ORDER BY u.username`
        )
        .all(resource.type, req.params.id);

      res.json(shares);
    });

    router.post("/:id/shares", requireAuth, (req, res) => {
      const owned = db
        .prepare(`SELECT * FROM ${resource.tableName} WHERE id = ? AND owner_id = ?`)
        .get(req.params.id, req.user.sub);
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
        ? db.prepare("SELECT id, username FROM users WHERE username = ?").get(username)
        : db.prepare("SELECT id, username FROM users WHERE id = ?").get(userId);

      if (!targetUser) {
        res.status(404).json({ error: "Target user not found." });
        return;
      }
      if (targetUser.id === req.user.sub) {
        res.status(400).json({ error: "Owners already have access to their own records." });
        return;
      }

      const result = db
        .prepare(
          `INSERT OR IGNORE INTO shares
             (resource_type, resource_id, shared_with_user_id, shared_by_user_id)
           VALUES (?, ?, ?, ?)`
        )
        .run(resource.type, req.params.id, targetUser.id, req.user.sub);

      if (result.changes === 0) {
        res.status(200).json({
          message: "That user already has access.",
          user: targetUser,
        });
        return;
      }

      const share = db
        .prepare(
          `SELECT id, resource_type, resource_id, shared_with_user_id, shared_by_user_id, created_at
           FROM shares
           WHERE resource_type = ? AND resource_id = ? AND shared_with_user_id = ?`
        )
        .get(resource.type, req.params.id, targetUser.id);

      res.status(201).json({
        ...share,
        username: targetUser.username,
      });
    });

    router.delete("/:id/shares/:shareId", requireAuth, (req, res) => {
      const owned = db
        .prepare(`SELECT * FROM ${resource.tableName} WHERE id = ? AND owner_id = ?`)
        .get(req.params.id, req.user.sub);
      if (!owned) {
        res.status(404).json({ error: "Record not found." });
        return;
      }

      const result = db
        .prepare(
          "DELETE FROM shares WHERE id = ? AND resource_type = ? AND resource_id = ?"
        )
        .run(req.params.shareId, resource.type, req.params.id);

      if (result.changes === 0) {
        res.status(404).json({ error: "Share not found." });
        return;
      }

      res.status(204).send();
    });
  }

  return router;
}

function listRows(db, resource, user, filters = []) {
  const params = [];
  const whereClauses = [];
  let joinSql = "";

  switch (resource.permissions.list) {
    case "public":
    case "user":
      break;
    case "owner":
      whereClauses.push("t.owner_id = ?");
      params.push(user.sub);
      break;
    case "owner_or_shared":
      joinSql = `
        LEFT JOIN shares s
          ON s.resource_type = ?
         AND s.resource_id = t.id
         AND s.shared_with_user_id = ?`;
      params.push(resource.type, user.sub);
      whereClauses.push("(t.owner_id = ? OR s.shared_with_user_id = ?)");
      params.push(user.sub, user.sub);
      break;
    default:
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

  return db.prepare(sql).all(...params);
}

function buildQueryFilters(resource, rawQuery) {
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

    const parsed = parseQueryValue(filter, rawValue);
    if (parsed.skip) {
      continue;
    }
    if (parsed.error) {
      return {
        filters: [],
        error: `Query parameter \`${filter.param}\` ${parsed.error}`,
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

function parseQueryValue(field, rawValue) {
  const value = String(rawValue ?? "").trim();
  if (value === "") {
    return { skip: true, value: null, error: null };
  }

  switch (field.storageType || field.type) {
    case "boolean": {
      const lower = value.toLowerCase();
      if (lower === "true" || value === "1") {
        return { skip: false, value: 1, error: null };
      }
      if (lower === "false" || value === "0") {
        return { skip: false, value: 0, error: null };
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

function getAccessibleRow(db, resource, id, user, policy) {
  switch (policy) {
    case "public":
      return db.prepare(`SELECT * FROM ${resource.tableName} WHERE id = ?`).get(id) || null;
    case "user":
      return user
        ? db.prepare(`SELECT * FROM ${resource.tableName} WHERE id = ?`).get(id) || null
        : false;
    case "owner":
      return user
        ? db
            .prepare(`SELECT * FROM ${resource.tableName} WHERE id = ? AND owner_id = ?`)
            .get(id, user.sub) || null
        : false;
    case "owner_or_shared":
      if (!user) {
        return false;
      }
      return (
        db
          .prepare(
            `SELECT DISTINCT t.*
             FROM ${resource.tableName} t
             LEFT JOIN shares s
               ON s.resource_type = ?
              AND s.resource_id = t.id
              AND s.shared_with_user_id = ?
             WHERE t.id = ? AND (t.owner_id = ? OR s.shared_with_user_id = ?)`
          )
          .get(resource.type, user.sub, id, user.sub, user.sub) || null
      );
    default:
      return null;
  }
}

function shapeRecord(db, resourceMap, resource, record, depth = 0) {
  if (!record) {
    return null;
  }

  const owner = getOwnerRecord(db, resource, record);
  const shaped = { ...record };

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
    if (!target) {
      continue;
    }

    const foreignValue = record[field.name];
    if (foreignValue == null) {
      shaped[field.name] = null;
      continue;
    }

    const relatedRecord = db
      .prepare(`SELECT * FROM ${target.tableName} WHERE ${field.relation.targetField || "id"} = ?`)
      .get(foreignValue);

    shaped[field.name] = shapeRecord(db, resourceMap, target, relatedRecord, depth + 1);
  }

  return shaped;
}

function getOwnerRecord(db, resource, record) {
  if (!resource.ownershipEnabled || record.owner_id == null) {
    return null;
  }

  return (
    db
      .prepare("SELECT id, username, created_at FROM users WHERE id = ?")
      .get(record.owner_id) || null
  );
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
      return `Field \`${field.name}\` is required.`;
    }
    if (value !== undefined && value !== null && !isValidType(field.storageType, value)) {
      if (field.relation) {
        return `Field \`${field.name}\` must be an integer id for \`${field.type}\`.`;
      }
      return `Field \`${field.name}\` must be of type \`${field.type}\`.`;
    }
  }

  return null;
}

function sanitizeBody(resource, body, partial = false) {
  const clean = {};
  for (const field of resource.fields) {
    if (Object.prototype.hasOwnProperty.call(body, field.name)) {
      clean[field.name] = normalizeValue(field.storageType, body[field.name]);
    } else if (!partial) {
      clean[field.name] = null;
    }
  }
  return clean;
}

function normalizeValue(type, value) {
  if (value == null) {
    return null;
  }
  if (type === "boolean") {
    return value ? 1 : 0;
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
  if (policy === "public") {
    return (_req, _res, next) => next();
  }
  return requireAuth;
}

/** better-sqlite3 throws SqliteError with code SQLITE_* */
function isSqliteConstraintError(err) {
  return Boolean(
    err &&
      typeof err.code === "string" &&
      err.code.startsWith("SQLITE_") &&
      err.code !== "SQLITE_BUSY" &&
      err.code !== "SQLITE_LOCKED"
  );
}

function ensureCollectionPolicy(policy, req, res) {
  if (policy === "public") {
    return true;
  }
  if (!req.user) {
    res.status(401).json({ error: "Authentication required." });
    return false;
  }
  return true;
}

module.exports = {
  registerGeneratedResources,
};
