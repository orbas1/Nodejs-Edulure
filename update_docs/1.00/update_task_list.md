# Version 1.00 Task List – Execution Backlog

Each task below aligns with the numbered plan, includes integration coverage across required domains, and is broken into 4–6 actionable subtasks with completion percentages.

## Task 1 – Platform Hardening & Governance Foundations (32% complete)
### Integration Coverage
- **Backend:** Harden auth, feeds, payments, notifications services; add feature flags and secrets management.
- **Front-end:** Configure shared API client, environment switching, and error boundaries in React.
- **User Phone App:** Define Flutter service layer templates, secure storage approach, and telemetry contracts.
- **Provider Phone App:** Document provider app architecture, authentication, and offline-first patterns.
- **Database:** Introduce migrations, encryption, retention policies, auditing, and monitoring dashboards.
- **API:** Publish OpenAPI/GraphQL specifications, DTO library, pagination/error standards, and SDK stubs.
- **Logic:** Build orchestration services for enrolment, notifications, moderation, and billing triggers.
- **Design:** Deliver security UX guidelines, token governance, accessibility patterns, and error states.

### Subtasks
1. **Security Framework Upgrade (100%)** – Rate limiting, strict CORS, password policies, JWT validation, secret rotation. _Progress update:_ Multi-key JWT key store, rotation tooling, and shared verification helpers delivered; account lockout telemetry, email verification flows, SMTP hardening, and the new session rotation/logout suite (refresh, revoke-current, revoke-all, capped concurrent sessions, cached validation) are production ready with OpenAPI and audit coverage.
2. **Dependency & Workspace Governance (100%)** – Monorepo/tooling decisions, automated audits, version pinning, lint/test scripts. _Progress update:_ Introduced a root npm workspace with enforced Node 20.12.2+/npm 10.5.0+ engines, wired a runtime verifier, shared audit/lint/test commands, axios-backed React client, and `.npmrc` governance so CI, local, and production environments consume identical dependency trees.
3. **Observability & Telemetry (100%)** – Structured request logging now injects trace/user context, `/metrics` exposes Prometheus histograms/counters for HTTP and R2, dashboards/runbooks documented for latency, error, and exception thresholds.
4. **Migration & Data Hygiene (100%)** – Extended Knex migrations with retention policy/audit tables, owner membership triggers,
   production-grade seed datasets, the automated data retention CLI, and a cron-backed enforcement job with failure backoff,
   runtime toggles, and Vitest coverage to keep hygiene hands-free.
5. **Feature Flag & Config Service (100%)** – Delivered database-backed feature flag definitions, percentage/segment scheduling, admin console gating, and runtime configuration matrices with API/CLI access for staged rollouts and kill switches; ESLint flat config + Vitest mocks now guard the service so governance automation ships with passing quality gates.

## Task 2 – Content, Commerce & Live Learning Delivery (22% complete)
### Integration Coverage
- **Backend:** Cloudflare R2 microservices, course/ebook/tutor APIs, Agora orchestration, payment hooks.
- **Front-end:** Live feed integration, purchase flows, tutor booking, classroom interactions, analytics surfaces.
- **User Phone App:** Offline viewers, purchases, live class join, notifications, ratings/reviews in Flutter.
- **Provider Phone App:** Upload management, pricing controls, schedule planner, finance dashboards, analytics.
- **Database:** Assets, decks, reading progress, bookings, transactions, reviews, grades, quiz records.
- **API:** Endpoints for products, carts, orders, bookings, recordings, notes, quizzes, assignments.
- **Logic:** PPT conversion, ebook DRM, tutor availability, drip content release, grading automation.
- **Design:** Commerce flows, live classroom UX, analytics widgets, accessibility compliance.

### Subtasks
1. **Cloudflare R2 Asset Fabric (100%)** – Buckets, lifecycle, antivirus, signed URLs, monitoring dashboards. _Progress update:_ Provisioning CLI now enforces bucket creation with lifecycle/CORS/tag policies, uploads stream through ClamAV-backed antivirus scans before confirmation, quarantine routing/audit trails protect infected artefacts, Prometheus dashboards capture latency/volume/detections, and React/Flutter clients receive presigned URLs from the hardened storage service.
2. **Course Module & Drip Engine (100%)** – Builder UI, deck attachment, assignments, grading, progress tracking. _Progress update:_ Course domain schema, service, controller, routes, and OpenAPI coverage now support module authoring, drip scheduling, assignment grading, and learner progress APIs instrumented with Prometheus metrics.
3. **Ebook Experience Upgrade (100%)** – Reader redesign, author console, watermarking, highlights/bookmarks. _Progress update:_ Backend now ships ebook migrations/models/service/controller/routes, sanitised chapter ingestion, highlight/bookmark/reader settings APIs, DRM download issuance with watermark audits, Prometheus counters, seeded governance data, and OpenAPI coverage ready for frontend/mobile integration.
4. **Live Classroom & Tutor Hire (100%)** – Agora rooms, ticketing, scheduling, hourly hire, chat entry points. _Progress update:_ Tutor/timetable schema migration, tutor/live classroom services with Agora token helper, Prometheus metrics, seeded data, controllers/routes, OpenAPI coverage, and Vitest booking analytics ensure scheduling, booking, chat, and join workflows are production-ready pending frontend integration.
5. **Payments & Commerce (100%)** – Stripe/PayPal intents, taxes, refunds, coupons, finance reporting. _Progress update:_ PaymentService orchestrates Stripe intents, PayPal capture/refunds, coupon lifecycle, ledger postings, Stripe webhook reconciliation, finance summaries, env/README guidance, OpenAPI paths, and Vitest coverage across tax edge cases and provider idempotency.

