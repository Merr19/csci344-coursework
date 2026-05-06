const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "dev-only-secret";

function issueToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      username: user.username,
      ...(user.role ? { role: user.role } : {}),
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function optionalAuth(req, _res, next) {
  const token = readBearerToken(req);
  if (!token) {
    req.user = null;
    next();
    return;
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
  } catch (_error) {
    req.user = null;
  }
  next();
}

function requireAuth(req, res, next) {
  const token = readBearerToken(req);
  if (!token) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (_error) {
    res.status(401).json({ error: "Invalid or expired token." });
  }
}

function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user?.role !== "admin") {
      res.status(403).json({ error: "Admin role required." });
      return;
    }
    next();
  });
}

function registerAuthRoutes(app, db, config = {}) {
  const userFields = config.userResource?.fields || [];

  app.post("/auth/register", async (req, res) => {
    const username = String(req.body?.username || "").trim();
    const password = String(req.body?.password || "");

    if (!username || !password) {
      res.status(400).json({ error: "username and password are required." });
      return;
    }

    const existing = await db.get("SELECT id FROM users WHERE username = ?", [username]);
    if (existing) {
      res.status(409).json({ error: "That username is already taken." });
      return;
    }

    const { values: userValues, error } = validateManagedUserBody(db, userFields, req.body || {});
    if (error) {
      res.status(400).json({ error });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const fieldNames = ["username", "password_hash", ...userFields.map((field) => field.name)];
    const values = [
      username,
      passwordHash,
      ...userFields.map((field) => userValues[field.name] ?? null),
    ];
    const placeholders = fieldNames.map(() => "?").join(", ");
    const result = await db.run(
      `INSERT INTO users (${fieldNames.map(quoteIdentifier).join(", ")}) VALUES (${placeholders})`,
      values
    );

    const user = await selectUserById(db, userFields, result.lastInsertRowid);
    res.status(201).json({
      user,
      token: issueToken(user),
    });
  });

  app.post("/auth/login", async (req, res) => {
    const username = String(req.body?.username || "").trim();
    const password = String(req.body?.password || "");

    const user = await db.get("SELECT * FROM users WHERE username = ?", [username]);

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      res.status(401).json({ error: "Invalid username or password." });
      return;
    }

    res.json({
      user: shapeUser(db, userFields, user),
      token: issueToken(user),
    });
  });

  app.get("/auth/me", requireAuth, async (req, res) => {
    const user = await selectUserById(db, userFields, req.user.sub);
    res.json(user);
  });

  app.get("/auth/users", requireAuth, async (_req, res) => {
    const users = await db.all(`${userSelectSql(userFields)} ORDER BY username ASC`);
    res.json(users.map((user) => shapeUser(db, userFields, user)));
  });

  app.patch("/auth/users/:id", requireAuth, async (req, res) => {
    const targetUserId = Number(req.params.id);
    if (!Number.isFinite(targetUserId)) {
      res.status(400).json({ error: "Invalid user id." });
      return;
    }
    const isAdmin = req.user?.role === "admin";
    const isSelf = Number(req.user?.sub) === targetUserId;
    if (!isAdmin && !isSelf) {
      res.status(403).json({ error: "You can only update your own user record." });
      return;
    }

    const disallowed = ["username", "password", "password_hash"];
    for (const key of disallowed) {
      if (Object.prototype.hasOwnProperty.call(req.body || {}, key)) {
        res.status(400).json({ error: `Field \`${key}\` cannot be updated via this endpoint.` });
        return;
      }
    }
    if (Object.prototype.hasOwnProperty.call(req.body || {}, "role") && !isAdmin) {
      res.status(403).json({ error: "Only admins can update user roles." });
      return;
    }

    const { values, updates, error } = validateManagedUserPatchBody(db, userFields, req.body || {});
    if (error) {
      res.status(400).json({ error });
      return;
    }
    if (updates.length === 0) {
      res.status(400).json({ error: "At least one managed User field is required for update." });
      return;
    }

    const existing = await db.get("SELECT id FROM users WHERE id = ?", [targetUserId]);
    if (!existing) {
      res.status(404).json({ error: "User not found." });
      return;
    }

    const assignments = updates.map((fieldName) => `${quoteIdentifier(fieldName)} = ?`).join(", ");
    const updateValues = updates.map((fieldName) => values[fieldName]);
    await db.run(`UPDATE users SET ${assignments} WHERE id = ?`, [...updateValues, targetUserId]);

    const user = await selectUserById(db, userFields, targetUserId);
    res.json(user);
  });
}

