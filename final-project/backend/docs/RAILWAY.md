## Railway

Railway uses `api-generator/railway.json`.

The current deploy path is set up to:

1. rebuild the `plants` example in Postgres
2. seed that example
3. start the server

Current Railway start command:

```bash
npm run start:railway:plants
```

Required Railway variables:

```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_SECRET=your-secret
NODE_ENV=production
```

## Notes

- `npm run generate` is destructive and recreates the database.
- `npm run build:example -- --dir <name>` is also destructive.
- Static example images are copied into `public/student/images/<name>`.
