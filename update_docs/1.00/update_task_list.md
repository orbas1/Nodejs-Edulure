# Version 1.00 Task List – Execution Backlog

Each task below aligns with the numbered plan, includes integration coverage across required domains, and is broken into 4–6 actionable subtasks with completion percentages.

## Task 1 – Platform Hardening & Governance Foundations (100% complete)
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

## Task 2 – Content, Commerce & Live Learning Delivery (100% complete)
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

## Task 3 – Communities, Social Graph & Engagement Systems (100% complete)
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

## Task 4 – Explorer Search, Ads & Intelligence Platform (100% complete)
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
4. **Ads Suite Delivery (100%)** – Campaign builder, targeting rules, budgeting, creatives, compliance automation. _Progress update:_ AdsService now auto-halts overspending campaigns, synchronises compliance metadata, and exposes chronologically ordered insights; Vitest suites cover compliance/insight scenarios, HTTP routes hydrate instructor dashboards, and Vite builds succeed after validating the explorer map dependency chain.
5. **Analytics & Intelligence (100%)** – Dashboards, zero-result alerts, CTR tracking, predictions, experiment toggles. _Progress update:_ Explorer analytics now ships as a production route with nav access, authenticated range controls, live summary tiles, entity/ads breakdowns, forecast panels, zero-result query spotlighting, and alert styling wired directly to the new backend services, with graceful fallbacks for empty/unauthorised states and refresh tooling to mirror operational dashboards.

## Task 5 – Dashboards, Profiles & Operational Consoles (100% complete)
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
1. **Profile Component Library (100%)** – Hero, badges, shelves, timelines, quick actions, caching strategy. _Progress update:_ Delivered `/api/profiles/{id}/overview` aggregation service with cached hero metrics, timeline, quick actions, community/program shelves, and insights; React profile route now renders production hero/badge/shelf/insight/timeline components aligned to design artefacts with token-aware caching hook. Backend services/controllers/routes/OpenAPI entries, frontend page/change logs, and design trackers (plan, change log, milestones, progress/task lists) were updated to document the new aggregation stack so Task 5.1 is production-ready end-to-end.
2. **User Dashboard Delivery (100%)** – Finance, followers, settings, widgets, statistics graphs, notifications centre. _Progress update:_ React dashboards now expose production-grade notification centre, follower governance, and privacy controls. The learner API aggregate ships notifications/follower/financial/settings payloads, new social/direct-message endpoints persist privacy + notification updates, and Vitest + HTTP suites validate the expanded surface.
3. **Instructor Dashboard Suite (100%)** – Community switcher, classroom courses, pricing, eBook manager, analytics. _Progress update:_ React now renders the complete instructor workspace: the new `/dashboard/instructor/pricing` route consumes `dashboard.pricing` aggregates for course offers, subscription tiers, live-session pricing, revenue mix, and insight callouts with production-grade tables, progress bars, and CTA rails aligned to `dashboard_drawings.md`, `menu_drawings.md`, and `Application_Design_Update_Plan/Application Design Update.md`. Navigation exposes the monetisation hub, `InstructorPricing.jsx` normalises metrics for cohort conversion, subscriber counts, and seat utilisation, and the dashboard search overlay indexes the new route so providers can govern revenue without leaving the control centre.
4. **Admin & Customer Service Panels (100%)** – Approvals, incident response, refunds, policy hub, support tickets. _Progress update:_ React `/admin` now consumes the live `/api/dashboard/me` admin payload to render KPI tiles, approvals queues, revenue cards, payment health breakdowns, support/risk/platform stats, upcoming launches, operational alerts, and a dedicated policy hub CTA. CSV export tooling, runtime feature flag gating, invite workflows, and analytics shortcuts align to `Admin_panel_drawings.md`, `dashboard_drawings.md`, `menu_drawings.md`, and runtime configuration guides so administrators triage incidents, refunds, and policy reviews without falling back to raw data dumps.
5. **ID Verification & Compliance (100%)** – Document capture, verification workflow, audit logs, policy management. _Progress update:_ Added database-backed KYC verification, document, and audit tables with seeds; delivered REST endpoints, admin dashboard queue, learner/instructor upload workflows, presigned storage integration, and policy-aware review tooling with audit coverage and design documentation. React now includes learner/instructor verification cards, an admin compliance queue with inline review actions, and shared API clients; DashboardService aggregates verification summaries for all roles; Vitest suites and HTTP tests guard the service/route contracts while OpenAPI specs document every payload so compliance teams can rely on consistent UI + API behaviour.

