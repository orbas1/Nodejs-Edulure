# Version 1.50 – Milestone Plan

All milestones begin at **0%** completion. Task ownership aligns with the detailed task list.

## Milestone M1 – Platform Foundations & Security Baseline (Weeks 1–2, 0%)
- **Goal:** Stabilise core infrastructure, modularise services, and establish security posture to unblock downstream delivery.【F:update_docs/1.50/features_update_plan.md†L36-L68】【F:update_docs/1.50/pre-update_evaluations/fix_suggestions.md†L4-L37】
- **Tasks (6 total):**
  1. **M1.T1: Modular Service Bootstrap (0%)**
     - Split Express server into dedicated web, worker, and realtime deployments with readiness/liveness probes.
     - Implement capability manifest endpoint consumed by clients.
     - Configure CI pipelines for individual service builds and blue/green deployment scripts.【F:update_docs/1.50/features_update_plan.md†L36-L76】
  2. **M1.T2: Feature-Flagged Router Isolation (0%)**
     - Add `/v1` routing namespaces and per-domain feature toggles.
     - Generate OpenAPI specs per module and distribute TypeScript/Dart SDKs.
     - Integrate automated contract tests to guard version skew.【F:update_docs/1.50/pre-update_evaluations/fix_suggestions.md†L10-L28】
  3. **M1.T3: External State & Cache Strategy (0%)**
     - Deploy Redis cluster for feature flags, runtime config, and realtime presence.
     - Implement failover caching logic and cache warming jobs.
     - Instrument monitoring dashboards for cache health and latency.【F:update_docs/1.50/pre-update_evaluations/issue_report.md†L5-L21】
  4. **M1.T4: Security Configuration Hardening (0%)**
     - Enforce strict env schema validation, remove legacy JWT fallback, and document `.env.example`.
     - Add secrets rotation hooks and runtime audits for missing keys.
     - Implement SAST checks on configuration modules.【F:update_docs/1.50/features_to_add.md†L12-L30】
  5. **M1.T5: Operator Experience Foundations (0%)**
     - Design and scaffold operator health dashboard surfaces on web.
     - Surface health-check banners across web/mobile and log events for audit.
     - Document incident response workflow alignment with new dashboards.【F:update_docs/1.50/new_feature_brief.md†L18-L71】
  6. **M1.T6: Automated Dependency Governance (0%)**
     - Configure Renovate/Dependabot for JS/Flutter workspaces.
     - Generate SBOMs during CI and publish dependency change logs.
     - Enforce Socket.IO version parity tests across stacks.【F:update_docs/1.50/pre-update_evaluations/fix_suggestions.md†L37-L44】

## Milestone M2 – Data Governance & Compliance Enablement (Weeks 2–3, 0%)
- **Goal:** Re-architect schema, secure sensitive data, and operationalise GDPR/consent workflows.【F:update_docs/1.50/features_update_plan.md†L69-L93】【F:update_docs/1.50/features_to_add.md†L12-L70】
- **Tasks (5 total):**
  1. **M2.T1: Domain-Specific Migrations & Rollbacks (0%)**
     - Partition schema into core, commerce, analytics, and community modules.
     - Implement rollback scripts with automated testing in CI.
     - Export ERDs and ownership documentation for compliance teams.
  2. **M2.T2: Encryption & Indexing Implementation (0%)**
     - Apply column-level encryption/tokenisation for PII and financial records.
     - Add composite indexes to analytics/event tables and benchmark query performance.
     - Configure automated scans verifying encryption coverage.【F:update_docs/1.50/pre-update_evaluations/issue_list.md†L24-L29】
  3. **M2.T3: Modular Seeder & Credential Rotation (0%)**
     - Replace monolithic seed with domain fixtures and deterministic IDs.
     - Generate credential rotation scripts and purge legacy demo passwords.
     - Document seeding strategy for sandbox/staging environments.
  4. **M2.T4: GDPR & Consent Workflow Delivery (0%)**
     - Build consent ledger APIs and admin DSR queue management UI.
     - Integrate consent capture surfaces on web/mobile with localisation support.
     - Produce audit trails and notification hooks for compliance reviews.【F:update_docs/1.50/features_to_add.md†L18-L30】
  5. **M2.T5: Retention Scheduler Modernisation (0%)**
     - Add simulation mode, alerting, and rollback safeguards to retention jobs.
     - Emit CDC streams for analytics warehouse and regulatory exports.
     - Document retention policies with stakeholder sign-off.【F:update_docs/1.50/pre-update_evaluations/fix_suggestions.md†L44-L49】

