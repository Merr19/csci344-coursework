# API Generator Cheatsheet

## Default local workflow

Install dependencies:

```bash
npm install
```

Start the local server:

```bash
npm run dev
```

Rebuild the local database from the default config:

```bash
npm run validate
npm run generate
npm run seed
```

Open:

```text
http://localhost:<port>/api/docs
```

## Default files

- API config: `api.config.yaml`
- Default seed data: `data/sample-data/`
- Custom routes: `src/routes/custom.js`

## YAML permissions quick note

`permissions` entries in `api.config.yaml` support either:

- a single string (`create: user`)
- an array of strings (`create: [service_advisor, technician, admin]`)

## Example workflow

To load one complete example API and its images:

```bash
npm run build:example -- --dir plants
```

That command:

- validates `examples/plants/api.config.yaml`
- overwrites root `api.config.yaml` from the selected example
- overwrites `data/sample-data` from the selected example seed files
- regenerates the backend
- recreates the database
- seeds the example CSV data
- copies example images into `public/student/images/plants`

Other example folders live under `examples/`.

## Important commands

Validate a config:

```bash
npm run validate
```

Generate from the default config:

```bash
npm run generate
```

Seed from the default seed files:

```bash
npm run seed
```

Generate without recreating the database:

```bash
npm run generate:committed
```

Export the current active profile + live DB rows into a new example:

```bash
npm run export:example
npm run export:example -- --dir my-example
npm run export:example -- --dir my-example --yes
```

## Important warnings

- `npm run generate` is destructive. It recreates the database.
- `npm run seed` replaces the database contents with the selected seed data.
- `npm run build:example -- --dir <name>` is also destructive.
- Do not hand-edit `generated/`.

## Authentication

Default users:

- `admin` / `password`
- `user` / `password`

When you run `npm run seed`, ownership-enabled seeded rows are owned by `admin`.

To test protected routes in `/api/docs`:

1. `POST /auth/login`
2. Copy the token
3. Click `Authorize`
4. Paste the token

## Quick mental model

- `api.config.yaml` = default API definition
- `examples/<name>/api.config.yaml` = saved example API definition
- `npm run generate` = rebuild default backend
- `npm run build:example -- --dir <name>` = switch defaults to that example, then rebuild full backend
- `npm run export:example` = export active config + current DB data into `examples/<name>`
- `npm start` / `npm run dev` = run the server