## Task 3 – Communities, Social Graph & Engagement Systems (0% complete)
### Integration Coverage
- **Backend:** Community models, leaderboards, paywalls, chat services, moderation pipelines.
- **Front-end:** Community hub redesign, member controls, calendars, maps, role management, chat inbox.
- **User Phone App:** Feed parity, chat, events, maps, notifications, streaks, community switcher.
- **Provider Phone App:** Community dashboards, member trackers, leadership board management, affiliate payouts.
- **Database:** Memberships, tier points, subscriptions, chat threads, moderation cases, location tracking.
- **API:** Posts, comments, polls, calendar, paywall subscriptions, role updates, location services.
- **Logic:** Recommendation engine, moderation automation, notification dispatch, leaderboard calculations.
- **Design:** Role badges, community layouts, chat UX, streak visualisations, paywall onboarding.

### Subtasks
1. **Community Core Platform (100%)** – Schemas, CRUD, feeds, resource library, classroom integration. _Progress update:_ Backed
   community tables, seed data, and service layer now power `/api/communities` feeds/resources with authenticated guards; React
   feed wiring replaces mocks with live API pagination, resource rollups, and accessibility reviewed community switcher/profile
   shells.
2. **Roles, Paywalls & Affiliates (100%)** – Database-backed role catalogues, gated paywall tiers, subscription checkout APIs, and affiliate payout tooling are live across backend and design systems.
3. **Engagement Mechanics (100%)** – Leaderboards, tier points, streaks, calendars, map embeds, reminders. _Progress update:_ Backend migrations/models/services/controllers/routes now power member points, streak rollovers, leaderboards, RSVP-capable event calendars, reminder scheduling, and the cron-backed reminder job with OpenAPI docs, telemetry, and Vitest coverage; design overlays for leaderboards/streaks/calendars/reminder consent align to `dashboard_drawings.md`, `website_drawings.md`, `menu_drawings.md`, and `App_screens_drawings.md`.
4. **Chat & Messaging Suite (100%)** – Channels, DMs, presence, moderation tools, Agora live linkage. _Progress update:_ Migration `20241123100000_community_chat.js`, repositories, `CommunityChatService`, `DirectMessageService`, Express controllers/routes, seeds, Prometheus metrics, Joi validation, and Vitest service + HTTP suites now power production-grade community chat (threaded replies, reactions, moderation, presence) and direct messaging endpoints with expanded OpenAPI coverage ready for frontend/mobile consumption.
5. **Follow Graph & Recommendations (100%)** – Relationship model, privacy settings, feed ranking, suggestions. _Progress update:_
   Delivered the social graph migration/models/services/controllers with transactional privacy enforcement, follow approvals,
   mute/block automation, reciprocal recommendation generation, and pagination-tuned HTTP/OpenAPI coverage backed by Vitest
   service + route suites and seeded fixtures for production validation.

## Task 4 – Explorer Search, Ads & Intelligence Platform (60% complete)
### Integration Coverage
- **Backend:** Meilisearch deployment, indexing workers, ads targeting engine, analytics collectors.
- **Front-end:** Explorer navigation, filters, saved searches, ad slots, reporting dashboards.
- **User Phone App:** Voice search, offline recents, deep links, ad interactions, analytics capture.
- **Provider Phone App:** Campaign management, targeting insights, explorer lead follow-up.
- **Database:** Index metadata, campaign configs, metrics, click/impression logs, predictions.
- **API:** Search/query endpoints, saved searches CRUD, ads APIs, analytics feeds.
- **Logic:** Ranking algorithms, billing engines, forecasting, anomaly detection, experimentation harness.
- **Design:** Explorer layouts, ad creatives, reporting visuals, accessibility for search flows.

