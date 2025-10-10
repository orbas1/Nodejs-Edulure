# Dependency Updates

- Added production dependencies: `express-rate-limit`, `compression`, `hpp`, `pino-http`, `swagger-ui-express`, `zod`, and `knex` to support security baselines, documentation, and migration tooling.
- Updated npm scripts with `migrate:latest`, `migrate:rollback`, `seed`, and `audit:dependencies` to enforce governance in CI pipelines.
- Introduced `.github/dependabot.yml` covering backend/frontend/mobile packages and GitHub Actions updates.
- Added backend dependencies for the content pipeline: AWS SDK S3 clients/lib-storage/presigner, `cloudconvert`, `adm-zip`, `fast-xml-parser`, and `slugify` plus migration for new tables.
- Upgraded React web app dependencies with `idb-keyval`, `epubjs`, and PropTypes coverage to power the content library and DRM viewer.
- Brought in Flutter packages `dio`, `hive_flutter`, `path_provider`, and `open_filex` to support authenticated API clients, offline caching, and document opening on mobile.
- Added `vitest` as the Node API test runner to cover Cloudflare R2 storage utilities under CI.
