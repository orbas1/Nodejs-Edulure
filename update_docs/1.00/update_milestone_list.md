# Version 1.00 Milestone Plan

Each milestone contains 1–3 primary tasks drawn from the update plan, with detailed subtasks describing the execution scope.

## Milestone 1 – Platform Foundations & Governance (Weeks 1–3)
- **Tasks Included:** Task 1 – Platform Hardening & Governance Foundations.
- **Goal:** Deliver secure, observable, and governable infrastructure before layering product capabilities.
- **Tasks & Subtasks:**
  1. **Task 1.1 Security Framework Upgrade**
     - Implement strict CORS, rate limits, password policy, JWT validation, and secret rotation scripts.
     - Status update: Multi-key JWT keystore, rotation CLI, middleware verification, account lockout telemetry, and email verification messaging delivered; final focus on session revocation and observability roll-up.
     - Add automated security scans (npm audit, Snyk) to CI and alert routing to the governance board.
  2. **Task 1.2 Dependency & Workspace Governance**
     - Select workspace tooling (PNPM/npm workspaces, Melos) and align Node/Flutter versions.
     - Configure automated dependency updates, lint/test scripts, and shared environment templates.
     - Status update: Adopted npm workspaces with Node 20.12.2+/npm 10.5.0+ enforcement, runtime verification, shared audit/lint/test commands, and axios-backed client wrappers; backend linting now runs via ESLint flat config with Prometheus-safe Vitest mocks, with Flutter alignment scheduled after backend sign-off.
  3. **Task 1.3 Observability, Migrations & Feature Flags**
     - Stand up logging/metrics dashboards for R2, Meilisearch, payments, communities, and mobile APIs.
     - Adopt Knex/Prisma migrations with rollback drills, seed datasets, and feature flag/configuration services.
     - Status update: Retention policy/audit migrations, production-grade seeds, owner triggers, the scripted data retention runner, the cron scheduler, and the feature flag/runtime configuration service (with `/api/runtime` endpoints and CLI) are live.

## Milestone 2 – Content Commerce & Learning Experiences (Weeks 2–6)
- **Tasks Included:** Task 2 – Content, Commerce & Live Learning Delivery.
- **Goal:** Enable courses, ebooks, live classrooms, tutor hire, and payment flows across platforms.
- **Tasks & Subtasks:**
  1. **Task 2.1 Cloudflare R2 Asset Fabric**
     - Configure buckets, lifecycle policies, antivirus, signed URLs, and monitoring.
     - Build upload microservice with PPT conversion triggers, checksum validation, and audit logs.
  2. **Task 2.2 Course & Ebook Enablement**
     - Ship module builder, drip scheduling, assignments, grading, analytics, and ebook reader upgrades.
     - Provide author consoles, watermarking, highlights/bookmarks, storefront updates, and notification hooks.
  3. **Task 2.3 Live Learning & Commerce**
     - Integrate Agora classrooms, scheduling, ticketing, tutor hourly hire, chat entry points, and recordings.
     - Finalise Stripe/PayPal intents, taxes, refunds, coupons, finance dashboards, and review capture.

## Milestone 3 – Communities, Social Graph & Dashboards (Weeks 5–10)
- **Tasks Included:** Task 3 – Communities, Social Graph & Engagement Systems; Task 5 – Dashboards, Profiles & Operational Consoles.
- **Goal:** Launch Communities 2.0 with social graph, monetisation, and dashboard ecosystems for learners, instructors, admins.
- **Tasks & Subtasks:**
  1. **Task 3.1 Community Core & Engagement**
     - Build community schemas, feeds, resource libraries, classroom links, leaderboards, tier points, streaks, and events.
     - Deliver chat channels, DMs, presence, moderation tools, and Agora live hooks.
  2. **Task 3.2 Roles, Paywalls & Affiliates**
     - Implement subscription tiers, Stripe billing, entitlements, affiliate marketplace, and payout scheduling.
     - Wire recommendation engines, follow graph, privacy settings, feed ranking, and analytics dashboards.
  3. **Task 5.1 Dashboards & Operational Consoles**
     - Rebuild profile components, finance/follower/widgets/stats surfaces, instructor dashboards, and community switcher.
     - Launch admin/customer service panels, ID verification, policy hub, and support ticket routing.
  - **Design Sync:** Community chat docks, DM inbox/thread panes, moderation consoles, presence beacons, unread badges, and DND prompts now reference `dashboard_drawings.md`, `menu_drawings.md`, `website_drawings.md`, `Admin_panel_drawings.md`, and `App_screens_drawings.md`, ensuring documentation mirrors the new messaging pagination and TTL contracts.
  - **Social Graph Delivery:** Follow relationships, privacy gates, mute/block cascades, and recommendation trays align to `dashboard_drawings.md`, `menu_drawings.md`, `website_drawings.md`, and `Admin_panel_drawings.md`, with updated flows documented in `ui-ux_updates/Web_Application_Design_Update` for dashboard and profile parity.
  - **Profile Progress:** `/api/profiles/{id}/overview` now aggregates hero metrics, engagement insights, programme shelves, quick actions, and timeline events with TTL caching, and the React profile route renders production-grade hero, badge, shelf, insight, and timeline components aligned to `Profile Look.md`, `Profile Styling.md`, `dashboard_drawings.md`, and `App_screens_drawings.md`. Backend/Frontend/Design change logs, task lists, and progress trackers were updated to document the new profile ecosystem so downstream squads inherit production-ready guidance.
  - **Compliance Progress:** Identity verification migrations, models, service layer, routes, seeds, and OpenAPI coverage ship alongside learner/instructor verification widgets and the admin compliance queue. Dashboard aggregates now surface KYC status, outstanding documents, SLA timers, and audit trails so operations/legal teams can adjudicate submissions, and design/change logs capture the new workflows for downstream squads.