## Milestone M3 – Creation Studio & Community Ecosystem (Weeks 3–4, 0%)
- **Goal:** Deliver creation studio, ads manager, community capabilities, and recommendation engines for monetisation and engagement.【F:update_docs/1.50/new_feature_brief.md†L27-L123】【F:update_docs/1.50/features_to_add.md†L32-L171】
- **Tasks (7 total):**
  1. **M3.T1: Creation Studio Core Build (0%)**
     - Implement backend services for projects, templates, collaboration, and asset library integration.
     - Develop web creation wizard with AI-assisted flows and template selection.
     - Provide analytics instrumentation for studio usage and completion rates.
  2. **M3.T2: Community & Social Graph Completion (0%)**
     - Build community feed services, memberships, and moderation workflow APIs.
     - Launch frontend/mobile community experiences with moderation cues and analytics.
     - Seed social graph datasets and ranking insights tables.
  3. **M3.T3: Ads Manager & Monetisation Tools (0%)**
     - Implement ads campaign management APIs, placement targeting, and fraud safeguards.
     - Deliver dashboards for campaign performance, budgeting, and approval workflows.
     - Integrate scam warning banners and review queues.【F:update_docs/1.50/features_to_add.md†L92-L148】
  4. **M3.T4: AI Assistance Enablement (0%)**
     - Configure AI provider adapters with usage metering and safety filters.
     - Add UI hooks for provider selection, BYO key entry, and moderation prompts.
     - Document AI governance controls and fallback strategies.【F:update_docs/1.50/features_to_add.md†L118-L171】
  5. **M3.T5: Recommendation & Ranking Services (0%)**
     - Deploy recommendation algorithms with explainability logs.
     - Build analytics dashboards surfacing ranking insights to admins/instructors.
     - Validate fairness and audit logging requirements.
  6. **M3.T6: Mobile Creation Companion (0%)**
     - Release Flutter companion for approvals, analytics, and community authoring.
     - Implement offline caching, conflict resolution, and consent-aware telemetry.
     - Align parity matrix for provider roadmap documentation.
  7. **M3.T7: Data & Policy Seeding for Ecosystem (0%)**
     - Populate templates, policy references, and taxonomy data sets.
     - Automate seeding scripts for QA/staging with deterministic outputs.
     - Record seeding evidence in compliance tracker.

## Milestone M4 – Integrations, Payments & Automation (Weeks 3–4, parallel, 0%)
- **Goal:** Finalise payments, financial dashboards, integrations, and notification mesh to satisfy enterprise partners.【F:update_docs/1.50/features_update_plan.md†L94-L135】【F:update_docs/1.50/features_to_add.md†L118-L204】
- **Tasks (6 total):**
  1. **M4.T1: Payment Flow Finalisation (0%)**
     - Complete checkout, refunds, chargeback handling, and wallet safeguards.
     - Build financial dashboards for learners/admins with export and reconciliation.
     - Conduct compliance review for non-custodial wallet posture.【F:update_docs/1.50/features_to_add.md†L149-L204】
  2. **M4.T2: CRM & Collaboration Integrations (0%)**
     - Implement HubSpot/Salesforce sync jobs with reconciliation logs.
     - Configure Slack notifications for critical workflow events.
     - Provide integration health dashboards and fallback procedures.【F:update_docs/1.50/features_update_plan.md†L94-L114】
  3. **M4.T3: Storage & Content Automation (0%)**
     - Integrate Google Drive picker and asset ingestion pipeline.
     - Automate backup validation and storage compliance documentation.
     - Ensure localisation assets sync across environments.
  4. **M4.T4: Notification Mesh Orchestration (0%)**
     - Unify email, push, in-app, and Slack notifications with preference management.
     - Implement delivery analytics, retries, and escalation workflows.
     - Update mobile/web clients to honour new preference APIs.【F:update_docs/1.50/new_feature_brief.md†L56-L83】
  5. **M4.T5: Integration Governance & BYO Keys (0%)**
     - Build secure storage for tenant-provided API keys with rotation reminders.
     - Document onboarding kits, sandbox credentials, and rate-limit policies.
     - Add admin UI for key management and integration toggles.
  6. **M4.T6: Financial Compliance & Audit Toolkit (0%)**
     - Generate reconciliation reports, SAR pipeline, and fraud thresholds.
     - Publish policies (Terms, Privacy, Cookies, Refund, About) via CMS with localisation.
     - Align finance/legal sign-off process with audit evidence.【F:update_docs/1.50/features_to_add.md†L149-L204】

