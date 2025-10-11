# Version 1.10 Update Change Log

- Removed all provider phone app artifacts (documentation, evaluations, tests, and UI assets) from the update package to reflect the retirement of the provider mobile experience.

## Version 1.50 – Task 1 Platform Hardening & Governance

- Hardened the Node.js API with rate limiting, strict CORS, Helmet/HPP guards, compression, structured request logging, and environment validation (Zod) that blocks insecure boots.
- Added a signed JWT key store with key identifiers, runtime verification across legacy keys, and an operational rotation script to meet secret governance requirements.
- Standardised response envelopes, added a shared HTTP response helper, and shipped an OpenAPI 3.0 specification served at `/api/docs` for downstream client contracts.
- Introduced refresh-token backed session storage, automatic community owner enrolment, and domain event auditing via new orchestration services and repositories.
- Delivered data hygiene automation: retention policy/audit tables, owner enrolment triggers, production-grade seeds, and a CLI retention runner that purges stale sessions/telemetry with immutable audit trails.
- Added a managed retention scheduler with cron/backoff controls, new environment toggles, and Vitest coverage so hygiene enforcement runs continuously without manual intervention.
- Migrated database management to Knex migrations with automated execution on boot, plus programmatic provisioning to replace legacy SQL installers.
- Enabled dependency governance with Dependabot coverage, Node engine pinning, and npm audit scripts, alongside updated `.env` templates detailing new security-critical variables.
- Delivered full-stack observability: AsyncLocalStorage request contexts, redaction-aware structured logging, secured Prometheus `/metrics`, and R2 operation metrics feeding production alerting.
- Modernised backend quality gates with ESLint flat configuration, workspace lint scripts, and Prometheus-aware Vitest mocks so feature flag/runtime automation can be validated without external infrastructure.

## Version 1.50 – Task 2 Cloudflare R2 & Learning Content Pipelines

- Provisioned Cloudflare R2 connectivity with AWS SDK clients, presigned upload/download flows, and environment validation for storage/CDN credentials.
- Delivered a hardened Cloudflare R2 asset fabric: scripted bucket provisioning with lifecycle/CORS/tag policies, antivirus-governed upload confirmation, signed delivery URLs, Prometheus-backed storage metrics, and a CLI workflow (`npm run storage:provision`) to keep environments aligned.
- Delivered asset lifecycle services covering upload confirmation, CloudConvert-backed PowerPoint conversion, EPUB manifest extraction, DRM enforcement, analytics, and audit logging.
- Extended the OpenAPI specification and Express routes/controllers to expose `/api/content` endpoints for upload sessions, ingestion, viewer tokens, analytics, and progress tracking.
- Shipped the course module and drip engine suite: new Knex migrations modelled courses/modules/lessons/assignments, Express services/controllers for course authoring, module sequencing, lesson asset attachment, and assignment grading, plus Prometheus metrics for drip evaluations and progress updates.
- Delivered the ebook experience upgrade: migrations for ebooks/chapters/highlights/bookmarks/reader settings/watermark events, an `EbookService` with sanitised chapter ingestion, DRM download issuance, analytics-ready Prometheus counters, full Express routes/controllers, seeded governance datasets, and an expanded OpenAPI surface for authoring, reader telemetry, and secure downloads.
- Completed the live classroom and tutor hire domain: introduced tutor scheduling/booking schemas, Agora-backed live classroom orchestration, Prometheus counters for seat/utilisation tracking, event/audit logging, seeded reference tutors/classrooms, Express services/controllers/routes for `/api/tutors` and `/api/live-classrooms`, and OpenAPI coverage for availability, bookings, registration, chat sessions, and secure join token issuance.
- Delivered the payments and commerce stack: migration `20241112120000_payments_and_commerce.js` provisions coupons, tax jurisdictions, orders, transactions, refunds, and audit logs; seeds supply jurisdiction defaults and launch coupons; Stripe/PayPal orchestration issues payment intents, verifies webhooks, records Prometheus counters, and exposes `/api/commerce` endpoints with capture/refund coverage for finance operations and frontend checkout flows.
- Launched an instructor-focused React content library with secure uploads, cached listings, analytics sidebars, and embedded ebook/PowerPoint viewers plus authenticated login/register flows.
- Bootstrapped Flutter content experiences with Hive-based offline caching, Dio-powered API clients, and an interactive content library supporting downloads, viewer tokens, and progress updates.
- Implemented account lockout policies, multi-channel email verification, and SMTP-backed security communications with full OpenAPI coverage and regression tests to close Task 1.1 gaps.
- Added refresh-token rotation with hashed session storage, JWT `sid` claims, cached session validation, and `/api/auth/refresh`, `/logout`, `/logout-all` endpoints plus OpenAPI/audit trails so compromised tokens can be revoked instantly across devices.
