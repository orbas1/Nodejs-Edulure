# Version 1.10 Update Change Log

- Removed all provider phone app artifacts (documentation, evaluations, tests, and UI assets) from the update package to reflect the retirement of the provider mobile experience.

## Version 1.50 – Task 1 Platform Hardening & Governance

- Hardened the Node.js API with rate limiting, strict CORS, Helmet/HPP guards, compression, structured request logging, and environment validation (Zod) that blocks insecure boots.
- Added a signed JWT key store with key identifiers, runtime verification across legacy keys, and an operational rotation script to meet secret governance requirements.
- Standardised response envelopes, added a shared HTTP response helper, and shipped an OpenAPI 3.0 specification served at `/api/docs` for downstream client contracts.
- Introduced refresh-token backed session storage, automatic community owner enrolment, and domain event auditing via new orchestration services and repositories.
- Migrated database management to Knex migrations with automated execution on boot, plus programmatic provisioning to replace legacy SQL installers.
- Enabled dependency governance with Dependabot coverage, Node engine pinning, and npm audit scripts, alongside updated `.env` templates detailing new security-critical variables.
- Promoted repository-wide npm workspaces with enforced Node/npm engine versions, runtime verification scripts, shared lint/test/audit commands, and axios-backed frontend HTTP clients so every surface consumes identical dependency trees.

## Version 1.50 – Task 2 Cloudflare R2 & Learning Content Pipelines

- Provisioned Cloudflare R2 connectivity with AWS SDK clients, presigned upload/download flows, and environment validation for storage/CDN credentials.
- Delivered asset lifecycle services covering upload confirmation, CloudConvert-backed PowerPoint conversion, EPUB manifest extraction, DRM enforcement, analytics, and audit logging.
- Extended the OpenAPI specification and Express routes/controllers to expose `/api/content` endpoints for upload sessions, ingestion, viewer tokens, analytics, and progress tracking.
- Launched an instructor-focused React content library with secure uploads, cached listings, analytics sidebars, and embedded ebook/PowerPoint viewers plus authenticated login/register flows.
- Bootstrapped Flutter content experiences with Hive-based offline caching, Dio-powered API clients, and an interactive content library supporting downloads, viewer tokens, and progress updates.
- Implemented account lockout policies, multi-channel email verification, and SMTP-backed security communications with full OpenAPI coverage and regression tests to close Task 1.1 gaps.
