# Service Changes

- `AuthService` issues signed access tokens with issuer/audience claims, persists hashed refresh tokens in `user_sessions`, records registration events for auditing, and now signs tokens using the shared key store with `kid` metadata for rotation.
- `CommunityService` orchestrates community creation with slug collision detection, automatic owner enrolment, metadata storage, and domain event emission.
- `UserService` proxies the new repository helpers, ensuring consistent pagination metadata.
- `StorageService` provides presigned upload/download helpers, direct buffer uploads, public URL builders, and object lifecycle utilities on top of the Cloudflare R2 client, and is now exported for isolated testing.
- `AssetService` manages content asset lifecycle (upload session creation, ingestion confirmation, analytics, DRM enforcement) while emitting audit logs and telemetry events, now using a dedicated DRM signature secret surfaced by the environment configuration.
- `AssetIngestionService` polls for pending jobs, integrates with CloudConvert, normalises EPUB manifests, and updates asset metadata/status with error handling.
- `AuthService` now orchestrates account lockouts and verification gating: failed logins increment rolling counters, lockouts emit domain events, and unverified users trigger token issuance instead of session creation. Session lifecycle governance adds refresh rotation, revocation/audit events, concurrent-session limits, cached validation, and logout-all tooling documented in OpenAPI.
- Introduced `EmailVerificationService` to issue hashed tokens, enforce resend cooldowns, and mark verification completion transactionally with audit logging.
- Added `MailService` as the SMTP abstraction used by verification flows, rendering production-grade HTML/text templates and logging dispatch identifiers for observability.
- `StorageService` now wraps Cloudflare R2 calls in telemetry spans and Prometheus counters/histograms, exposing payload size, latency, and in-flight gauges for observability dashboards.
- Introduced `DataRetentionService` to read policy metadata, enforce hard/soft delete actions per entity, and log immutable audit rows; scriptable via the new `npm run data:retention` CLI for scheduled hygiene sweeps.
- Added `DataRetentionJob` to coordinate cron scheduling, dry-run bootstraps, and failure backoff, wiring the retention executor directly into the API lifecycle so hygiene enforcement runs continuously without human intervention.