async function selectUserById(db, userFields, id) {
  const user = await db.get(`${userSelectSql(userFields)} WHERE id = ?`, [id]);
  return user ? shapeUser(db, userFields, user) : null;
}

function userSelectSql(userFields) {
  const columns = ["id", "username", ...userFields.map((field) => field.name), "created_at"];
  return `SELECT ${columns.map(quoteIdentifier).join(", ")} FROM users`;
}

function shapeUser(db, userFields, user) {
  const shaped = { ...user };
  for (const field of userFields) {
    if (Object.prototype.hasOwnProperty.call(shaped, field.name)) {
      shaped[field.name] = db.coerceRowValue(field.storageType || field.type, shaped[field.name]);
    }
  }
  return shaped;
}

function validateManagedUserBody(db, fields, body) {
  const values = {};
  for (const field of fields) {
    const hasValue = Object.prototype.hasOwnProperty.call(body, field.name);
    const value = hasValue ? body[field.name] : field.default;
    if (field.required && (value === undefined || value === null || value === "")) {
      return { values: {}, error: `Field \`${field.name}\` is required.` };
    }
    if (value === undefined || value === null || value === "") {
      values[field.name] = null;
      continue;
    }
    if (!isValidType(field.storageType, value)) {
      return { values: {}, error: `Field \`${field.name}\` must be of type \`${field.type}\`.` };
    }
    if (field.choices && !field.choices.some((choice) => Object.is(choice, value))) {
      return {
        values: {},
        error: `Field \`${field.name}\` must be one of: ${field.choices.join(", ")}.`,
      };
    }
    values[field.name] = normalizeValue(db, field, value);
  }
  return { values, error: null };
}

function validateManagedUserPatchBody(db, fields, body) {
  const values = {};
  const updates = [];
  const fieldMap = new Map(fields.map((field) => [field.name, field]));

  for (const key of Object.keys(body || {})) {
    const field = fieldMap.get(key);
    if (!field) {
      return {
        values: {},
        updates: [],
        error: `Field \`${key}\` is not editable. Only managed User fields can be updated.`,
      };
    }

    const value = body[key];
    if (value === undefined || value === null || value === "") {
      if (field.required) {
        return { values: {}, updates: [], error: `Field \`${field.name}\` is required.` };
      }
      values[field.name] = null;
      updates.push(field.name);
      continue;
    }
    if (!isValidType(field.storageType, value)) {
      return {
        values: {},
        updates: [],
        error: `Field \`${field.name}\` must be of type \`${field.type}\`.`,
      };
    }
    if (field.choices && !field.choices.some((choice) => Object.is(choice, value))) {
      return {
        values: {},
        updates: [],
        error: `Field \`${field.name}\` must be one of: ${field.choices.join(", ")}.`,
      };
    }

    values[field.name] = normalizeValue(db, field, value);
    updates.push(field.name);
  }

  return { values, updates, error: null };
}

function normalizeValue(db, field, value) {
  if ((field.storageType || field.type) === "boolean") {
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

function quoteIdentifier(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function readBearerToken(req) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) {
    return null;
  }
  return header.slice("Bearer ".length).trim();
}

module.exports = {
  issueToken,
  optionalAuth,
  requireAuth,
  registerAuthRoutes,
};
