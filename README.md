# Edulure Platform Monorepo

A production-focused learning community platform that combines a hardened Node.js API, a conversion-driven React experience, a Flutter mobile shell, and developer tooling for SDK generation, governance, and infrastructure automation. This repository is organised as an npm workspace so teams can evolve every surface of Edulure from a single source of truth.

## Table of contents

1. [At a glance](#at-a-glance)
2. [Functional catalogue](#functional-catalogue)
3. [Repository layout](#repository-layout)
4. [Prerequisites](#prerequisites)
5. [Getting started](#getting-started)
6. [Workspace guides](#workspace-guides)
    - [Backend API (`backend-nodejs/`)](#backend-api-backend-nodejs)
    - [Web frontend (`frontend-reactjs/`)](#web-frontend-frontend-reactjs)
    - [Flutter shell (`Edulure-Flutter/`)](#flutter-shell-edulure-flutter)
    - [TypeScript SDK (`sdk-typescript/`)](#typescript-sdk-sdk-typescript)
7. [Database, migrations, and seed data](#database-migrations-and-seed-data)
8. [Quality gates and automation](#quality-gates-and-automation)
9. [Infrastructure and operations](#infrastructure-and-operations)
10. [Security, governance, and compliance](#security-governance-and-compliance)
11. [Further reading](#further-reading)

## At a glance

- **Backend:** Express.js domain modules that power authentication, community management, curriculum catalogues, live cohort scheduling, payments, telemetry, feature flag delivery, and governance automation through background workers.
- **Frontend:** Vite + React experience that combines a marketing funnel, learner dashboard, instructor authoring tools, cohort scheduling, assessment workflows, and an administrative console surfaced through role-aware routing.
- **Mobile:** Flutter application that mirrors learner and instructor journeys with offline reading, push-enabled reminders, in-app purchases, and community messaging.
- **Database:** Normalised relational schema for accounts, communities, courses, enrolments, commerce, telemetry, runtime configuration, and governance evidence with migrations and seeds to reproduce state locally.
- **Background jobs:** Cron-driven workers for data retention, telemetry export, certificate issuance, async content conversion, billing reconciliation, and notification fan-out.
- **Third-party integrations:** Cloudflare R2 for asset storage, CloudConvert for document rendition, Firebase Cloud Messaging for mobile push, Stripe for payments, SendGrid for transactional email, LaunchDarkly-compatible flag payloads, and analytics exports to BigQuery/S3.
- **SDK:** Generated TypeScript client that consumes the API's OpenAPI schema and ships typed request helpers.
- **Infrastructure:** Terraform modules, Docker images, and release scripts that standardise environments, audits, and readiness checklists.

## Functional catalogue

The sections below map every user-facing surface to the underlying services that make the experience work. Use them to understand which repository area to touch when you are iterating on a particular workflow.

### Backend API capabilities

| Domain | Highlights | Key routes |
| --- | --- | --- |
| **Identity & security** | MFA enrolment, refresh token rotation, session hardening, API keys for machine clients | `/api/v1/auth/*`, `/api/v1/sessions`, `/api/v1/security/keys` |
| **Communities & cohorts** | Organisation lifecycle, cohort rosters, waitlists, onboarding playbooks | `/api/v1/organisations`, `/api/v1/communities`, `/api/v1/cohorts` |
| **Learning delivery** | Course/module CRUD, adaptive lesson sequencing, assignment workflows, grading and rubric engines | `/api/v1/courses`, `/api/v1/modules`, `/api/v1/assignments`, `/api/v1/submissions` |
| **Engagement** | Community feed, announcements, reactions, messaging and notification targeting | `/api/v1/feed`, `/api/v1/announcements`, `/api/v1/notifications` |
| **Commerce** | Product catalogue, checkout, billing reconciliation, tax reporting | `/api/v1/billing/products`, `/api/v1/billing/checkout`, `/api/v1/billing/invoices` |
| **Telemetry & analytics** | Event capture, consent lifecycle, export orchestration | `/api/v1/telemetry/events`, `/api/v1/telemetry/consents`, `/api/v1/telemetry/export` |
| **Runtime configuration** | Feature flag distribution, environment banners, experiment bucketing | `/api/v1/runtime/config`, `/api/v1/runtime/flags` |
| **Governance** | Retention execution, access reviews, audit evidence deposits | `/api/v1/governance/retention`, `/api/v1/governance/evidence` |

#### Community & engagement functions

- **Spaces and channels:** Organisations can create private/public spaces (`src/modules/communities/services/space.service.ts`) with nested channels for topical discussions. Moderators manage visibility, archived states, and posting permissions.
- **Feed composition:** `FeedService` applies pinned posts, trending weighting, and cohort-targeted announcements before exposing results to `/api/v1/feed`. Supports text, rich media, polls, and embedded lesson links.
- **Conversation health:** Profanity filters, automated spam scoring, and manual moderation queues are orchestrated through `ModerationService` with outcomes written to `post_moderation_events`.
- **Realtime signals:** Websocket gateways (`src/modules/engagement/gateways/`) broadcast new activity, typing indicators, and reaction counts; HTTP long-polling is available as a fallback for constrained clients.
- **Member reputation:** Contribution scores, badges, and streaks are calculated nightly and cached in `member_reputation_snapshots` for leaderboard and profile consumption.

#### Courses & learning delivery

- **Programme hierarchy:** Courses contain modular units, lessons, and activities managed via `CourseController` and stored across `courses`, `modules`, `lessons`, and `lesson_assets` tables.
- **Adaptive sequencing:** The `RecommendationService` personalises lesson ordering using rubric results, completion streaks, and configured prerequisites.
- **Assessments:** Assignments support rubrics, submission retries, peer review, and plagiarism detection through a third-party scan webhook. Results surface in learner dashboards and instructor gradebooks.
- **Certificates & badges:** Completion triggers the certificate job, while micro-achievements are minted in-app and recorded in `achievement_awards` for wallet-style display.
- **Resource library:** Supplemental files, recordings, and links are uploaded to Cloudflare R2, versioned per lesson, and mirrored to offline bundles for the mobile shell.

### Web frontend feature map

- **Acquisition:** Hero, pricing, case studies, and testimonials are defined under `frontend-reactjs/src/pages/marketing/`. Onboarding flows coordinate with the backend session endpoints via `src/features/auth/api.ts`.
- **Learner hub:** Dashboard widgets in `src/features/dashboard/components/` aggregate lesson progress, certificates, and billing reminders using the SDK client.
- **Community:** Real-time feed surfaces (`src/features/community/`) integrate websockets for optimistic updates and use LaunchDarkly-compatible flags to toggle experiments.
- **Instructor workspace:** Builder, grading, and cohort management experiences in `src/features/instructor/` and `src/features/assessments/` share design primitives from `src/components/ui/`.
- **Administration:** Settings, governance, and runtime configuration pages in `src/features/admin/` expose high-privilege workflows; guard rails are enforced via route-level loaders.
- **Support:** The support launcher and help centre entry points live in `src/features/support/`, bridging users into Intercom/HelpScout and knowledge base content.

#### Frontend community experience

- **Feed layouts:** Card variants for announcements, discussions, polls, lesson shares, and resource drops are composed in `src/features/community/components/cards/` with analytics hooks for scroll-depth tracking.
- **Member directory:** Search, filters, and role badges live in `src/features/community/members/`, tapping `/api/v1/communities/:id/members` for roster data and the reputation snapshot cache.
- **Events & live sessions:** Calendar overlays in `src/features/community/events/` subscribe to cohort schedules, trigger reminders, and offer one-click joins via deep links.
- **Moderation tooling:** Inline escalation, shadow-ban, and content flag flows surface through `src/features/community/moderation/`, writing to audit logs via the governance API.
- **Gamification:** Badge carousels and streak trackers render data from the achievements endpoints and call-to-action users when at risk of streak breaks.

#### Frontend course delivery

- **Curriculum explorer:** A tree of courses/modules/lessons is assembled in `src/features/learning/catalogue/` with route-based data loaders hitting the SDK's course endpoints.
- **Lesson player:** `src/features/learning/player/` orchestrates video, slides, transcripts, live code blocks, and checks for offline availability using the asset manifest.
- **Assessments & submissions:** Assignment detail pages in `src/features/assessments/pages/` present rubrics, attempt history, inline grading feedback, and allow resubmission per policy.
- **Progress insights:** Heatmaps, streak charts, and recommended next steps are rendered via `src/features/learning/progress/` using aggregated telemetry and recommendation APIs.
- **Commerce tie-ins:** Upsell modals and course upgrade prompts integrate with the billing SDK to surface pricing, discounts, and checkout entry points without leaving the learning flow.

### Flutter mobile journeys

- **Getting started:** `Edulure-Flutter/lib/features/auth/` implements registration, MFA, deep-link verification, and biometric unlock.
- **Daily engagement:** Feed, calendar, and messaging tabs (`lib/features/feed/`, `lib/features/calendar/`, `lib/features/messaging/`) persist state offline using `hive` stores.
- **Learning sessions:** The lesson player in `lib/features/lessons/` combines streaming, downloadable assets, and inline quizzes synchronised with the backend submissions API.
- **Instructor on-the-go:** Quick actions (`lib/features/instructor/quick_actions.dart`) trigger announcements, attendance checks, and grading approvals while offline support queues updates.
- **Billing:** RevenueCat and Stripe billing bridges live in `lib/integrations/billing.dart`, providing subscription upgrade/downgrade flows with local receipt validation.

#### Mobile community experience

- **Feed surfaces:** `lib/features/feed/widgets/` renders announcement, discussion, poll, and media posts with gesture-friendly reactions and offline optimistic updates.
- **Spaces & DMs:** Community spaces and direct messages in `lib/features/community_spaces/` allow channel subscriptions, mute states, and secure inbox messaging backed by encrypted storage.
- **Events & reminders:** The calendar ties into native reminders (`lib/features/calendar/notifications.dart`) and surfaces RSVP, attendance, and replay access.
- **Moderation:** Mobile moderators access quick actions for hide, pin, escalate, or contact member from `lib/features/community/moderation_sheet.dart`.
- **Push engagement:** Deep links launched from push notifications hydrate navigation stacks and mark notifications as read through the `/api/v1/notifications` endpoints.

#### Mobile learning experience

- **Offline packs:** Learners can prefetch lessons, transcripts, and quizzes using `lib/features/lessons/download_manager.dart` with background isolates handling encryption-at-rest.
- **Interactive practice:** `lib/features/assessments/` supports flashcards, quick quizzes, and audio/video submissions, syncing retries when devices reconnect.
- **Coaching nudges:** Instructor feedback triggers in-app guidance surfaces via `lib/features/coaching/` to reinforce progress or remediate gaps.
- **Certifications wallet:** `lib/features/profile/certifications.dart` presents issued credentials with shareable links, wallet exports, and expiration reminders.

### Background job inventory

| Job | Trigger | Responsibilities | Key assets |
| --- | --- | --- | --- |
| **DataRetentionJob** | `DATA_RETENTION_CRON` | Applies policy windows, archives or purges stale records, writes immutable audit entries | `backend-nodejs/src/jobs/data-retention.job.ts`, tables `retention_executions`, `governance_evidence` |
| **TelemetryWarehouseJob** | Scheduled + manual trigger | Packages telemetry batches, exports to R2/S3, tracks freshness lag metrics | `backend-nodejs/src/jobs/telemetry-export.job.ts`, `telemetry_exports` |
| **CertificateIssueJob** | Cohort completion events | Generates signed certificates, emails recipients, updates `certificates` | `backend-nodejs/src/jobs/certificate-issue.job.ts` |
| **NotificationFanoutJob** | Queue poll every minute | Delivers announcements to SendGrid, FCM, Expo, and in-app inbox | `backend-nodejs/src/jobs/notification-fanout.job.ts`, `notification_events` |
| **BillingReconciliationJob** | Hourly | Reconciles Stripe invoices, validates subscription state transitions, posts alerts | `backend-nodejs/src/jobs/billing-reconciliation.job.ts`, Stripe webhooks |
| **AssetIngestionWorker** | Continuous | Converts uploaded media, updates asset status, generates thumbnails and transcripts | `backend-nodejs/src/jobs/asset-ingestion.worker.ts`, CloudConvert

### Third-party integration matrix

| Category | Provider | Purpose |
| --- | --- | --- |
| **Payments** | Stripe | Checkout, invoices, billing portal, webhook reconciliation |
| **Email** | SendGrid | Transactional messaging, cohort reminders, certificate delivery |
| **Storage & conversion** | Cloudflare R2, CloudConvert | Asset storage, signed URLs, document/video rendition |
| **Push & realtime** | Firebase Cloud Messaging, Expo | Mobile push notifications, device token management |
| **Support & engagement** | Intercom/HelpScout, Segment | In-app support widgets, analytics instrumentation |
| **Feature management** | LaunchDarkly-compatible payloads | Progressive delivery for experiments, runtime banners |
| **Analytics** | BigQuery, Amazon S3, optional Amplitude | Telemetry warehousing, BI workflows, growth dashboards |

### Database focus areas

- **Identity graph:** `accounts`, `account_profiles`, `auth_providers`, `sessions`, and `mfa_challenges` provide traceability for access reviews.
- **Learning model:** Entities such as `courses`, `modules`, `lessons`, `lesson_assets`, `assignments`, `submissions`, and `rubrics` capture content and assessment state.
- **Engagement graph:** `posts`, `post_reactions`, `comments`, `announcements`, and `notifications` support community features and moderation analytics.
- **Commerce ledger:** `orders`, `line_items`, `payment_intents`, `subscription_states`, `invoice_events`, and `promo_codes` provide revenue auditability.
- **Governance telemetry:** `telemetry_events`, `telemetry_exports`, `runtime_flags`, `runtime_configs`, `feature_audit_logs`, `retention_executions`, and `governance_evidence` underpin compliance reports.

## Repository layout

| Path | Description |
| --- | --- |
| `backend-nodejs/` | Express API, Knex migrations, seeds, and operational scripts. |
| `frontend-reactjs/` | Vite-based React single-page application with Tailwind styling and Vitest suites. |
| `Edulure-Flutter/` | Flutter mobile starter with marketing, feed, and profile screens. |
| `sdk-typescript/` | Generated API client (`@edulure/api-sdk`) driven by the backend OpenAPI document. |
| `infrastructure/` | Dockerfiles, Terraform modules, and environment manifests used in CI/CD. |
| `scripts/` | Shared tooling (runtime guards, environment bootstrap, audits, release orchestration). |
| `qa/` | Governance artefacts such as the release readiness checklist consumed by automation. |
| `update_template/` | Product planning templates (release notes, milestone plans, testing matrices). |
| `valuation/` | Business context, including pre-launch valuation notes. |

## Prerequisites

- Node.js **20.12.2** or newer and npm **10.5.0** or newer (enforced by `.nvmrc`, `.npmrc`, and a preinstall guard).
- Docker (optional) for the composed local stack or container builds.
- Terraform CLI (optional) for infrastructure provisioning.
- Flutter SDK (for `Edulure-Flutter/`).
- MySQL 8+ (native installs) or Postgres 15 (via Docker) depending on your preferred database workflow.

> ℹ️ The repository uses npm workspaces. Running commands from the repo root will target each workspace automatically when the script name exists.

## Getting started

Clone the repository, align your Node.js runtime, and install dependencies:

```bash
nvm use
npm install
```

Common workspace-agnostic scripts:

```bash
# Run lint across every workspace that defines a lint script
npm run lint

# Execute unit/integration tests across workspaces
npm run test

# Perform a consolidated supply-chain audit (backend, frontend, SDK)
npm run audit
```

### One-command stack launcher

Use the unified launcher to prepare the database and run backend + frontend services with a single command. Presets control which subsystems start automatically.

```bash
# Start lite preset (HTTP APIs with in-process jobs + websocket gateway)
npm run dev:stack -- --preset=lite

# Start full preset (includes heavy schedulers and realtime fan-out)
npm run dev:stack -- --preset=full

# Skip frontend if you only need the backend
npm run dev:stack -- --preset=lite -- --skip-frontend
```

- `--preset=lite` (default) launches the API with internalised job runners, realtime gateway, messaging, and search so only the frontend and backend processes are required locally.
- `--preset=full` mirrors production by enabling heavier scheduler groups and realtime broadcasting, still inside the primary backend process.
- `--preset=analytics` extends `full` by starting analytics/billing exporters; use when testing heavy data workflows.
- `--service-target=<list>` overrides preset defaults if you need explicit control (for example, `web,worker`).

When the launcher runs it:

1. Ensures Postgres migrations and seeds execute once, caching completion in `.edulure/setup-state.json` to avoid redundant installs.
2. Boots the backend with the cooperative job coordinator so worker, realtime, messaging, video, and notification subsystems live inside the same Node.js process.
3. Enables the Edulure Search provider (Postgres-backed) and exposes health/readiness probes before starting the frontend.
4. Streams prefixed logs (`[web]`, `[jobs]`, `[search]`, `[realtime]`) so you can differentiate subsystems quickly and see remediation hints if environment variables are missing.

### Guided installation UI

The browser-based installer remains available for teams that prefer a graphical setup walkthrough. It writes `.env.local` files, provisions the database, seeds Edulure Search metadata (Postgres materialised views), and warms the internalised job/realtime subsystems. After installing dependencies:

1. Start the backend API in one terminal so the installer endpoints are available:

   ```bash
   npm run dev --workspace backend-nodejs
   ```

2. In a second terminal start the web app:

   ```bash
   npm run dev --workspace frontend-reactjs
   ```

3. Visit [http://localhost:5173/setup](http://localhost:5173/setup) and follow the guided steps. Provide local or Cloudflare R2
   storage credentials, review the generated environment variables, and launch the installer. The UI streams task logs while it
   writes environment files, applies database migrations + seeds, builds Edulure Search indexes, lint-checks the backend, and
   verifies that worker/realtime/messaging schedulers are running inside the main process.

You can rerun individual tasks (for example, rebuilding the frontend bundle) by deselecting the steps you wish to skip before
relaunching the installer.

To spin up the entire stack with Docker:

```bash
# builds images, starts postgres + application services, and applies migrations/seeds
./scripts/bootstrap-environment.sh local
```

To stop the stack, run `docker compose down` from the repository root.

## Workspace guides

Each workspace ships its own README with deep configuration details. The sections below provide a high-level primer and the most relevant scripts.

### Backend API (`backend-nodejs/`)

- **Tech:** Express.js, Knex, node-cron, Pino, Prometheus metrics.
- **Functional coverage:** Authentication & session refresh, role-based access control, organisation and community lifecycle, course & module authoring, cohort scheduling, lesson content ingestion with R2-backed media, assessments & grading, payment webhooks, telemetry capture/export, runtime configuration, feature flag distribution, notification queue fan-out, and governance audit trails.
- **Bootstrapping:**
  ```bash
  cd backend-nodejs
  cp .env.example .env
  npm install
  npm run db:install   # runs migrations + seeds
  npm run dev
  ```
- **Key scripts:**
  - `npm run dev` – start the API with hot reload.
  - `npm run db:install` – install schema + seeds for local development.
  - `npm run migrate:latest` / `npm run migrate:rollback` – schema evolution.
  - `npm run seed` – re-apply seed data.
  - `npm run test` – Vitest suites (unit + integration).
  - `npm run security:rotate-jwt` – rotate signing keys and produce base64-encoded keysets.
  - `npm run data:retention` – execute automated retention policies.
- **Highlights:** Multi-factor aware auth, Cloudflare R2 content pipeline, telemetry ingestion/export, Prometheus instrumentation, feature flags + runtime config caches, and governance-ready retention jobs.
- **Third-party touchpoints:** Stripe webhook controller for payments, Cloudflare R2 + CloudConvert asset workers, SendGrid transactional email service, Firebase/Expo push notification relay, BigQuery/S3 telemetry export adapters, and LaunchDarkly-compatible flag projection.
- **Documentation:** `backend-nodejs/README.md` and OpenAPI docs served at `/api/docs` when the service is running.

### Web frontend (`frontend-reactjs/`)

- **Tech:** Vite, React, Tailwind CSS, Inter font, Vitest + Testing Library.
- **Functional coverage:** Marketing landing & pricing pages, conversion-focused onboarding, learner dashboard with progress tracking, community feed with rich media, live session scheduling & RSVPs, instructor curriculum builder, assessment grading surfaces, billing portal, governance evidence uploader, and admin-level configuration consoles.
- **Bootstrapping:**
  ```bash
  cd frontend-reactjs
  npm install
  npm run dev
  ```
- **Key scripts:**
  - `npm run dev` – Vite dev server on http://localhost:5173.
  - `npm run build` – production bundle.
  - `npm run preview` – serve the production bundle locally.
  - `npm run lint` / `npm run test` – quality gates.
  - `npm run test:release` – accessibility and regression checks for release readiness.
- **Highlights:** Marketing homepage, login/register flows with MFA prompts, instructor onboarding, live community feed, admin dashboard, and runtime-config driven feature flags.
- **Third-party touchpoints:** Stripe billing portal embeds, Intercom/HelpScout support widget hooks, Segment analytics emitters, LaunchDarkly-compatible feature flag hydration, and Sentry browser instrumentation.

### Flutter shell (`Edulure-Flutter/`)

- **Tech:** Flutter, Material 3, `google_fonts`, Firebase Cloud Messaging integration hooks.
- **Functional coverage:** Auth flows with biometric unlock, learner dashboard with offline caching, cohort calendar view, interactive lesson playback, instructor announcements, peer messaging threads, push-enabled reminders, in-app subscription upgrades, and profile management.
- **Bootstrapping:**
  ```bash
  cd Edulure-Flutter
  flutter pub get
  flutter run
  ```
- **Highlights:** Branded marketing entry point, login/register flows, feed and profile screens. Supports push notifications via FCM when platform configs are provided (`google-services.json` / `GoogleService-Info.plist`).
- **Third-party touchpoints:** Firebase Authentication optional hooks, FCM push messaging, Stripe billing via in-app webviews, and Sentry/Crashlytics for crash reporting (wiring provided in `lib/services/telemetry.dart`).

### TypeScript SDK (`sdk-typescript/`)

- **Purpose:** Generated API client consumed by web/mobile partners, powered by the backend OpenAPI document.
- **Bootstrapping:**
  ```bash
  cd sdk-typescript
  npm install
  npm run build
  ```
- **Key scripts:**
  - `npm run generate` – run `openapi-typescript-codegen` to refresh generated sources.
  - `npm run build` – clean, generate, and compile TypeScript to ESM output.
  - `npm run check` – type-check without emitting files.
  - `npm run audit:dependencies` – security scan limited to production dependencies.

## Database, migrations, and seed data

- **Local development:** `backend-nodejs` expects MySQL 8+ by default; however, the included Docker Compose file provisions Postgres 15 with environment variables suitable for development. Adjust `.env` to point at your chosen database engine.
- **Automation:**
  - `npm run db:install` (backend workspace) executes all migrations in `backend-nodejs/migrations/` followed by seeds in `backend-nodejs/seeds/`.
  - To inspect or extend schema assets, review `backend-nodejs/database/` and the generated migration files.
- **Schema domains:**
  - `accounts`, `account_profiles`, `auth_providers`, `sessions`, and `mfa_challenges` underpin authentication and security.
  - `organisations`, `communities`, `cohorts`, `courses`, `modules`, `lessons`, `lesson_assets`, `assignments`, and `submissions` structure the learning model.
  - `enrolments`, `progress_snapshots`, `certificates`, and `badges` track learner outcomes.
  - `orders`, `line_items`, `payment_intents`, `subscription_states`, and `invoice_events` drive commerce.
  - `runtime_flags`, `runtime_configs`, and `feature_audit_logs` manage progressive delivery.
  - `telemetry_events`, `telemetry_exports`, `retention_executions`, and `governance_evidence` support analytics and compliance.
- **Seed coverage:** Seeds create operator-ready admin/instructor/learner accounts, multiple communities with JSON metadata, sample content assets, ingestion histories, telemetry events, certification examples, billing scenarios, and refresh session trajectories to exercise retention policies and release readiness dashboards.

## Quality gates and automation

- **Linting:** `npm run lint` executes lint rules across any workspace that exposes a lint script. Flat ESLint configurations handle both backend and frontend codebases.
- **Testing:** `npm run test` aggregates Vitest suites. Workspace-specific release suites (`npm --workspace <pkg> run test:release`) add regression, accessibility, and load coverage.
- **Security scans:** `npm run audit` orchestrates supply-chain checks (`npm run audit:ci`) for backend/frontend and the SDK.
- **Observability baselines:** Metrics and burn-rate thresholds driven by `METRICS_*` and `SLO_*` environment values populate the release readiness dashboard and gating automation.
- **Release readiness:** `npm run release:readiness` runs curated test/lint/audit commands, validates `qa/release/core_release_checklist.json`, and exports a JSON summary to `reports/release/readiness-summary.json`.
- **License reporting:** `npm run license:report` uses `scripts/security/generate-license-report.mjs` to snapshot third-party license metadata.

## Infrastructure and operations

- **Docker:**
  - `infrastructure/docker/Dockerfile.backend` and `Dockerfile.frontend` build production images used in Compose and CI.
  - `docker-compose.yml` provisions Postgres, the backend API, and the frontend NGINX container for integrated local testing.
- **Terraform:**
  - Modules located under `infrastructure/terraform/modules/` provide networking, ECS Fargate services, and Postgres resources.
  - Environment roots live in `infrastructure/terraform/envs/{dev,staging,prod}`. Use `terraform init -backend-config=...` to inject remote state configuration.
  - `scripts/bootstrap-environment.sh dev|staging|prod` validates and plans Terraform with standardised variables.
- **Environment manifest:** `infrastructure/environment-manifest.json` captures cross-environment variables referenced by automation and pipelines.

## Security, governance, and compliance

- **Runtime enforcement:** `scripts/verify-node-version.mjs` blocks dependency installation on unsupported Node.js/npm versions to guarantee parity between local, CI, and production environments.
- **Authentication:** Backend enforces JWT key rotation (`npm run security:rotate-jwt`), refresh token hashing, MFA role requirements, configurable token lifetimes, session caching windows (`SESSION_VALIDATION_CACHE_TTL_MS`), and concurrent session ceilings (`MAX_ACTIVE_SESSIONS_PER_USER`).
- **Audit & encryption:** Immutable audit trails honour `AUDIT_LOG_*` settings while data-at-rest encryption can be enabled with `DATA_ENCRYPTION_PRIMARY_KEY` and rotated via `DATA_ENCRYPTION_ACTIVE_KEY_ID` / `DATA_ENCRYPTION_FALLBACK_KEYS`.
- **Data governance:** Automated retention and partitioning jobs enforce policy windows while domain event dispatchers and webhook buses deliver downstream notifications with resilient backoff controls.
- **Telemetry:** Consent-aware ingestion pipeline, freshness monitoring, Prometheus metrics, and manual export triggers keep analytics trustworthy.
- **Release management:** The checklist in `qa/release/core_release_checklist.json` must be complete before production deployments. Automation surfaces outstanding items in release reports.

## Further reading

- [Backend API README](backend-nodejs/README.md)
- [Frontend README](frontend-reactjs/README.md)
- [Flutter README](Edulure-Flutter/README.md)
- [Terraform README](infrastructure/terraform/README.md)
- [Pre-launch valuation](valuation/edulure-prelaunch-valuation.md)
- [Operational & developer guide](EDULURE_GUIDE.md)