## Milestone 4 – Explorer, Ads & Intelligence (Weeks 8–12)
- **Tasks Included:** Task 4 – Explorer Search, Ads & Intelligence Platform.
- **Goal:** Provide unified discovery, analytics, and monetisation through Meilisearch-backed explorer and Edulure Ads.
- **Tasks & Subtasks:**
  1. **Task 4.1 Meilisearch Infrastructure & Data Pipelines**
     - Provision clusters, security, replication, monitoring, and backup strategies.
     - Build ETL pipelines for communities, courses, ebooks, tutors, profiles, ads, and events with incremental syncs.
     - Status update: SearchClusterService is live with index provisioning/snapshots and the new SearchIngestionService now powers batched, incremental ETL across all explorer indexes, driven by the `npm run search:reindex` CLI and instrumented via Prometheus ingestion metrics for operational dashboards.
  2. **Task 4.2 Explorer & Ads Delivery**
     - Implement explorer navigation, filters, map previews, voice search, saved searches, and deep links (web + Flutter).
     - Launch ads campaign builder, targeting, budgeting, creatives, analytics dashboards, and compliance guards.
  3. **Task 4.3 Intelligence & Reporting**
     - Create dashboards for queries, zero results, CTR, conversions, ad spend, and prediction models.
     - Integrate insights into admin panels, notifications, and optimisation workflows.
     - Status update: Explorer analytics dashboards now ship at `/analytics` with KPI tiles, range toggles, manual refresh, charts, forecasts, query spotlights, and alert feeds wired to ExplorerAnalyticsService so ops teams can monitor search health without leaving the web client.

## Milestone 5 – Mobile Parity, QA & Launch (Weeks 10–18)
- **Tasks Included:** Task 6 – Mobile Parity & Store Readiness; Task 7 – Quality Assurance, Policies & Launch Operations.
- **Goal:** Achieve Flutter parity, execute testing, enforce policies, and deliver a production launch with monitoring.
- **Tasks & Subtasks:**
  1. **Task 6.1 Mobile Feature Delivery**
     - Implement learner modules (communities, explorer, courses, ebooks, live classes, chat, notifications) and instructor modules (management, pricing, analytics, inbox).
     - Optimise performance, offline caching, background sync, low-bandwidth states, and telemetry.
  2. **Task 6.2 Store & Compliance Readiness**
     - Prepare store listings, privacy disclosures, localisation, release pipelines, and rollout strategy.
     - Configure push notifications, deep links, and secure storage across learner and provider apps.
  3. **Task 7.1 QA, Policies & Launch Ops**
     - Run automated tests, beta programmes, security scans, accessibility checks, and moderation training.
     - Finalise knowledge base, update brief, change log, rollout calendar, war room staffing, and post-launch review.

### Design Milestone Addendum
| Design Milestone | Target Week | Current Status | Key Deliverables |
| --- | --- | --- | --- |
| Token & Theme System Finalisation | Week 2 | 70% complete | Cross-platform token exports, emo/seasonal theme guardrails, automated contrast reports. |
| Navigation & Layout Blueprint | Week 4 | 45% complete | Role-based IA schema, breakpoint matrices, breadcrumb/stepper interaction specs. |
| Template & Component Delivery | Week 6 | 100% complete | Annotated templates for home/dashboards/explorer/messaging/profile overview, asset manifests, copy decks. |
| Engineering Handoff & QA | Week 8 | 45% complete | Handoff kits, accessibility/localisation scripts, messaging QA packs, design QA sign-offs. |
