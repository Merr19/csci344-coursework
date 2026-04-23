# API Generator Starter

Edit [`api.config.yaml`](api.config.yaml), run a few commands, and you get a SQLite-backed REST API you can try in the browser.

**On this page:** [Quick start](#quick-start) · [Going deeper](#going-deeper)

## Quick start

You need **Node.js** and **npm** installed.

1. `npm install`
1. Edit [`api.config.yaml`](api.config.yaml) to describe your resources (the bundled file is a working example).
1. `npm run validate`
1. `npm run generate` (the CLI will ask for confirmation; use `npm run generate -- --yes` in scripts)
1. `npm start`
1. Open **`/api/docs`** in the browser — use the **same host and port** printed in the terminal (often `http://localhost:3100`).

**Try the API:** each fresh database includes **`admin` / `password`** and **`user` / `password`**. Use **Authorize** in `/api/docs` with a token from `POST /auth/login` when an endpoint requires auth.

**Important:** `npm run generate` **deletes and recreates** [`data/app.db`](data/app.db) and replaces everything under [`generated/`](generated/). Treat it as a full reset, not a small edit.

**Optional:** to load the generated CSV spreadsheets into the database, run `npm run seed` (see [Seed data](#seed-data) below).

## Going deeper

### What you get for free

The starter adds (you do **not** declare these in the YAML):

- the `users` table and `POST /auth/register`, `POST /auth/login`, `GET /auth/me`
- a global `shares` table for resources marked shareable in the DSL
- SQLite in `data/app.db`; seed templates default to `data/sample-data/` when you generate

### Project layout and what to edit

Folders at a glance:

- **`api.config.yaml`** — your API description (DSL)
- **`generated/`** — output of `npm run generate` (do not edit by hand)
- **`src/`** — framework code; the usual student hook is **`src/routes/custom.js`**
- **`data/`** — local state (often gitignored): `app.db`, **`sample-data/`** (seed CSVs + `order.json`), **`csv-export/`** (from `npm run export:csv`)
- **`public/`** — static files: **`_framework/`** (course UI, do not edit), **`student/`** (your assets), **`generated-config.json`** (overwritten on generate)

Inside `src/`, the CLIs live under `src/cli/` (`validate.js`, `generate.js`, `seed.js`, `exportCsv.js`, …) and the server in `src/server.js` plus `src/runtime/`.

**What you may edit**

| Path | You should… |
| --- | --- |
| `api.config.yaml` | Edit freely — it is the DSL for your API. |
| `data/sample-data/*.csv` (or your `meta.seedDir` folder) | Edit to customize seed data. On each `npm run generate`, existing root `*.csv`, `order.json`, and `README.txt` are moved into `archive/<timestamp>/` first. |
| `public/student/**` | Edit — add your own static assets here. |
| `src/routes/custom.js` | Edit — add custom Express routes here. |
| `generated/**` | **Do not edit** — recreated by `npm run generate`. |
| `public/generated-config.json` | **Do not edit** — overwritten by `npm run generate`. |
| `public/_framework/**` | **Do not edit** — course UI. |
| `src/**` except `src/routes/custom.js` | **Do not edit** for typical course work. |
| `data/app.db` | **Recreated** when you generate; not for hand edits. |
| `data/csv-export/**` | Safe to delete; recreate with `npm run export:csv`. |

`npm run generate` refreshes `generated/`, `public/generated-config.json`, and `data/app.db`, and unless you pass `--no-seed` it rewrites seed files after archiving the previous root seed files as in the table.

### Validate and the DSL

```bash
npm run validate
```

The validator checks YAML syntax, resource shape, field types, operations, permission names, relation targets, typed relation fields (foreign keys and nested objects in responses), and `shareable: true` when `owner_or_shared` is used. On success it prints a short summary of your resources plus built-in framework pieces.

**DSL feature summary**

- Resources: capitalized `type` (e.g. `Order`), optional `path`, `fields`, `operations`
- Scalar types: `string`, `text`, `integer`, `number`, `boolean`, `date`, `datetime`, `image_url`
- Relations: field `type` is the related resource’s `type` (e.g. `type: Sneaker`); column name matches the field; writes use an id, reads return a nested object
- Permissions per operation: `public`, `user`, `owner`, `owner_or_shared`
- `shareable: true` for resources that support sharing

### Query filters

List endpoints can expose query parameters for selected fields, including relation fields (filter by related record id).

Use `query: true` for the default behavior:

```yaml
resources:
  - type: Photo
    path: /api/photos
    operations: [list, retrieve, create, update, delete]
    fields:
      - name: title
        type: string
        query: true
    permissions:
      list: public
      retrieve: public
      create: user
      update: owner
      delete: owner

  - type: Comment
    path: /api/comments
    operations: [list, retrieve, create, update, delete]
    fields:
      - name: body
        type: text
      - name: photo
        type: Photo
        required: true
        query: true
    permissions:
      list: public
      retrieve: public
      create: user
      update: owner
      delete: owner
```

Defaults:

- `string`, `text`, and `image_url` use `contains`
- `boolean`, `integer`, `number`, `date`, `datetime`, and foreign-key fields use `eq`
- ownership-enabled resources also support `owner_id` with exact matching

Object form for custom param name or operator:

```yaml
fields:
  - name: title
    type: string
    query:
      param: q
      op: contains
```

Examples: `GET /api/photos?title=sunset`, `GET /api/comments?photo=3`, `GET /api/comments?owner_id=1`

### Generate

```bash
npm run generate
```

Besides refreshing `generated/`, it recreates **`data/app.db`** from the latest schema and (by default) writes seed CSVs under **`data/sample-data/`** (override with `meta.seedDir` in YAML or `--seed-dir=<dir>`). Do not hand-edit `generated/` — it is build output.

**Flags**

- `--no-seed` — skip writing seed CSV templates (nothing is archived in the seed folder that run)
- `--headers-only` — CSV headers only, no sample rows
- `--seed-dir=<dir>` — put seed templates in another project-relative directory

**Archiving:** before rewriting seeds, existing root `*.csv`, `order.json`, and `README.txt` in the seed directory move to `<seedDir>/archive/<YYYY-MM-DD_HH-mm-ss>/`.

**Scripts:** pass `--yes` to skip the destructive prompt. If `npm start` / `npm run dev` cannot bind the requested port, the server tries the next ports and prints the URL it chose.

Custom schema or data outside the generated model is not migrated automatically; that would be a separate story later.

### Seed data

After `npm run generate`, **`data/sample-data/`** holds CSV files and `order.json`. **`npm run seed`** ([`src/cli/seed.js`](src/cli/seed.js)) loads them into SQLite. Use the same `--seed-dir` or `meta.seedDir` you used for generate if you overrode the default.

Typical flow: `npm run generate` → `npm run seed` → `npm start`. Both commands ask for confirmation; use `--yes` when automating.

Built-in users remain `admin` / `password` and `user` / `password`. **`users.csv`** adds demo users `user1`–`user4`; seeding uses **`admin`** as owner for ownership-enabled rows. Passwords are for local dev only.

**Foreign keys:** sample rows use `1`, `2`, … in FK columns matching empty-database auto-increment order (see `data/sample-data/order.json` by default). If you inserted rows manually first, fix the CSV or run `npm run generate` again before seeding.

**Old layout:** if you still have a top-level `sample-data/` folder from an older template, move its contents into `data/sample-data/` or delete it and run `npm run generate` again.

### Export to CSV

```bash
npm run export:csv
```

Reads `data/app.db` by default and writes one CSV per table under **`data/csv-export/`** — database snapshots, not the same as editable seed templates in **`data/sample-data/`**. See `npm run export:csv -- --help` for `--out-dir` and `--tables`.

### Try the API in the browser

**Interactive docs (start here):** open **`/api/docs`** on the same origin as the server. The page lists generated routes, shows schemas, supports **Authorize** with a bearer token, and is similar in spirit to FastAPI’s docs. Related JSON: `/api/openapi.json`, `/api/docs.json`. Routes you add in `src/routes/custom.js` do not appear here unless you document them separately.

**Data spreadsheet:** Tabulator UI at **`/spreadsheet`** (Express serves the same page as `public/_framework/data-grid.html`; `/data-grid.html` and `/_framework/data-grid.html` redirect here). Use it while `npm start` is running on the **same host and port** so API calls stay same-origin. If the page is opened elsewhere, use e.g. `/spreadsheet?api=http://127.0.0.1:3100` or set `window.__API_BASE__` before the script loads. Log in like Swagger, then browse/edit resources; there is also a small **User management** form for `POST /auth/register`. The grid reads `GET /api/generator-config` (with fallbacks) and `/generated-config.json` from `public/`. If you see 404s, restart `npm start` from this repo.

Local development only — do not ship this pattern unchanged to production without a security review.

### Examples (curl)

Optional `curl` flows (replace host/port with yours):

Register:

```bash
curl -X POST http://localhost:3100/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"password"}'
```

Login:

```bash
curl -X POST http://localhost:3100/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"password"}'
```

Create a record with the token (paths and body fields must match your `api.config.yaml`; example matches bundled **Sneaker** — `brand` is a foreign key, use an existing brand id):

```bash
curl -X POST http://localhost:3100/api/sneakers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"name":"Trail Runner","brand":1,"price":129.99,"photo":"https://example.com/photo.jpg","size":10,"is_available":true,"description":"Demo sneaker"}'
```

Share a record (only for `shareable: true` resources; replace path and ids):

```bash
curl -X POST http://localhost:3100/api/your-shareable-resource/1/shares \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"username":"bob"}'
```

### Where next

1. Shape your data in `api.config.yaml`
2. Generate and try **`/api/docs`** (and optionally **`/spreadsheet`**)
3. Add custom routes in `src/routes/custom.js` when you need behavior the DSL does not cover

### Other notes

This starter targets **local SQLite**. The layout is small on purpose so a **Postgres** adapter could sit behind `DATABASE_URL` later (e.g. Railway) — not included today.
