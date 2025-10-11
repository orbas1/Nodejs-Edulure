# Dependency Updates

- Added production dependencies: `express-rate-limit`, `compression`, `hpp`, `pino-http`, `swagger-ui-express`, `zod`, and `knex` to support security baselines, documentation, and migration tooling.
- Updated npm scripts with `migrate:latest`, `migrate:rollback`, `seed`, and `audit:dependencies` to enforce governance in CI pipelines.
- Introduced `.github/dependabot.yml` covering backend/frontend/mobile packages and GitHub Actions updates.
- Added backend dependencies for the content pipeline: AWS SDK S3 clients/lib-storage/presigner, `cloudconvert`, `adm-zip`, `fast-xml-parser`, and `slugify` plus migration for new tables.
- Installed commerce dependencies: Stripe SDK, PayPal checkout server SDK, and supporting libraries (`uuid`, `@types/stripe` for dev) with mocks wired into Vitest to validate payment orchestration without live gateways.
- Upgraded React web app dependencies with `idb-keyval`, `epubjs`, and PropTypes coverage to power the content library and DRM viewer.
- Added React checkout dependencies (`@stripe/stripe-js`, `@stripe/react-stripe-js`) and PayPal script loader while extending axios client wrappers for commerce endpoints.
- Brought in Flutter packages `dio`, `hive_flutter`, `path_provider`, and `open_filex` to support authenticated API clients, offline caching, and document opening on mobile.
- Added `vitest` as the Node API test runner to cover Cloudflare R2 storage utilities under CI.
- Introduced a root npm workspace with engine enforcement (`.nvmrc`, `.npmrc`, runtime verifier), shared lint/test/audit scripts, and axios-backed React HTTP client to keep backend and frontend dependencies aligned.
