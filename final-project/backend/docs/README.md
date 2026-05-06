# API Generator

This folder is the backend that Railway deploys.

## Local

Install dependencies:

```bash
npm install
```

Run locally:

```bash
npm run dev
```

Rebuild the local database from the default config:

```bash
npm run validate
npm run generate
npm run seed
```

## YAML permissions format

In `api.config.yaml`, each permission can be either:

- a single string role/policy, or
- an array of role/policy strings.

Example:

```yaml
permissions:
  list: public
  retrieve: public
  create: [service_advisor, technician, admin]
  update: [service_advisor, technician, admin]
  delete: [admin]
```

## Examples

If you want to see what your API can look like with some sample data, do this:

```bash
npm run build:example -- --dir plants
```

Example folders live under `api-generator/examples`.

### `build:example` options

Use this command to switch the project to an example and rebuild everything from it.

- `--dir <example-name>` (required): example folder under `examples/`
- `--yes` (optional): skip the confirmation prompt

What it does:

- overwrites root `api.config.yaml` from `examples/<dir>/api.config.yaml`
- overwrites `data/sample-data` from that example's seed files
- regenerates artifacts, recreates `data/app.db`, and seeds the database

Examples:

```bash
npm run build:example -- --dir plants
npm run build:example -- --dir sneakers --yes
```

### `export:example` options

Use this command to create a new example folder from the currently active project/database state.

- `--dir <example-name>`: output folder name under `examples/` (if omitted, prompts interactively)
- `--config <path>`: source config path override (default: active generated profile)
- `--seed-dir <path>`: layout hint for where exported seed files are written (`seed/` vs root), defaulting from active profile metadata
- `--yes`: overwrite existing `examples/<dir>` without prompt
- `--help`: print usage

What it does:

- writes `examples/<dir>/api.config.yaml`
- exports CSV seed files from the current database into the new example
- writes `order.json`
- copies `public/student/images/<source-example>` into `examples/<dir>/images` when available

Examples:

```bash
npm run export:example
npm run export:example -- --dir video-games-copy
npm run export:example -- --dir plants-db --yes
```
