# Backend Change Log – Version 1.50 Task 1

- Introduced a production security baseline for the Express API (rate limiting, strict CORS, Helmet/HPP, compression, structured logging, env validation).
- Standardised API contracts with shared response helpers, Joi validation coverage, role-aware auth middleware, and Swagger/OpenAPI documentation.
- Migrated persistence management to Knex with transactional orchestration services, refresh-token session storage, and domain event logging.
- Replaced legacy SQL installers with programmatic provisioning scripts, `.nvmrc`/`.npmrc` runtime pinning, the preinstall verifier, and Dependabot configuration for dependency governance.
- Added Cloudflare R2 integration, StorageService abstraction, and StorageService-based presigning helpers to manage uploads/downloads.
- Landed a production observability stack with request correlation IDs, redaction-aware structured logging, Prometheus `/metrics`, and R2 instrumentation feeding storage latency/throughput dashboards and alerting runbooks.
- Implemented AssetService/AssetIngestionService lifecycles with CloudConvert conversions, EPUB manifest normalisation, DRM enforcement, and analytics logging.
- Extended controllers/routes/OpenAPI spec for `/api/content` endpoints covering uploads, ingestion, viewer tokens, analytics, telemetry, and progress.
- Bootstrapped database schema for content assets, ingestion jobs, conversion outputs, audit logs, events, and ebook progress tracking.
- Added a Vitest suite and environment harness to validate StorageService bucket resolution, presigning TTLs, and CDN URL generation without Cloudflare dependencies.
- Implemented a JWT key store with active/fallback key support, added a secure rotation script, and wired middleware/services to honour issuer/audience enforcement with key identifiers.
- Delivered credential lockout governance by extending the `users` table with failure telemetry, enforcing rolling lockout windows, and emitting audit domain events for successes, failures, and lock states.
- Shipped email verification flows with hashed token storage, SMTP delivery, OpenAPI-documented endpoints, and controller/service orchestration that blocks unverified logins while providing throttled resend support.
- Delivered full-session governance with hashed refresh token storage, JWT `sid` claims, cached session validation, forced logout APIs (`/api/auth/refresh`, `/logout`, `/logout-all`), OpenAPI schemas, and audit/domain events so compromised credentials can be revoked instantly.
- Hardened configuration governance by expanding environment validation for SMTP and lockout controls, bundling operational defaults in `.env.example`, and covering the new mailer contract with Vitest.
- Operationalised data hygiene: added retention policy/audit tables, community owner triggers, production-grade seed data, and a retention enforcement service + CLI that purges stale sessions/telemetry while emitting immutable audit records.
- Hardened the retention programme with a managed `node-cron` scheduler, backoff-aware failure handling, environment toggles, and Vitest coverage for both the retention executor and job lifecycle.