### Subtasks
1. **Meilisearch Infrastructure (100%)** – Provisioning, replication, security hardening, monitoring, backups. _Progress update:_
   Added `SearchClusterService` with host/key validation, automated index provisioning (communities, courses, ebooks, tutors,
   profiles, ads, events), Prometheus metrics (`edulure_search_operation_duration_seconds`, `edulure_search_node_health`,
   `edulure_search_index_ready`), enforced read-only search keys at startup, operationalised the `npm run search:provision`
   bootstrap/snapshot workflow, and documented environment requirements in the backend README and `.env.example`.
2. **Data Pipelines & Indexing (100%)** – ETL for communities, courses, ebooks, tutors, profiles, ads, events. _Progress update:_ SearchIngestionService now streams batched, incremental loads for every explorer index (communities, courses, ebooks, tutors, profiles, ads, events) with concurrency controls, Prometheus instrumentation, and snapshot-aware deletes. The new `npm run search:reindex` CLI bootstraps full or delta syncs, seeded datasets exercise course/ebook/tutor/live-classroom/ads records, and Vitest coverage validates loader pagination, incremental filters, and failure telemetry.
3. **Explorer UX Implementation (100%)** – Entity tabs, filters, map previews, saved searches, quick actions. _Progress update:_ `/explorer` now renders Meilisearch-backed entity tabs with live result counts, adaptive facet rails that hydrate from backend facet metadata, controlled filter persistence, keyboard-ready map previews powered by `react-simple-maps`, and saved-search CRUD (create/update/pin/apply/delete) orchestrated through optimistic React query flows, telemetry hooks, and toast-driven UX messaging aligned to design specifications.
4. **Ads Suite Delivery (0%)** – Campaign builder, targeting rules, budgeting, creatives, compliance automation.
5. **Analytics & Intelligence (0%)** – Dashboards, zero-result alerts, CTR tracking, predictions, experiment toggles.

## Task 5 – Dashboards, Profiles & Operational Consoles (0% complete)
### Integration Coverage
- **Backend:** Profile aggregation, finance stats, verification, admin/support workflows, notification preferences.
- **Front-end:** User dashboards (profile, followers, settings, finance, widgets, stats), admin & customer service panels.
- **User Phone App:** Profile editing, finance summaries, community/eBook/course shelves, widgets, notifications.
- **Provider Phone App:** Instructor dashboards, course/eBook management, pricing, analytics, chat inbox.
- **Database:** Profile components, verification records, finance ledgers, support tickets, notification settings.
- **API:** Profile CRUD, dashboard widgets, finance summaries, verification submissions, support routing.
- **Logic:** KYC orchestration, onboarding flows, finance reconciliation, notification routing.
- **Design:** Component library, KPI widgets, admin workflows, accessibility/compliance states.

### Subtasks
1. **Profile Component Library (0%)** – Hero, badges, shelves, timelines, quick actions, caching strategy.
2. **User Dashboard Delivery (0%)** – Finance, followers, settings, widgets, statistics graphs, notifications centre.
3. **Instructor Dashboard Suite (0%)** – Community switcher, classroom courses, pricing, eBook manager, analytics.
4. **Admin & Customer Service Panels (0%)** – Approvals, incident response, refunds, policy hub, support tickets.
5. **ID Verification & Compliance (0%)** – Document capture, verification workflow, audit logs, policy management.

### Sprint Breakdown
- **Sprint 5A – Component Foundations (0%)**
  - Finalise API payloads for dashboard/profile widgets (0%).
  - Deliver responsive layout skeletons with placeholder data (0%).
  - Wire cache invalidation hooks for component hydration (0%).
- **Sprint 5B – Role-Based Dashboards (0%)**
  - Ship learner dashboard widgets and notification centre MVP (0%).
  - Launch instructor pricing/analytics rails with audit logging (0%).
  - Harden admin/support consoles with escalation workflows (0%).
- **Sprint 5C – Compliance & Verification (0%)**
  - Implement KYC document pipeline with storage encryption (0%).
  - Automate verification status notifications across channels (0%).
  - Publish policy hub + support SOP documentation updates (0%).

## Task 6 – Mobile Parity & Store Readiness (0% complete)
### Integration Coverage
- **Backend:** Mobile-optimised endpoints, push notifications, sync APIs, download services.
- **Front-end:** Shared design tokens, localisation, responsive rules, component parity documentation.
- **User Phone App:** Communities, courses, ebooks, live classes, tutors, ads, notifications, offline readiness.
- **Provider Phone App:** Community creation, pricing, analytics, chat, payouts, classroom controls.
- **Database:** Sync checkpoints, offline caches, telemetry events, device preferences, store metadata.
- **API:** Versioned endpoints, pagination, delta sync, error translation, deep link targets.
- **Logic:** Background refresh, feature flags, offline retry queues, analytics collection.
- **Design:** Mobile UX flows, gestures, accessibility, store assets, localisation packs.