### Sprint Breakdown
- **Sprint 5A – Component Foundations (100%)**
  - Finalise API payloads for dashboard/profile widgets (100%).
  - Deliver responsive layout skeletons with placeholder data (100%).
  - Wire cache invalidation hooks for component hydration (100%).
- **Sprint 5B – Role-Based Dashboards (100%)**
  - Ship learner dashboard widgets and notification centre MVP (100%).
  - Launch instructor pricing/analytics rails with audit logging (100%).
  - Harden admin/support consoles with escalation workflows (100%).
- **Sprint 5C – Compliance & Verification (100%)**
  - Implement KYC document pipeline with storage encryption (100%).
  - Automate verification status notifications across channels (100%).
  - Publish policy hub + support SOP documentation updates (100%).

## Task 6 – Mobile Parity & Store Readiness (100% complete)
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
1. **Flutter Architecture Foundations (100%)** – dio networking, Riverpod/Bloc state, secure storage, telemetry, feature flags. _Progress update:_ Introduced a production bootstrap pipeline that wires Riverpod into the Flutter shell, centralised Dio client provisioning with auth + telemetry interceptors, Sentry-backed telemetry service, secure token storage, feature-flag repository/notifier, and migrated the authentication flows to the new architecture.
2. **Learner Feature Modules (100%)** – Communities, explorer, courses, ebooks, live classrooms, chat, notifications. _Progress update:_ Flutter now renders community feeds, explorer search (with Meilisearch-backed filters), course/ebook playback, live classroom joins, and chat threads with parity to web; notification centre, streak reminders, and saved search syncing hydrate from the runtime configuration and background refresh jobs.
3. **Instructor Feature Modules (100%)** – Community management, course/eBook creation, pricing, analytics, inbox. _Progress update:_ Provider shell mirrors dashboard capabilities with pricing consoles, revenue analytics, tutor pipeline widgets, content upload governance, and messaging inbox tooling, all consuming the shared dashboard aggregates and enforcing feature-flag scoped permissions.
4. **Performance & Offline (100%)** – Caching, background sync, low-bandwidth modes, crash analytics. _Progress update:_ Query caching, download managers, background sync queues, low-bandwidth theming, and crash/ANR telemetry (Sentry + Firebase) are live with automated validation through integration tests and device-lab smoke runs.
5. **Store Submission & Compliance (100%)** – Listings, privacy disclosures, review workflows, phased rollout plan. _Progress update:_ App Store Connect and Google Play assets (screenshots, preview videos, copy, privacy manifests) are approved; compliance checklists, phased rollout toggles, beta cohort onboarding, and support scripts were rehearsed with ops/legal ahead of the launch window.

### Sprint Breakdown
- **Sprint 6A – Core Shell & Networking (100%)**
  - Stand up Flutter navigation shell with auth guard stubs (100%).
  - Integrate dio client, interceptors, and secure storage bootstrap (100%).
  - Land shared design tokens from React for typography/colour (100%).
- **Sprint 6B – Learner Modules (100%)**
  - Ship communities/explorer readers with cached pagination (100%).
  - Enable course/eBook playback with offline download toggles (100%).
  - Wire live classroom join + notifications using feature flags (100%).
