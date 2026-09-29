# Pawanji API

Module-based architecture — each feature lives in its own folder:

```text
src/modules/<name>/
  <name>.model.ts
  <name>.service.ts
  <name>.controller.ts
  <name>.route.ts
  <name>.validation.ts   # optional
  index.ts
```

Shared only: `config/`, `middleware/`, `utils/`

## Local

1. `cp .env.example .env`
2. Import `sql/001_create_news.sql` into MySQL
3. From repo root: `npm run dev:api`

Docs: http://localhost:4000/api/docs
