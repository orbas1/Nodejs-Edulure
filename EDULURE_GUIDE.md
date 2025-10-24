# Edulure Operational & Developer Guide

This guide documents the day-to-day workflows, operational expectations, and architectural touchpoints for teams working on the Edulure platform. It complements the top-level [README](README.md) by diving deeper into environment setup, service internals, deployment automation, and governance.

## Table of contents

1. [Environment setup](#environment-setup)
2. [Backend service](#backend-service)
    - [Functional responsibilities](#functional-responsibilities)
    - [Configuration & secrets](#configuration--secrets)
    - [Architecture overview](#architecture-overview)
    - [Scheduled jobs](#scheduled-jobs)
    - [Testing strategy](#testing-strategy)
    - [Common troubleshooting](#common-troubleshooting)
3. [Frontend application](#frontend-application)
    - [Runtime configuration](#runtime-configuration)
    - [Styling system](#styling-system)
    - [Accessibility & QA](#accessibility--qa)
    - [Functional map](#functional-map)
    - [Third-party integrations](#third-party-integrations)
4. [Flutter mobile shell](#flutter-mobile-shell)
    - [Functional map](#functional-map-1)
    - [Third-party integrations](#third-party-integrations-1)
5. [TypeScript SDK workflow](#typescript-sdk-workflow)
6. [Database management](#database-management)
    - [Entity catalogue](#entity-catalogue)
7. [Local orchestration with Docker](#local-orchestration-with-docker)
8. [Infrastructure & deployment automation](#infrastructure--deployment-automation)
9. [Observability & telemetry](#observability--telemetry)
10. [Security & compliance](#security--compliance)
11. [Release management](#release-management)
12. [Reference checklists & artefacts](#reference-checklists--artefacts)

---

## Environment setup

1. **Environment preflight**
   - Run `npm run onboard` to verify Node/npm versions, Docker availability, workspace dependencies, and storage directories.
     The script exits non-zero when prerequisites are missing and auto-creates `storage/local` for asset previews.

2. **Node.js toolchain**
   - Run `nvm use` in the repo root to align with the pinned `20.12.2` runtime. Installation is blocked when older Node/npm versions are detected by `scripts/verify-node-version.mjs`.
   - Install dependencies via `npm install`. npm workspaces ensure backend, frontend, and SDK packages resolve their dependencies.

3. **Database**
   - MySQL 8+ is recommended for native installs; ensure credentials align with `.env.example` in `backend-nodejs/`.
   - Alternatively, run `docker compose up postgres` (or `./scripts/bootstrap-environment.sh local`) to rely on the Postgres 15 container for development and testing.

4. **Flutter SDK**
   - Install Flutter 3.x and configure device simulators/emulators. Confirm setup with `flutter doctor` before working inside `Edulure-Flutter/`.
   - Mobile builds rely on the following `--dart-define` keys: `APP_ENV`, `API_BASE_URL`, `HTTP_CLIENT_TIMEOUT_MS`, `ENABLE_NETWORK_LOGGING`, `SENTRY_DSN`, and `SENTRY_TRACES_SAMPLE_RATE`. Production builds must point to an HTTPS API endpoint.

5. **Terraform**
   - Install Terraform 1.5+ if you are responsible for infrastructure changes. Terraform operations run from `infrastructure/terraform/envs/<environment>`.

6. **Environment files**
   - Duplicate `.env.example` files for each workspace (`backend-nodejs/.env.example`, `frontend-reactjs/.env.example` if provided) and customise values for your environment.

## Backend service

### Functional responsibilities

The API is organised by bounded contexts under `src/modules/`. Core responsibilities include:

- **Identity & security:** Account creation, password and social auth providers, MFA enrolment/verification, session refresh, API key issuance for service accounts, and audit logging of privileged actions.
- **Community & organisation management:** Organisation provisioning, community lifecycle, member invitations, roles, cohort scheduling, waitlisting, and automated onboarding journeys.
- **Learning delivery:** Course, module, lesson, and asset CRUD; assignment authoring; rubric-based grading; certificate generation; progress snapshots; and adaptive recommendation APIs.
- **Engagement & messaging:** Community feed posts with rich media attachments, threaded comments, reactions, announcements, and broadcast notifications across email, push, and in-app channels.
- **Commerce & billing:** Product catalogue management, Stripe checkout sessions, subscription lifecycle events, tax calculation hooks, promo codes, and invoice reconciliation.
- **Telemetry & analytics:** Consent capture, real-time ingestion of learner events, aggregation endpoints, and exports to downstream warehouses.
- **Runtime configuration:** Feature flags, remote configuration, experiment assignments, and environment banner content.
- **Governance & compliance:** Data retention execution, incident evidence archival, access review attestation APIs, and immutable audit trails for regulated workflows.

### API surface map

Use the table below when you need to trace a workflow from the UI to the API layer.

| Module path | Primary controllers | Example consumer |
| --- | --- | --- |
| `src/modules/auth` | `AuthController`, `SessionController`, `TwoFactorController` | Web/mobile login flows, SDK `auth.login` |
| `src/modules/communities` | `OrganisationController`, `CommunityController`, `CohortController` | Admin console community manager |
| `src/modules/courses` | `CourseController`, `ModuleController`, `LessonController` | Instructor builder, learner dashboard |
| `src/modules/assessments` | `AssignmentController`, `SubmissionController`, `RubricController` | Instructor grading panel, mobile lesson completion |
| `src/modules/engagement` | `FeedController`, `AnnouncementController`, `MessagingController` | Community feed, push notifications |
| `src/modules/commerce` | `ProductController`, `CheckoutController`, `SubscriptionController` | Billing flows, RevenueCat bridge |
| `src/modules/runtime-config` | `RuntimeConfigController`, `FeatureFlagController` | Frontend runtime hydration, Flutter feature gating |
| `src/modules/governance` | `RetentionController`, `EvidenceController` | Compliance dashboards, automated audits |
| `src/modules/telemetry` | `TelemetryController`, `ConsentController`, `ExportController` | Analytics exporters, freshness monitors |

When extending an endpoint, update `src/docs/openapi.yaml`, regenerate the SDK, and notify frontend/mobile owners of request contract changes.

#### Community lifecycle deep dive

- **Organisation bootstrap:** `OrganisationService` provisions default spaces, onboarding tasks, and admin roles; paired automation seeds welcome posts and help centre links.
- **Membership funnel:** Invite links, access codes, and public signup flows converge on `MembershipService`. It enforces seat counts, waitlists, and handles double-opt-in confirmations.
- **Roles & permissions:** Role matrices live under `src/modules/communities/roles/`. Channel-level overrides and moderation scopes determine CRUD access to threads, polls, and events.
- **Community automation:** Scheduled cohorts auto-create kickoff announcements and office hours using queue jobs defined in `src/modules/communities/automations/`.

#### Feed & engagement pipelines

- **Post ingestion:** `FeedController` validates payloads, attaches uploads via the asset service, and emits events consumed by websocket gateways and notification fan-out workers.
- **Ranking:** `FeedRankingService` mixes recency, engagement velocity, and learner goals. Experiment toggles adjust weighting, while suppression rules down-rank reported or low-quality content.
- **Interactions:** Reactions, comments, and replies share moderation middleware that records provenance in `post_audit_trail` for incident response. Rate-limits guard against spam bursts.
- **Notification targeting:** `NotificationTargetingService` segments audiences by cohort, timezone, and preferred channel before pushing entries to the async queue.

#### Courses & curriculum operations

- **Content authoring:** `CourseAuthoringService` manages drafts, version history, and preview environments so instructors can iterate safely before publishing.
- **Adaptive sequencing:** `RecommendationService` evaluates completion streaks, quiz mastery, and prerequisites to determine the next lesson or remediation path. Overrides can be set per cohort.
- **Assessment lifecycle:** Submission intake triggers plagiarism checks, rubric scoring, and optional peer review tasks. Appeals create tasks in `src/modules/assessments/appeals/` for moderator review.
- **Certification issuance:** Certificate templates are stored alongside theme metadata; issuance logs include cryptographic hashes for verification portals.

### Configuration & secrets

The backend enforces strict environment validation. Key variables include:

- **Authentication & security:** `JWT_KEYSET`, `JWT_ACTIVE_KEY_ID`, `JWT_REFRESH_SECRET`, `TWO_FACTOR_REQUIRED_ROLES`, `TWO_FACTOR_ENCRYPTION_KEY`, `TOKEN_EXPIRY_MINUTES`, `REFRESH_TOKEN_EXPIRY_DAYS`.
- **Database:** `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, with optional `DB_PROVISION_USER` for local bootstrap.
- **CORS & URLs:** `APP_URL`, `CORS_ALLOWED_ORIGINS`, `LOG_SERVICE_NAME`.
- **Content pipeline:** `R2_*` variables (Cloudflare R2 credentials & buckets), `CLOUDCONVERT_API_KEY`, `ASSET_PRESIGN_TTL_MINUTES`, `CONTENT_MAX_UPLOAD_MB`.
- **Telemetry:** `TELEMETRY_INGESTION_ENABLED`, `TELEMETRY_ALLOWED_SOURCES`, `TELEMETRY_CONSENT_DEFAULT_VERSION`, `TELEMETRY_EXPORT_*`, `TELEMETRY_FRESHNESS_*`.
- **Metrics & tracing:** `METRICS_ENABLED`, `METRICS_USERNAME`/`METRICS_PASSWORD` or `METRICS_BEARER_TOKEN`, `METRICS_ALLOWED_IPS`, `TRACE_HEADER_NAME`, `TRACING_SAMPLE_RATE`.
- **Feature flags & runtime config:** `FEATURE_FLAG_CACHE_TTL_SECONDS`, `FEATURE_FLAG_REFRESH_INTERVAL_SECONDS`, `RUNTIME_CONFIG_CACHE_TTL_SECONDS`, `RUNTIME_CONFIG_REFRESH_INTERVAL_SECONDS`.
- **Data governance:** `DATA_RETENTION_ENABLED`, `DATA_RETENTION_CRON`, `DATA_RETENTION_TIMEZONE`, `DATA_RETENTION_MAX_FAILURES`, `DATA_RETENTION_FAILURE_BACKOFF_MINUTES`.

Secrets are stored in your preferred manager (e.g., AWS Secrets Manager). Local development typically uses `.env` files sourced via `dotenv`.

### Architecture overview

- **Entry point:** `src/app.js` wires Express middleware, route modules, and error handling. Helmet, HPP, rate limiting, compression, and CORS policies are enabled by default.
- **Routing:** Files in `src/routes/` mount controllers for auth, organisations, communities, cohorts, courses, assignments, grading, messaging, payments, telemetry, runtime config, governance, and analytics. Each controller returns a consistent response envelope handled in `src/controllers/`.
- **Domain modules:** `src/modules/<domain>` folders group controllers, validators, services, and repositories. Examples include `auth`, `communities`, `courses`, `engagement`, `commerce`, `telemetry`, `governance`, and `runtime-config`.
- **Data access:** Knex repositories in `src/repositories/` encapsulate queries. Migrations live under `migrations/` and seeds under `seeds/` with helper factories in `database/factories/`.
- **Services & jobs:** Business logic resides in `src/services/`. Long-running tasks use job abstractions under `src/jobs/`, and queue integrations in `src/queues/` manage retries, backoff, and dead-letter policies.
- **OpenAPI:** `src/docs/` houses the OpenAPI specification exposed at `/api/docs`, informing the TypeScript SDK generator.
- **Observability:** Pino logger integrates request tracing, metrics under `src/metrics/`, structured redaction controlled by environment variables, and optional OpenTelemetry spans surfaced through the `/metrics` endpoint.

### Scheduled jobs

| Job | Schedule | What it touches | Operational notes |
| --- | --- | --- | --- |
| **DataRetentionJob** | `DATA_RETENTION_CRON` (defaults to nightly) | `data_retention_policies`, `retention_executions`, `governance_evidence`, domain tables marked for expiry | Supports dry-run via `npm run data:retention -- --dry-run` to preview deletions. All actions are signed and auditable. |
| **TelemetryWarehouseJob** | Hourly cron + manual trigger (`/api/v1/telemetry/export`) | `telemetry_events`, `telemetry_exports`, Cloudflare R2/S3 buckets | Emits lag metrics to Prometheus and fails fast if consent gaps are detected. |
| **CertificateIssueJob** | Event-driven from `cohort_completed` queue | `certificates`, `notifications`, template assets in `storage/certificates/` | Templates are HTML-to-PDF via CloudConvert; update branding in `backend-nodejs/src/templates/certificates/`. |
| **BillingReconciliationJob** | Hourly cron | Stripe invoices, `subscription_states`, `invoice_events` | Replays past 24 hours of events and posts anomalies to the governance evidence log. |
| **NotificationFanoutJob** | Runs every minute | `notification_queue`, SendGrid, FCM, Expo, in-app notifications | Throttles by channel and honours user notification preferences stored in `account_profiles`. |
| **AssetIngestionWorker** | Continuous | Cloudflare R2, `lesson_assets`, `asset_ingestion_events` | Processes transcoding, thumbnailing, caption extraction. Retries exponentially and surfaces dead letters in `queues/dead-letter`. |

### Event & webhook flows

- **Stripe:** Webhooks terminate at `/api/v1/webhooks/stripe`. A signature verifier enforces replay protection before events feed the billing job queue. Failures are stored in `webhook_failures` for replay.
- **SendGrid:** Inbound parse (optional) is handled via `/api/v1/webhooks/sendgrid` for delivery analytics that enrich notification dashboards.
- **Firebase/Expo:** Device token registration occurs through `/api/v1/notifications/devices`. Expired tokens are culled during NotificationFanoutJob execution and recorded in `notification_events`.
- **Segment:** The frontend/mobile clients stream events via analytics SDKs; the backend telemetry exporter ensures parity by pushing warehouse snapshots for BI teams.
- **LaunchDarkly-compatible flags:** Operators update flag payloads in `runtime_flags`. The runtime config endpoints project these into hashed responses consumed by clients within 60 seconds.

### Testing strategy

- `npm run test` uses Vitest with mocks defined in `test/setupMocks.js` to isolate external services.
- `npm run test:release` (invoked from the repo root during release readiness) executes performance- and regression-oriented suites located under `test/release/`.
- Database tests use in-memory SQLite or dedicated schemas depending on configuration; update `vitest.config.mjs` to tailor DB bindings if needed.

### Common troubleshooting

| Symptom | Possible cause | Resolution |
| --- | --- | --- |
| Service exits on boot with validation errors | Missing or malformed environment variables | Review `.env` against the configuration list above. Validation errors list the offending keys. |
| Asset ingestion jobs fail immediately | Missing Cloudflare or CloudConvert credentials | Ensure `R2_*` and `CLOUDCONVERT_API_KEY` variables are present. Local development can ignore PowerPoint failures. |
| `/metrics` returns 403 | Metrics endpoint secured | Provide Basic or Bearer credentials that match `METRICS_USERNAME`/`METRICS_PASSWORD` or `METRICS_BEARER_TOKEN`, and whitelist your IP via `METRICS_ALLOWED_IPS`. |
| Feature flag updates not reflected in API responses | Cache TTL too long | Reduce `FEATURE_FLAG_REFRESH_INTERVAL_SECONDS` locally or restart the service to flush caches. |

## Frontend application

### Runtime configuration

The frontend consumes `/api/runtime` endpoints exposed by the backend to drive feature flags and environment-aware settings. `RuntimeConfigProvider` hydrates configuration on boot and updates navigation/CTA states based on flag data. Mock responses live under `frontend-reactjs/src/mocks/` for isolated UI testing.

### Styling system

- Tailwind CSS is configured in `tailwind.config.js`. Utility-first classes are used across components with the Inter font loaded globally via `src/main.jsx`.
- Shared UI primitives (buttons, cards, form inputs) live under `src/components/ui/`. Brand colours and typography scale match design tokens referenced in the marketing site.

### Accessibility & QA

- `npm run test` executes component-level Vitest suites with Testing Library assertions.
- `npm run test:release` performs accessibility regression checks (`axe-core` rules) against critical flows like `/`, `/login`, `/register`, `/admin`.
- ESLint runs with React, JSX a11y, and Tailwind plugins (`npm run lint`). Treat warnings as blockers before merging.
- `npm run storybook` (if enabled) exercises design system stories so community/feed cards, course tiles, and onboarding modals render consistently with accessibility annotations.
- `npm run test:e2e` runs Playwright journeys covering onboarding, feed posting, cohort event RSVP, lesson consumption, and billing upgrades.

### Functional map

Key areas of the React application include:

- **Marketing funnel (`src/pages/marketing/`):** hero layouts, pricing comparisons, testimonials, and conversion-focused CTAs.
- **Authentication (`src/features/auth/`):** login, registration, MFA prompts, password reset, and social SSO bridging to the backend.
- **Learner dashboard (`src/features/dashboard/`):** progress analytics, upcoming sessions, recommended lessons, certificate download, and payment status reminders.
- **Community feed (`src/features/community/`):** real-time post stream with media galleries, reactions, polls, and moderation tools.
- **Instructor tools (`src/features/instructor/`):** course builder, module sequencing, assessment authoring, cohort scheduling, and roster management.
- **Assessments (`src/features/assessments/`):** assignment submission review, rubric grading, inline annotations, and outcome publishing.
- **Admin console (`src/features/admin/`):** feature flag toggles, runtime config overrides, support escalations, and governance evidence uploads.
- **Commerce (`src/features/billing/`):** pricing plans, billing portal, subscription upgrades/downgrades, promo code redemption, and invoice history.
- **Support centre (`src/features/support/`):** ticket escalation forms, self-serve knowledge base search, and proactive outage banners.

#### Community UX specifics

- **Composer variants:** Rich text, attachment, poll, and event announcement composers adapt based on channel permissions. Draft autosave is implemented via `useCommunityDrafts` with IndexedDB storage.
- **Discovery & search:** Tag, keyword, and cohort filters are orchestrated by `CommunityFiltersContext`, with GraphQL-like SDK queries delivering paged results.
- **Moderation workflows:** Moderators access escalation drawers, AI-assisted sentiment previews, and ban/restore controls via `src/features/community/moderation/`. Actions call governance APIs and append to the audit trail.
- **Engagement analytics:** Heatmaps, trending topics, and cohort health metrics are assembled in `src/features/community/insights/`, combining telemetry exports and feed rankings.

#### Course delivery specifics

- **Pathway designer:** Instructors assemble multi-track programmes using drag-and-drop modules with conflict detection and prerequisite validation.
- **Lesson player enhancements:** Inline quizzes, code playgrounds, note-taking, and transcript search share state machines that sync progress in real time.
- **Assessment lifecycle:** Learners get attempt timers, submission autosave, and rubric transparency; instructors monitor backlog counts, moderation status, and late penalties.
- **Certification showcase:** Graduation modals, shareable certificates, and badge walls use `CertificationGallery` components with analytics instrumentation.

#### Journey deep dive

| Persona | Primary flows | Implementation highlights |
| --- | --- | --- |
| **Prospective learner** | Marketing site → pricing → signup | SSR-friendly marketing pages, CTA conversion tracking via Segment, gating by LaunchDarkly flags |
| **Learner** | Dashboard → lesson → assessment → certificate | Uses SDK queries, offline caching via IndexedDB, and optimistic grading feedback |
| **Instructor** | Course authoring → cohort scheduling → grading | Complex forms with React Hook Form, background autosave, and notifications via WebSocket bridge |
| **Administrator** | Runtime config changes → governance exports | Protected routes enforce RBAC, mutations call `runtime-config` and `governance` APIs with audit logging |

### Third-party integrations

- **Stripe Elements:** inline payment collection and billing portal deep links.
- **Intercom/HelpScout:** contextual support widgets triggered from `SupportLauncher`.
- **Segment analytics:** event instrumentation within `src/lib/analytics/segment.ts`.
- **LaunchDarkly-compatible flags:** hydration of flag payloads fetched from the backend runtime config endpoint.
- **Sentry:** error boundary + performance tracing via `src/lib/observability/sentry.ts`.
- **Pusher/Ably (optional):** live cohort session streaming hooks via `src/lib/realtime/provider.ts` for webinars and office hours.
- **Google Maps:** cohort location previews within `src/features/community/components/CohortMap.tsx` use static map renders for accessibility.

## Flutter mobile shell

- Routes mirror the web experience (`/`, `/login`, `/register`, `/feed`, `/profile`). Navigation is orchestrated in `lib/router.dart`.
- The Inter font is applied through `google_fonts`. UI adheres to Material 3 components defined in `lib/theme.dart`.
- Push notifications use Firebase Cloud Messaging via `firebase_messaging` and foreground handling via `flutter_local_notifications`. Provide platform-specific config files before running on device.
- Provider transition hub actions (acknowledgements and status updates) now respect the active session role. Administrators and provider operators can submit updates; other roles receive inline messaging when permissions are insufficient. Offline cached snapshots automatically disable write actions until connectivity is restored.
- The shared `AppConfig` enforces secure base URLs in production and allows per-environment client timeouts via `HTTP_CLIENT_TIMEOUT_MS`.
- Tests under `test/` cover widget rendering and routing. Run with `flutter test`.

### Functional map

- `lib/features/auth/` – email/password and SSO auth, MFA, and biometric unlock.
- `lib/features/dashboard/` – learner overview with offline caching of lessons.
- `lib/features/calendar/` – cohort schedule sync with native reminders.
- `lib/features/lessons/` – streaming video, downloadable resources, and inline quizzes.
- `lib/features/messaging/` – direct and group messaging with push notification hooks.
- `lib/features/instructor/` – on-the-go cohort announcements, assignment review, and attendance tracking.
- `lib/features/billing/` – in-app subscription management via embedded Stripe checkout.
- `lib/features/support/` – push ticket submission, in-app announcements, and escalation history synced with Intercom APIs.

### Third-party integrations

- **Firebase Auth & FCM:** Primary identity and push notification providers. Device tokens register via `lib/services/push_tokens.dart` with automatic rotation and expiry cleanup.
- **RevenueCat + Stripe:** Subscription management wrappers (`lib/integrations/revenuecat.dart`) reconcile entitlements with backend subscription states and expose receipt validation endpoints.
- **Sentry & Crashlytics:** Crash reporting and performance tracing initialised in `lib/services/crash_reporting.dart`, including breadcrumb capture for feed/course interactions.
- **Branch (optional):** Deep-link routing for marketing campaigns (`lib/integrations/branch.dart`), aligning campaign metadata with analytics exports.
- **Cloudflare R2 assets:** Signed URL download flows ensure offline lesson packs are encrypted and verified before caching locally.

#### Mobile observability

- `lib/services/telemetry.dart` batches events and replays when connectivity is restored.
- `lib/services/crash_reporting.dart` uploads breadcrumbs to Sentry/Crashlytics with device metadata.
- `lib/services/performance.dart` measures screen transition timings and synchronises with the backend metrics API for aggregated dashboards.

## TypeScript SDK workflow

1. Ensure the backend is running so the OpenAPI document at `/api/docs` is up to date.
2. From `sdk-typescript/`, run `npm run generate` to refresh `src/generated/` using `openapi-typescript-codegen`.
3. Execute `npm run build` to produce ESM output in `dist/`. Type declarations are emitted automatically.
4. Publish (if required) through your private registry tooling after validating version bumps in `package.json`.

When endpoints change, update the backend OpenAPI specification first, regenerate the SDK, and rerun frontend integration tests.

## Database management

- **Migrations:** Use `npm run migrate:make -- <name>` (defined in the backend package scripts) to generate timestamped migration files in `backend-nodejs/migrations/`. Domain-specific helpers exist in `database/migration-templates/` for accounts, learning, commerce, and telemetry.
- **Seeds:** Extend `backend-nodejs/seeds/` for deterministic datasets. Factories cover accounts, communities, courses, cohorts, lessons, assignments, submissions, payments, runtime flags, telemetry events, and governance evidence. Avoid production secrets; seeds should only reference synthetic data.
- **Backups:** Production backups are configured through Terraform-managed Postgres instances (encrypted, automated snapshots). Ensure changes respect retention policies defined in Terraform modules.
- **Retention policies:** Adjust data hygiene behaviours via the `data_retention_policies` table. Changes are audited; use `npm run data:retention -- --dry-run` to preview effects.

### Entity catalogue

- **Accounts:** `accounts`, `account_profiles`, `auth_providers`, `sessions`, `mfa_challenges`.
- **Learning:** `organisations`, `communities`, `cohorts`, `courses`, `modules`, `lessons`, `lesson_assets`, `assignments`, `rubrics`, `submissions`, `progress_snapshots`, `certificates`, `badges`.
- **Engagement:** `posts`, `post_reactions`, `comments`, `announcements`, `notifications`, `notification_events`.
- **Commerce:** `products`, `prices`, `orders`, `line_items`, `payment_intents`, `subscription_states`, `invoice_events`, `promo_codes`.
- **Telemetry & analytics:** `telemetry_events`, `telemetry_exports`, `telemetry_consent_versions`.
- **Runtime & governance:** `runtime_flags`, `runtime_configs`, `feature_audit_logs`, `data_retention_policies`, `retention_executions`, `governance_evidence`.

## Local orchestration with Docker

`./scripts/bootstrap-environment.sh local` builds and launches the Docker Compose stack:

1. Builds backend and frontend images using `infrastructure/docker/Dockerfile.backend` and `Dockerfile.frontend`.
2. Starts the Postgres service and waits for readiness via `scripts/wait-for-db.js`.
3. Runs migrations (`npm run migrate`) and seeds (`npm run seed`) inside the backend container.
4. Launches backend (port 8080) and frontend (port 3000 via NGINX) containers.

Use `docker compose logs -f backend` or `frontend` for streaming logs, and `docker compose exec postgres psql -U edulure` to inspect the development database.

## Infrastructure & deployment automation

- **Terraform modules:**
  - `modules/networking` provisions VPC, subnets, routing, and NAT gateways.
  - `modules/backend_service` configures ECS Fargate services, ALB, autoscaling, logging, and health checks.
  - `modules/postgres` creates encrypted Postgres instances with parameter groups tuned for Edulure workloads.
- **Environment directories:** `envs/dev`, `envs/staging`, and `envs/prod` assemble modules with environment-specific sizing and protections (e.g., deletion protection for production ALBs).
- **Remote state:** Inject backend configuration during `terraform init` (bucket, key, region, DynamoDB table). Keep credentials outside source control.
- **Pipelines:** CI/CD should run `terraform fmt`, `terraform validate`, and `terraform plan` with the same variables used for apply. The bootstrap script supports this workflow via its non-local modes.

## Observability & telemetry

- **Local stack:** `npm run dev:observability` bootstraps Prometheus (9090) and Grafana (3001) using the Compose profile defined in
  `docker-compose.yml`. The helper script waits for readiness and mirrors the instructions in
  [`docs/operations/observability.md`](docs/operations/observability.md).
- **Metrics:** `/metrics` exposes Prometheus counters, gauges, and histograms recorded by
  `backend-nodejs/src/observability/metrics.js`, including HTTP latency, feature-flag decision totals, telemetry pipeline lag, and
  background job throughput. Metrics require the credentials configured in `.env` (`METRICS_USERNAME` / `METRICS_PASSWORD`) or the
  bearer token.
- **Tracing:** `middleware/requestContext.js` propagates correlation IDs from `TRACE_HEADER_NAME` (default `x-request-id`) into log
  entries, AsyncLocal spans, and HTTP metrics, keeping trace/span IDs aligned with Grafana panels.
- **SLO snapshots:** Service level objectives live in `backend-nodejs/src/config/env.js` and are aggregated by
  `backend-nodejs/src/observability/sloRegistry.js`. Query them via `GET /api/v1/observability/slos` or inspect the "Environment
  Runtime Health" Grafana dashboard.
- **Telemetry pipeline:**
  - `POST /api/v1/telemetry/events` and `/consents` handle ingestion with consent enforcement and deduplication.
  - `/api/v1/telemetry/freshness` surfaces lag for runbooks and Grafana panels.
  - Background exports stream JSONL batches to Cloudflare R2 (or configured destinations) with compression controlled by env vars.
- **Alert routing:** Terraform modules emit CloudWatch alarms for CPU, memory, and request saturation; combine with SLO burn-rate
  annotations for PagerDuty/Opsgenie integration.
- **Log retention:** Structured logs stream through Pino to Fluent Bit sidecars, respecting the governance default (90-day retention
  in production, 30 days in lower environments).

## Security & compliance

- **Dependency hygiene:** Run `npm run audit` regularly. For targeted scans, use `npm --workspace backend-nodejs audit` or equivalent.
- **License reporting:** `npm run license:report` generates SBOM-style outputs under `reports/security/` (directory created on demand) using `license-checker`.
- **Access control:** JWTs encode roles (admin, instructor, learner) to gate endpoints. Refresh tokens are hashed and retention jobs purge stale sessions.
- **2FA enforcement:** `TWO_FACTOR_REQUIRED_ROLES` ensures high-privilege accounts complete MFA flows. Update environment variables alongside policy changes.
- **Compliance artefacts:** Store SOC2/ISO attestations and CAB approvals referenced in `qa/release/core_release_checklist.json`.

## Release management

1. Update change logs using templates in `update_template/` (e.g., `change_log.md`, `update_progress_tracker.md`).
2. Execute `npm run release:readiness` from the repo root. The script:
   - Runs backend and frontend release suites and lint checks.
   - Performs the consolidated supply-chain audit.
   - Validates the release checklist JSON.
   - Saves a machine-readable summary to `reports/release/readiness-summary.json`.
3. Review the checklist in `qa/release/core_release_checklist.json` and ensure all evidence links remain accessible.
4. Promote container images using the Dockerfiles in `infrastructure/docker/` and deploy via Terraform or your preferred CD tooling.
5. Notify support and compliance teams using the communication templates stored under `update_template/`.
6. Conduct post-release monitoring for at least one full cohort cycle, confirming metrics, error budgets, and billing reconciliation remain healthy.
7. Archive release artefacts (dashboards, incident logs, approval emails) in the compliance repository referenced by the checklist for auditors.

## Reference checklists & artefacts

- `qa/release/core_release_checklist.json` – authoritative release readiness checklist consumed by automation.
- `update_template/` – planning documents (milestones, test plans, feature briefs) to standardise product updates.
- `valuation/edulure-prelaunch-valuation.md` – business context useful for investor and leadership briefings.

For questions or incident response, document decisions in your team knowledge base and keep this guide updated to reflect the latest workflows.

