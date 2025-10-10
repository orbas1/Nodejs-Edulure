# New Backend Files

- `backend-nodejs/src/config/env.js` – environment validation and typed configuration export.
- `backend-nodejs/src/docs/openapi.json` – OpenAPI 3.0 specification consumed by Swagger UI and client SDK generation.
- `backend-nodejs/src/models/CommunityMemberModel.js`, `DomainEventModel.js`, `UserSessionModel.js` – new repositories supporting orchestration and auditing.
- `backend-nodejs/src/utils/httpResponse.js` – shared success/pagination response helper.
- `backend-nodejs/migrations/20241010120000_initial_schema.js` – Knex migration establishing users, communities, memberships, domain events, and session tables.
- `backend-nodejs/knexfile.cjs` – Knex CLI configuration.
- `.github/dependabot.yml` – automated dependency monitoring for backend, frontend, mobile, and GitHub Actions.
- `.nvmrc` – Node.js version pin for local and CI execution.
- `backend-nodejs/src/config/storage.js` – centralised Cloudflare R2 client configuration and endpoint export.
- `backend-nodejs/src/services/StorageService.js`, `AssetService.js`, `AssetIngestionService.js` – storage abstraction, asset lifecycle orchestration, and conversion worker.
- `backend-nodejs/src/controllers/ContentController.js`, `routes/content.routes.js` – content API surface for upload sessions, ingestion, analytics, and telemetry.
- `backend-nodejs/src/models/ContentAssetModel.js`, `AssetConversionOutputModel.js`, `AssetIngestionJobModel.js`, `ContentAssetEventModel.js`, `ContentAuditLogModel.js`, `EbookProgressModel.js` – Knex repositories powering the content pipeline.
- `backend-nodejs/migrations/20241020130000_content_assets.js` – schema for assets, ingestion jobs, conversion outputs, events, audit logs, and ebook progress.
- `backend-nodejs/vitest.config.mjs`, `backend-nodejs/test/setupEnv.js`, `backend-nodejs/test/storageService.test.js` – Vitest harness and suites covering Cloudflare R2 storage behaviours.