## Milestone M5 – Experience, Localisation & Mobile Parity (Weeks 4–5, 0%)
- **Goal:** Finalise design system, accessibility, localisation, and mobile parity with resilient UX across platforms.【F:update_docs/1.50/features_update_plan.md†L115-L176】【F:update_docs/1.50/features_to_add.md†L173-L322】
- **Tasks (6 total):**
  1. **M5.T1: Design System & Navigation Overhaul (0%)**
     - Roll out design tokens, typography, and responsive grids across web/mobile.
     - Rebuild navigation for role-specific menus and progressive disclosure.
     - Validate accessibility (WCAG 2.1 AA) and localisation coverage.【F:update_docs/1.50/features_to_add.md†L173-L235】
  2. **M5.T2: Resilient Rendering & Error Handling (0%)**
     - Introduce global error boundaries, Suspense fallbacks, and secure session storage.
     - Surface realtime connectivity diagnostics and operator messages in UI.
     - Update analytics to capture degradation events and user sentiment.
  3. **M5.T3: Mobile UX & Performance Optimisation (0%)**
     - Parallelise Flutter bootstrap, implement environment switcher, and secure caches.
     - Optimise widget hierarchy, asset compression, and offline behaviours.
     - Add accessibility adjustments for dynamic text and contrast modes.【F:update_docs/1.50/features_to_add.md†L261-L322】
  4. **M5.T4: Localization & Policy Delivery (0%)**
     - Localise policies, transactional content, and help centre materials.
     - Implement language toggle logic with fallback sequencing across clients.
     - Conduct localisation QA sessions with target markets.
  5. **M5.T5: Scam & Fraud Experience Enhancements (0%)**
     - Deploy scam warning banners, education flows, and reporting entry points.
     - Integrate fraud analytics with ads manager and payments.
     - Document operator response scripts and training assets.【F:update_docs/1.50/new_feature_brief.md†L52-L123】
  6. **M5.T6: Parity Governance & Analytics (0%)**
     - Maintain parity tracker mapping web/mobile/provider coverage.
     - Align analytics taxonomy across platforms with dashboards for adoption KPIs.
     - Host parity review board sessions for cross-team sign-off.【F:update_docs/1.50/features_update_plan.md†L135-L143】

## Milestone M6 – Testing, Documentation & Release Readiness (Week 5, 0%)
- **Goal:** Complete testing suites, documentation, change log, compliance packets, and launch governance for Version 1.50.【F:update_docs/1.50/features_update_plan.md†L144-L224】【F:update_docs/1.50/features_to_add.md†L324-L362】
- **Tasks (5 total):**
  1. **M6.T1: Automated & Manual Test Completion (0%)**
     - Finalise unit/integration/E2E suites across backend, web, and mobile with coverage reports.
     - Execute performance, security, accessibility, and localisation test cycles.
     - Compile defect logs and remediation evidence.
  2. **M6.T2: Documentation & Runbook Refresh (0%)**
     - Update README, setup guides, update index, and change log.
     - Produce operator runbooks, incident response playbooks, and integration manuals.
     - Validate documentation accuracy with stakeholder walkthroughs.【F:update_docs/1.50/features_to_add.md†L324-L362】
  3. **M6.T3: Compliance & Audit Sign-off (0%)**
     - Finalise GDPR, security, and financial compliance packets with evidence.
     - Obtain legal, finance, and security approvals recorded in tracker.
     - Ensure SBOMs and dependency provenance are archived for release.
  4. **M6.T4: Release Readiness & Hypercare Planning (0%)**
     - Conduct go/no-go review, rollback drills, and support handover.
     - Prepare hypercare roster, escalation matrix, and stakeholder communications.
     - Align mobile store submissions (assets, privacy labels) with launch timeline.【F:update_docs/1.50/features_update_plan.md†L187-L224】
  5. **M6.T5: End-of-Update Reporting (0%)**
     - Compile update progress tracker results, milestone outcomes, and KPI performance.
     - Draft end-of-update report summarising lessons, risks, and customer enablement.
     - Deliver release notes package to marketing and customer success.【F:update_docs/1.50/new_feature_brief.md†L202-L221】


---

## Design Milestones Addendum
The following design-focused milestones complement M1–M6 by ensuring UI/UX outputs progress in lockstep with engineering.

1. **D1 – Foundation Token Consolidation (Week 1)** – Freeze cross-platform tokens, palettes, and accessibility guardrails to provide a single source of truth before feature squads begin implementation.【F:update_docs/1.50/Design_update_milestone_list.md†L5-L16】
2. **D2 – Mobile Experience Architecture (Weeks 1–3)** – Deliver annotated wireframes, navigation partials, and flow diagrams for learner/provider apps across breakpoints, enabling theming and parity decisions early.【F:update_docs/1.50/Design_update_milestone_list.md†L18-L29】
3. **D3 – Web Experience & Navigation Overhaul (Weeks 2–4)** – Complete marketing funnel redesign, dashboard templates, and component specs ready for Storybook ingestion without disrupting platform milestones.【F:update_docs/1.50/Design_update_milestone_list.md†L31-L40】
4. **D4 – Asset, Copy, and Compliance Delivery (Weeks 3–5)** – Finalise copy decks, asset manifests, and accessibility test scripts that unlock engineering/QA readiness for new pages and theme variants.【F:update_docs/1.50/Design_update_milestone_list.md†L42-L54】
5. **D5 – Handoff & Measurement Enablement (Weeks 4–6)** – Package artefacts, run walkthroughs, and define measurement cadences so experience KPIs can be tracked alongside release readiness gates.【F:update_docs/1.50/Design_update_milestone_list.md†L56-L66】