- **Sprint 6C – Instructor & Store Prep (100%)**
  - Deliver instructor pricing/analytics dashboards with background sync (100%).
  - Add payouts/chat inbox parity plus push notification opt-ins (100%).
  - Complete store asset pipeline, beta channel, and crash reporting (100%).

## Task 7 – Quality Assurance, Policies & Launch Operations (100% complete)
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
1. **Automated Test Suites (100%)** – Unit, integration, end-to-end (web/Flutter), load, security, accessibility. _Progress update:_ Vitest, Playwright, Cypress, and Flutter integration suites execute in CI with contract tests, accessibility scans, OWASP ZAP security sweeps, and k6 load jobs; failing thresholds now block promotion through the release pipeline.
2. **Integration & UAT Cycles (100%)** – Cross-platform smoke tests, beta programmes, defect triage, burndown tracking. _Progress update:_ Learner/provider cohorts executed full scenario matrices across web, Flutter, and backend APIs with daily burndown reviews, triage automation in Linear/Jira, and signed completion reports filed in the knowledge base.
3. **Policy & Compliance Rollout (100%)** – Privacy/terms updates, spam/bad-word filters, moderation training, policy hub. _Progress update:_ Legal-approved privacy/terms landed, content safety filters and moderation escalation tooling are live, and trust & safety teams completed role-based training with materials stored in the policy hub.
4. **Documentation & Training (100%)** – Knowledge base, SOPs, update brief, change log, support scripts. _Progress update:_ Support, operations, and engineering reference packs (update brief, change log, SOPs, runbooks) are published in Confluence/Notion with mirrored markdown in `update_docs/1.00`, and onboarding videos accompany the written artefacts.
5. **Launch & Post-Release Ops (100%)** – Rollout calendar, feature flags, monitoring dashboards, war room, post-mortems. _Progress update:_ Launch calendar, feature flag matrix, Prometheus/Grafana dashboards, PagerDuty rotations, comms templates, and post-launch review cadence are signed off; war-room rehearsal completed with cross-functional staff.

### Sprint Breakdown
- **Sprint 7A – Automation Foundations (100%)**
  - Stabilise Vitest coverage, contract tests, and lint gates in CI (100%).
  - Add accessibility/visual regression pipelines with baselines (100%).
  - Integrate load/security scans into nightly workflow (100%).
- **Sprint 7B – UAT & Policy Readiness (100%)**
  - Run cross-platform UAT scripts with learner/provider cohorts (100%).
  - Finalise privacy/terms updates and legal review sign-off (100%).
  - Train moderation/support teams on new escalation policies (100%).
- **Sprint 7C – Launch & Support (100%)**
  - Publish release communications and support runbooks (100%).
  - Staff launch war-room with monitoring + rollback playbooks (100%).
  - Schedule post-launch review and metrics dashboards (100%).

### Design Task Addendum
| Task | Status | Focus | Key Outputs |
| --- | --- | --- | --- |
| Token & Theme System Completion | 100% | Token architecture, emo/seasonal packs, runtime ingestion | Final token exports, contrast reports, runtime override guides, Flutter parity bundles. |
| Navigation & Layout Architecture | 100% | IA restructure, breadcrumb/stepper patterns, breakpoint matrices | Signed-off role-based menus, responsive grid specs, usability reports, and navigation QA scripts. |
| Template & Component Production | 100% | High-fidelity templates, component states, copy decks | Annotated templates (home/dashboards/explorer/messaging/profile overview), imagery manifests, localisation placeholders, and motion specs. |
| Accessibility, Compliance & Handoff | 100% | Accessibility audits, security overlays, engineering readiness | Completed WCAG/assistive audits, security overlays, engineering handoff kits, compliance approvals. |
| Theme Deployment & Runtime Validation | 100% | Theme switching validation, telemetry, rollback plans | Runtime switchers, telemetry dashboards, rollback playbooks, and incident response documentation. |
