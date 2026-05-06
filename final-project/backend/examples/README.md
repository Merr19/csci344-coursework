# Example APIs

Store alternate API examples here, with each example keeping its YAML and seed data together.

Recommended structure:

```text
examples/
  plants/
    api.config.yaml
    seed/
      users.csv
      plant-types.csv
      plants.csv
      order.json
  sneakers/
    api.config.yaml
    seed/
      users.csv
      brands.csv
      sneakers.csv
      order.json
```

From the root of your API Generator Directory, load one of the sample APIs:

```
npm run build:example -- --dir sneakers
npm run build:example -- --dir plants
```

`build:example` options:

- `--dir <name>` (required)
- `--yes` (skip confirmation prompt)

`build:example` now also overwrites root `api.config.yaml` and `data/sample-data` from the selected example before regenerating + reseeding.

Create a new example from the currently active project/database:

```
npm run export:example
npm run export:example -- --dir my-new-example
npm run export:example -- --dir my-new-example --yes
```

`export:example` options:

- `--dir <name>` (optional; prompt if omitted)
- `--config <path>` (optional source config override)
- `--seed-dir <path>` (optional layout hint/source override)
- `--yes` (overwrite existing target folder)
- `--help`