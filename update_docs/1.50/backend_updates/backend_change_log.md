# Backend Change Log – Version 1.50 Task 1

- Introduced a production security baseline for the Express API (rate limiting, strict CORS, Helmet/HPP, compression, structured logging, env validation).
- Standardised API contracts with shared response helpers, Joi validation coverage, role-aware auth middleware, and Swagger/OpenAPI documentation.
- Migrated persistence management to Knex with transactional orchestration services, refresh-token session storage, and domain event logging.
- Replaced legacy SQL installers with programmatic provisioning scripts, `.nvmrc` Node pinning, and Dependabot configuration for dependency governance.
- Added Cloudflare R2 integration, StorageService abstraction, and StorageService-based presigning helpers to manage uploads/downloads.
- Implemented AssetService/AssetIngestionService lifecycles with CloudConvert conversions, EPUB manifest normalisation, DRM enforcement, and analytics logging.
- Extended controllers/routes/OpenAPI spec for `/api/content` endpoints covering uploads, ingestion, viewer tokens, analytics, telemetry, and progress.
- Bootstrapped database schema for content assets, ingestion jobs, conversion outputs, audit logs, events, and ebook progress tracking.
- Added a Vitest suite and environment harness to validate StorageService bucket resolution, presigning TTLs, and CDN URL generation without Cloudflare dependencies.
