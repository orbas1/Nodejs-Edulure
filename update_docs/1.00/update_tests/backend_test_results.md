# Backend Test Results – Version 1.00

- `npm test` (backend-nodejs) — **failed**. Dozens of integration suites aborted early because the Vitest environment could not resolve required native dependencies (`supertest`, `knex`, `dotenv`, `pino`, `slugify`, `node-cron`, `on-finished`, etc.) and later suites attempted to exercise MySQL-backed flows without a live database, producing `ECONNREFUSED`. The compliance heatmap unit additions executed before the dependency errors surfaced. 【1678fc†L1-L117】