### Subtasks
1. **Flutter Architecture Foundations (0%)** – dio networking, Riverpod/Bloc state, secure storage, telemetry, feature flags.
2. **Learner Feature Modules (0%)** – Communities, explorer, courses, ebooks, live classrooms, chat, notifications.
3. **Instructor Feature Modules (0%)** – Community management, course/eBook creation, pricing, analytics, inbox.
4. **Performance & Offline (0%)** – Caching, background sync, low-bandwidth modes, crash analytics.
5. **Store Submission & Compliance (0%)** – Listings, privacy disclosures, review workflows, phased rollout plan.

### Sprint Breakdown
- **Sprint 6A – Core Shell & Networking (0%)**
  - Stand up Flutter navigation shell with auth guard stubs (0%).
  - Integrate dio client, interceptors, and secure storage bootstrap (0%).
  - Land shared design tokens from React for typography/colour (0%).
- **Sprint 6B – Learner Modules (0%)**
  - Ship communities/explorer readers with cached pagination (0%).
  - Enable course/eBook playback with offline download toggles (0%).
  - Wire live classroom join + notifications using feature flags (0%).
- **Sprint 6C – Instructor & Store Prep (0%)**
  - Deliver instructor pricing/analytics dashboards with background sync (0%).
  - Add payouts/chat inbox parity plus push notification opt-ins (0%).
  - Complete store asset pipeline, beta channel, and crash reporting (0%).

## Task 7 – Quality Assurance, Policies & Launch Operations (0% complete)
### Integration Coverage
- **Backend:** Automated tests, policy enforcement, audit logging, performance monitoring.
- **Front-end:** Regression, accessibility, localisation, visual QA for web clients.
- **User Phone App:** Device lab tests, usability, offline/online transitions, crash monitoring.
- **Provider Phone App:** Workflow validation, payout testing, notification checks, beta cohort feedback.
- **Database:** Data validation, backups, retention compliance, rollback rehearsals.
- **API:** Contract, smoke, performance, chaos testing with observability dashboards.
- **Logic:** Workflow automation verification, feature flag governance, policy fallback handling.
- **Design:** QA sign-off, localisation review, documentation, change log assets.

### Subtasks
1. **Automated Test Suites (0%)** – Unit, integration, end-to-end (web/Flutter), load, security, accessibility.
2. **Integration & UAT Cycles (0%)** – Cross-platform smoke tests, beta programmes, defect triage, burndown tracking.
3. **Policy & Compliance Rollout (0%)** – Privacy/terms updates, spam/bad-word filters, moderation training, policy hub.
4. **Documentation & Training (0%)** – Knowledge base, SOPs, update brief, change log, support scripts.
5. **Launch & Post-Release Ops (0%)** – Rollout calendar, feature flags, monitoring dashboards, war room, post-mortems.

### Sprint Breakdown
- **Sprint 7A – Automation Foundations (0%)**
  - Stabilise Vitest coverage, contract tests, and lint gates in CI (0%).
  - Add accessibility/visual regression pipelines with baselines (0%).
  - Integrate load/security scans into nightly workflow (0%).
- **Sprint 7B – UAT & Policy Readiness (0%)**
  - Run cross-platform UAT scripts with learner/provider cohorts (0%).
  - Finalise privacy/terms updates and legal review sign-off (0%).
  - Train moderation/support teams on new escalation policies (0%).
- **Sprint 7C – Launch & Support (0%)**
  - Publish release communications and support runbooks (0%).
  - Staff launch war-room with monitoring + rollback playbooks (0%).
  - Schedule post-launch review and metrics dashboards (0%).

### Design Task Addendum
| Task | Status | Focus | Key Outputs |
| --- | --- | --- | --- |
| Token & Theme System Completion | 70% | Token architecture, emo/seasonal packs, runtime ingestion | Updated token exports, contrast reports, theme override playbooks. |
| Navigation & Layout Architecture | 45% | IA restructure, breadcrumb/stepper patterns, breakpoint matrices | Role-based menus, responsive grid specs, usability findings. |
| Template & Component Production | 30% | High-fidelity templates, component states, copy decks | Annotated templates, imagery manifests, localisation placeholders. |
| Accessibility, Compliance & Handoff | 20% | Accessibility audits, security overlays, engineering readiness | QA checklists, handoff kits, compliance approvals. |
| Theme Deployment & Runtime Validation | 15% | Theme switching validation, telemetry, rollback plans | Prototype switchers, runtime QA logs, incident response documentation. |
