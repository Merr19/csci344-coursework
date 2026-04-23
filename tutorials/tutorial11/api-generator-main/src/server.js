const fs = require("fs");
const http = require("http");
const path = require("path");
const express = require("express");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");
const { initDatabase } = require("./runtime/db");
const { registerAuthRoutes } = require("./runtime/auth");
const { registerGeneratedResources } = require("./runtime/crud");
const { registerCustomRoutes } = require("./routes/custom");

async function main() {
  const projectRoot = path.resolve(__dirname, "..");
  const generatedConfigPath = path.join(projectRoot, "generated", "config.json");
  const generatedDocsPath = path.join(projectRoot, "generated", "docs", "routes.json");
  const generatedOpenApiPath = path.join(projectRoot, "generated", "docs", "openapi.json");
  const generatedRoutesPath = path.join(projectRoot, "generated", "routes", "index.js");

  if (!fs.existsSync(generatedConfigPath)) {
    console.error("Missing generated/config.json. Run `npm run generate` first.");
    process.exit(1);
  }
  
  if (!fs.existsSync(generatedRoutesPath)) {
    console.error("Missing generated/routes/index.js. Run `npm run generate` first.");
    process.exit(1);
  }

  const generatedConfig = JSON.parse(fs.readFileSync(generatedConfigPath, "utf8"));
  const docs = fs.existsSync(generatedDocsPath)
    ? JSON.parse(fs.readFileSync(generatedDocsPath, "utf8"))
    : null;
  const openApi = fs.existsSync(generatedOpenApiPath)
    ? JSON.parse(fs.readFileSync(generatedOpenApiPath, "utf8"))
    : null;
  const generatedResources = require(generatedRoutesPath);

  const db = initDatabase(projectRoot);
  const app = express();

  app.use(cors());
  app.use(express.json());

  function sendGeneratedConfig(_req, res) {
    res.type("application/json").json(generatedConfig);
  }

  app.get("/api/docs.json", (_req, res) => {
    res.json(docs);
  });
  app.get("/api/openapi.json", (_req, res) => {
    res.json(openApi);
  });

  /*
   * Generated API config for the data grid and tools.
   * Prefer /api/generator-config (no ".json" in path — avoids odd proxies / old builds).
   */
  app.get("/api/generator-config", sendGeneratedConfig);
  app.get("/api/schema", sendGeneratedConfig);
  app.get("/api/docs/schema.json", sendGeneratedConfig);
  app.get("/generator-config.json", sendGeneratedConfig);

  const spreadsheetHtmlPath = path.join(projectRoot, "public", "_framework", "data-grid.html");

  function spreadsheetRedirectQuerySuffix(req) {
    const i = req.originalUrl.indexOf("?");
    return i === -1 ? "" : req.originalUrl.slice(i);
  }

  app.get("/spreadsheet", (_req, res) => {
    res.type("html").sendFile(spreadsheetHtmlPath);
  });

  app.get("/data-grid.html", (req, res) => {
    res.redirect(301, `/spreadsheet${spreadsheetRedirectQuerySuffix(req)}`);
  });

  app.get("/_framework/data-grid.html", (req, res) => {
    res.redirect(301, `/spreadsheet${spreadsheetRedirectQuerySuffix(req)}`);
  });

  app.use(express.static(path.join(projectRoot, "public")));

  app.get("/", (_req, res) => {
    res.type("html").send(renderHomePage(generatedConfig));
  });

  app.use(
    "/api/docs",
    swaggerUi.serve,
    swaggerUi.setup(openApi, {
      explorer: true,
      swaggerOptions: {
        persistAuthorization: true,
      },
      customSiteTitle: "API Generator Docs",
    })
  );

  registerAuthRoutes(app, db);
  registerCustomRoutes(app, db);
  registerGeneratedResources(app, db, generatedResources);

  app.use((err, _req, res, _next) => {
    console.error(err);
    const status = Number(err.statusCode || err.status) || 500;
    const hideDetails = process.env.NODE_ENV === "production" && status >= 500;
    res.status(status).json({
      error: hideDetails ? "Unexpected server error." : err.message || String(err),
    });
  });

  const requestedPort = Number(process.env.PORT || 3100);
  const { port, usedFallback } = await listenOnAvailablePort(app, requestedPort);
  if (usedFallback) {
    console.log(`Port ${requestedPort} is already in use. Started on http://localhost:${port} instead.`);
  } else {
    console.log(`API generator starter app listening on http://localhost:${port}`);
  }
  console.log(
    "GET generated config (for data grid): /api/generator-config  (also /api/schema, /api/docs/schema.json)"
  );
  console.log("Data spreadsheet UI: /spreadsheet");
}

async function listenOnAvailablePort(app, requestedPort) {
  for (let offset = 0; offset < 20; offset += 1) {
    const port = requestedPort + offset;
    try {
      await listenOnPort(app, port);
      return {
        port,
        usedFallback: offset > 0,
      };
    } catch (error) {
      if (error?.code !== "EADDRINUSE") {
        throw error;
      }
    }
  }

  throw new Error(`Could not find an open port starting at ${requestedPort}.`);
}

function listenOnPort(app, port) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);

    function handleError(error) {
      server.off("listening", handleListening);
      reject(error);
    }

    function handleListening() {
      server.off("error", handleError);
      resolve(server);
    }

    server.once("error", handleError);
    server.once("listening", handleListening);
    server.listen(port);
  });
}

function renderHomePage(generatedConfig) {
  return `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>API Generator Starter</title>
      <link rel="stylesheet" href="/_framework/styles/home.css" />
    </head>
    <body>
      <main class="shell">
        <section class="hero">
          <div class="hero-card">
            <h1>API Generator Starter</h1>
            <p>
              Edit <code>api.config.yaml</code>, generate your API, and test it in the browser.
            </p>
            <div class="actions">
              <a class="button primary" href="/api/docs">Open Interactive Docs</a>
              <a class="button secondary" href="/spreadsheet">Data spreadsheet</a>
            </div>
            <div class="hero-meta">
              <span>Generated from <strong>${escapeHtml(generatedConfig.meta.configPath)}</strong></span>
              <span>${generatedConfig.resources.length} resource${generatedConfig.resources.length === 1 ? "" : "s"}</span>
              <span>Built-in auth included</span>
            </div>
          </div>

          <aside class="hero-side hero-card">
            <div>
              <h2>Quick Start</h2>
              <ol>
                <li>Edit <code>api.config.yaml</code></li>
                <li>Run <code>npm run validate</code></li>
                <li>Run <code>npm run generate</code></li>
                <li>Run <code>npm start</code></li>
                <li>Test requests in <code>/api/docs</code></li>
              </ol>
            </div>
            <div class="warning">
              <strong>Important:</strong> running <code>npm run generate</code> recreates the local
              SQLite database from scratch based on the latest schema.
            </div>
          </aside>
        </section>
      </main>
    </body>
  </html>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
