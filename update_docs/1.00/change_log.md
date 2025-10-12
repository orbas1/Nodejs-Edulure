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
- Finalised the payments and commerce foundation: added payments/coupons/refunds/ledger migrations and models, a PaymentService orchestrating Stripe intents, PayPal order capture, refunds, coupon redemption, finance summaries, and Prometheus metrics, exposed `PaymentController`/routes with Stripe raw-body support, expanded OpenAPI paths/schemas, hardened `.env.example` and backend README guidance, and introduced Vitest suites covering tax allocation, provider idempotency, PayPal capture, Stripe webhook validation, and refund ledgering.
- Extended commerce design documentation: refreshed provider wireframes with coupon governance, webhook observability, dispute workspaces; added learner checkout and refund overlays; and updated Blade template guidance for checkout/refund components so UX specifications mirror the new `/api/payments` stack and downstream teams can ship consistent interfaces.
- Launched an instructor-focused React content library with secure uploads, cached listings, analytics sidebars, and embedded ebook/PowerPoint viewers plus authenticated login/register flows.
- Bootstrapped Flutter content experiences with Hive-based offline caching, Dio-powered API clients, and an interactive content library supporting downloads, viewer tokens, and progress updates.
- Implemented account lockout policies, multi-channel email verification, and SMTP-backed security communications with full OpenAPI coverage and regression tests to close Task 1.1 gaps.
- Added refresh-token rotation with hashed session storage, JWT `sid` claims, cached session validation, and `/api/auth/refresh`, `/logout`, `/logout-all` endpoints plus OpenAPI/audit trails so compromised tokens can be revoked instantly across devices.

## Version 1.00 – Task 3 Communities Core Platform

- Activated the community core migration set, seeded multi-community fixtures, and extended `CommunityService`/OpenAPI coverage so `/api/communities`, `/api/communities/:id/posts`, and `/api/communities/:id/resources` deliver production-ready feeds, membership enforcement, and resource metadata for downstream clients.
- Refactored the React feed to consume the live APIs: `Feed.jsx` now orchestrates authenticated pagination, aggregate vs. community-scoped feeds, and resource drawer loading while clearing stale errors and enforcing membership-aware fallbacks.
- Upgraded `CommunityProfile.jsx`, `CommunitySwitcher.jsx`, and `TopBar.jsx` with accessibility-first focus handling, metadata formatting, resource pagination controls, and design-aligned badges that mirror the updated community hub specifications.
- Delivered the monetisation suite for communities: migrations/models/services/controllers for role catalogues, tiered paywalls, subscription lifecycle automation, affiliate tracking, and payout auditing are live with OpenAPI documentation, Prometheus telemetry, seeds, and Vitest coverage so finance, design, and growth teams can integrate checkout, entitlement, and commission flows without additional backend work.
- Finalised the engagement mechanics stack: migrations, models, services, controllers, routes, and OpenAPI schemas now cover points, streaks, leaderboards, RSVP calendars, reminder scheduling, and a cron-ready reminder job with Vitest coverage so community programmes stay automated, observable, and production-safe.
- Shipped the communities chat and direct messaging suite: migration `20241123100000_community_chat.js` provisions channel/member/message/reaction/moderation, DM thread/message/participant, and presence tables while new models, `CommunityChatService`, `DirectMessageService`, controllers, and routes expose threaded timelines, reactions, moderation workflows, presence beacons, DM inboxes, and read receipts. Production seeds, Prometheus metrics, Joi validation, expanded OpenAPI coverage, and Vitest HTTP integration keep the messaging stack production-ready for web, mobile, and ops teams.
- Delivered the social graph stack: migration `20241125140000_social_graph.js` adds privacy, follow, mute, block, recommendation, and audit tables; repositories/service/controller/route (`SocialGraphService`/`SocialGraphController`/`/api/social`) power follower/following pagination with viewer context, follow/unfollow + approval flows, recommendation fallbacks, mute/block governance, and privacy CRUD. Seeds emulate approvals/pending requests, OpenAPI now documents the new schemas and endpoints, README + `.env.example` surface tuning knobs, and new Vitest suites cover service logic and HTTP contracts.
- Added defensive execution helpers in `SocialGraphService` to remove silent promise `.catch` chains, routing follow recommendation and mute/unmute clean-up failures through structured warnings without interrupting customer flows.
- Normalised nullable OpenAPI fields (chat, DM, social graph, paywalls) to leverage `nullable: true`, eliminating validation errors and confirming spec compliance via `npx swagger-cli validate src/docs/openapi.json`.

## Version 1.00 – Task 4 Explorer Search & Intelligence

- Hardened the Meilisearch explorer foundation: `SearchClusterService` now provisions, validates, and monitors explorer indexes (communities,
  courses, ebooks, tutors, profiles, ads, events) with host/API key hygiene, enforced read-only search keys, Prometheus metrics
  (`edulure_search_operation_duration_seconds`, `edulure_search_node_health`, `edulure_search_index_ready`), and a `npm run search:provision`
  bootstrap/snapshot workflow. Backend README and `.env.example` document operational guidance, while design artefacts add explorer entity tabs,
  facet rails, saved search UX, ad placements, and SRE health consoles referencing `website_drawings.md`, `dashboard_drawings.md`,
  `menu_drawings.md`, `Admin_panel_drawings.md`, and `App_screens_drawings.md`.
- Delivered production ingestion pipelines for the explorer: `SearchIngestionService` orchestrates batched/concurrent ETL for all indexes with incremental `since` support, delete-before-reindex safeguards, and Prometheus instrumentation. New CLI `npm run search:reindex` executes full/delta reloads, `.env.example` exposes ingestion tuning knobs, migrations seed courses/ebooks/tutor/live classroom/ads intelligence tables, and Vitest suites cover loader pagination plus failure telemetry so Meilisearch receives production-grade payloads on demand.
