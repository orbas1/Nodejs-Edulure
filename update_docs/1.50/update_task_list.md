# Version 1.50 – Detailed Task List

All tasks start at **0%** completion. Percentages will be updated during execution.

## 1. Platform Hardening & Modularisation (20%)
- **Objective:** Decouple backend services, externalise shared state, and enforce secure configuration to resolve Issues 1–4 & 8–10 while enabling enterprise hardening commitments.【F:update_docs/1.50/pre-update_evaluations/issue_list.md†L4-L37】【F:update_docs/1.50/features_to_add.md†L6-L30】
- **Integration Subtasks (8 total):**
  - **Backend:**
    1. Split server bootstrap into web, worker, and realtime services with readiness probes and crash isolation.【F:update_docs/1.50/pre-update_evaluations/fix_suggestions.md†L4-L19】 ✅ Completed – modular entrypoints deployed with readiness telemetry, signal-aware shutdown, and per-service health surfaces.
    2. Implement feature-flagged router loader with `/v1` prefixes and error-boundary middleware. ✅ Completed – added declarative registry, feature flag gate middleware, legacy redirects, and route-level error boundaries with supporting tests.
  - **Front-end:**
    3. Consume new health-check and capability endpoints to display service availability banners. ✅ Completed – frontend shell polls capability manifest, renders global service alerts, and surfaces outage messaging across layouts.【F:frontend-reactjs/src/context/ServiceHealthContext.jsx†L1-L165】【F:frontend-reactjs/src/components/status/ServiceHealthBanner.jsx†L1-L96】
    4. Update build pipeline to ingest generated TypeScript SDK from modularised APIs. ✅ Completed – React prebuild/dev hooks compile the shared SDK workspace so bundlers consume regenerated clients on every build.【F:frontend-reactjs/package.json†L10-L23】【F:sdk-typescript/scripts/generate-sdk.mjs†L1-L66】
  - **User Phone App:**
    5. Adjust environment bootstrap to handle new capability manifest, including fallback messaging when services degrade.【F:update_docs/1.50/features_to_add.md†L237-L286】 ✅ Completed – Flutter bootstrap now warms the manifest provider, caches responses, and renders a persistent capability banner that communicates degraded or unavailable services across the mobile shell.【F:Edulure-Flutter/lib/bootstrap/app_bootstrap.dart†L1-L58】【F:Edulure-Flutter/lib/core/runtime/capability_manifest_notifier.dart†L1-L112】【F:Edulure-Flutter/lib/widgets/capability_status_banner.dart†L1-L218】
  - **Provider Phone App:**
    6. Define parity hooks and stubs for future provider app to consume capability manifest and RBAC matrix (documentation + interface contracts). ✅ Completed – provider bootstrap, RBAC matrix models, and parity documentation ready for provider squads to integrate manifest/RBAC flows without rewrites.【F:Edulure-Flutter/lib/provider/bootstrap/provider_app_bootstrap.dart†L1-L94】【F:Edulure-Flutter/lib/provider/runtime/provider_capability_bridge.dart†L1-L182】【F:Edulure-Flutter/lib/core/security/rbac_matrix_models.dart†L1-L214】【F:update_docs/1.50/provider_phone_app_updates/rbac_contracts.md†L1-L51】
  - **Database:**
    7. Create migration scripts for audit, consent, and incident tables with encrypted columns and index policies.【F:update_docs/1.50/features_to_add.md†L12-L70】 ✅ Completed – introduced dedicated compliance tables with encrypted payload columns, hashed index support, SLA metadata, and tenant-aware governance to unblock enterprise audits.【F:backend-nodejs/migrations/20250204100000_compliance_audit_consent_incidents.js†L1-L180】
  - **API:**
    8. Publish versioned OpenAPI specs with service separation and automated contract tests. ✅ Completed – automated builder now slices the platform spec into capability catalogs, exposes `/api/v1/docs/services/:service`+UI endpoints, and validates coverage via Vitest contract checks.
  - **Logic:**
    9. Externalise feature flags/runtime config to Redis with cache warming and failover strategies.【F:update_docs/1.50/pre-update_evaluations/fix_suggestions.md†L19-L28】 ✅ Completed – feature flags and runtime configuration now hydrate from a Redis-backed distributed snapshot with startup warming, lock-based refresh orchestration, and graceful degradation when Redis is unavailable.【F:backend-nodejs/src/services/DistributedRuntimeCache.js†L1-L129】【F:backend-nodejs/src/services/FeatureFlagService.js†L1-L520】【F:backend-nodejs/src/config/redisClient.js†L1-L92】
  - **Design:**
    10. Produce operator dashboard wireframes highlighting system health, incident response shortcuts, and scam warning placement.【F:update_docs/1.50/new_feature_brief.md†L18-L71】 ✅ Completed – Delivered operator command centre wireframes and implementation covering severity-coded KPI cards, service matrices, incident queues, scam intelligence, and runbook shortcuts backed by the new operator dashboard service.【F:update_docs/1.50/ui-ux_updates/web_app_wireframe_changes.md†L125-L151】【F:frontend-reactjs/src/pages/dashboard/AdminOperator.jsx†L19-L371】【F:backend-nodejs/src/services/OperatorDashboardService.js†L92-L305】

## 2. Data Governance & Compliance Reinforcement (0%)
- **Objective:** Partition schema, secure PII, modernise seeds, and align retention tooling to deliver compliance-ready infrastructure.【F:update_docs/1.50/features_to_add.md†L12-L70】【F:update_docs/1.50/pre-update_evaluations/issue_list.md†L18-L30】
- **Integration Subtasks (10 total):**
  - **Backend:**
    1. Refactor Knex migrations into domain modules with rollback scripts and automated ERD exports.【F:update_docs/1.50/pre-update_evaluations/fix_suggestions.md†L30-L37】 ✅ Completed – compliance domain helper provisions audit, consent, incident, and CDC tables with partitioning plus an ERD generator for governance packs.【F:backend-nodejs/src/database/domains/compliance.js†L1-L449】【F:backend-nodejs/scripts/generate-erd.js†L1-L140】
    2. Implement CDC events for analytics warehouse subscriptions and retention job dry runs.【F:update_docs/1.50/pre-update_evaluations/fix_suggestions.md†L46-L49】 ✅ Completed – change data capture service records governance events and retention jobs emit CDC payloads with retry instrumentation and simulation tooling.【F:backend-nodejs/src/services/ChangeDataCaptureService.js†L1-L111】【F:backend-nodejs/src/services/dataRetentionService.js†L1-L231】
  - **Front-end:**
    3. Build GDPR admin console for DSR queue management and policy version logs.【F:update_docs/1.50/features_to_add.md†L18-L30】 ✅ Completed – React governance control centre renders DSR queues, escalation actions, and policy timeline components backed by the compliance API client.【F:frontend-reactjs/src/pages/dashboard/AdminGovernance.jsx†L1-L196】【F:frontend-reactjs/src/api/complianceApi.js†L1-L86】
    4. Surface consent status in user profile, including revocation flows and policy links. ✅ Completed – profile consent ledger fetches live records, displays grant metadata, and offers inline revoke controls powered by the shared hook and compliance endpoints.【F:frontend-reactjs/src/pages/Profile.jsx†L830-L870】【F:frontend-reactjs/src/hooks/useConsentRecords.js†L1-L52】
  - **User Phone App:**
    5. Add consent capture modals, DSR request initiation, and secure cache purge triggers on logout.【F:update_docs/1.50/features_to_add.md†L243-L286】 ✅ Completed – Flutter home screen launches a consent dialog, invokes the DSR client, and resets Hive-stored privacy preferences during logout to honour revocations.【F:Edulure-Flutter/lib/screens/home_screen.dart†L268-L332】【F:Edulure-Flutter/lib/services/privacy_preferences.dart†L1-L34】
  - **Provider Phone App:**
    6. Draft governance checklist and API contracts enabling provider admins to honour retention/deletion requests once app exists. ✅ Completed – published provider retention governance blueprint with end-to-end SLA, audit, and evidence workflows plus Flutter contracts that parse compliance payloads, enforce dual-signoff, and gate completion flows behind RBAC-managed capabilities.【F:update_docs/1.50/provider_phone_app_updates/governance_retention_contracts.md†L1-L211】【F:Edulure-Flutter/lib/provider/runtime/provider_compliance_contracts.dart†L1-L302】【F:update_docs/1.50/provider_phone_app_updates/provider_app_change_log.md†L10-L21】
  - **Database:**
    7. Encrypt KYC/financial fields, enforce data classification tags, and add composite indexes for analytics tables.【F:update_docs/1.50/pre-update_evaluations/issue_list.md†L24-L29】 ✅ Completed – Introduced a data encryption service with key rotation support, hardened KYC and payments models to persist ciphertext + hashes, migrated affiliate payouts, and shipped schema upgrades with composite analytics indexes.【F:backend-nodejs/src/services/DataEncryptionService.js†L1-L165】【F:backend-nodejs/src/models/PaymentIntentModel.js†L1-L203】【F:backend-nodejs/migrations/20250211104500_secure_kyc_financial_payloads.js†L1-L120】
    8. Configure partitioning/archival policies for consent, audit, and incident tables.【F:backend-nodejs/src/services/DataPartitionService.js†L1-L347】【F:backend-nodejs/src/jobs/dataPartitionJob.js†L1-L154】 ✅ Completed – automated monthly partition rotation now archives aged slices to R2 before drop, tracks evidence in `data_partition_archives`, and exposes a worker scheduler plus CLI for governance operations.【F:backend-nodejs/migrations/20250212121500_partition_archiving.js†L1-L15】【F:backend-nodejs/scripts/manage-data-partitions.js†L1-L67】【F:backend-nodejs/src/servers/workerService.js†L1-L166】
  - **API:**
      9. Expose GDPR/consent endpoints with RBAC gating and audit trail logging. ✅ Completed – compliance routes enforce admin auth, surface consent lifecycle, and emit CDC events for audit trails across DSR and policy endpoints.【F:backend-nodejs/src/routes/compliance.routes.js†L1-L18】【F:backend-nodejs/src/services/ComplianceService.js†L1-L247】
    - **Logic:**
      10. Integrate retention scheduler with simulation mode, alerting, and rollback options. ✅ Completed – retention service now accepts run IDs, dry-run modes, and alert callbacks while emitting CDC snapshots for downstream analytics.【F:backend-nodejs/src/services/dataRetentionService.js†L1-L231】【F:backend-nodejs/scripts/run-data-retention.js†L1-L214】
  - **Design:**
    11. Produce UX flows for consent capture, privacy dashboards, and scam/fraud education surfaces.【F:update_docs/1.50/features_to_add.md†L173-L235】 ✅ Completed – learner and web privacy hubs now document consent drawers, DSR countdowns, scam-education playlists, and escalation strips tied to compliance services.【F:update_docs/1.50/ui-ux_updates/user_app_wireframe_changes.md†L73-L116】【F:update_docs/1.50/ui-ux_updates/user_application_logic_flow_changes.md†L73-L119】【F:update_docs/1.50/ui-ux_updates/web_app_wireframe_changes.md†L101-L130】【F:update_docs/1.50/ui-ux_updates/web_application_logic_flow_changes.md†L109-L140】

## 3. Creation Studio & Content Ecosystem Delivery (0%)
- **Objective:** Launch creation studio, ads manager, community tooling, and analytics required for monetisation and engagement boosts.【F:update_docs/1.50/new_feature_brief.md†L27-L123】【F:update_docs/1.50/features_to_add.md†L32-L171】
- **Integration Subtasks (12 total):**
  - **Backend:**
    1. Implement services for creation projects, templates, collaboration sessions, and ads campaigns with RBAC enforcement.【F:update_docs/1.50/features_to_add.md†L32-L102】 ✅ Completed – creation studio domain, migrations, RBAC-aware service layer, HTTP controller, and tests published for multi-tenant authoring and ad promotion flows.
    2. Build moderation pipeline APIs for community posts, scam reports, and analytics capture.【F:update_docs/1.50/features_to_add.md†L92-L171】 ✅ Completed – launched moderation case tables, service/controller layer, scam reporting, and analytics events powering the safety review queue and dashboards under `/api/v1/moderation`.【F:backend-nodejs/migrations/20250215120000_community_moderation_pipeline.js†L1-L197】【F:backend-nodejs/src/services/CommunityModerationService.js†L1-L676】【F:backend-nodejs/src/controllers/CommunityModerationController.js†L1-L342】【F:backend-nodejs/src/routes/communityModeration.routes.js†L1-L45】
  - **Front-end:**
    3. Develop creation studio UI wizard, asset library, and collaborative editing indicators. ✅ Completed – Instructor creation studio now ships a production-grade hub with API-driven project tables, readiness stepper, real-time presence controls, and template launch workflows wired to the creation service endpoints.【F:frontend-reactjs/src/pages/dashboard/InstructorCreationStudio.jsx†L1-L229】【F:frontend-reactjs/src/api/creationStudioApi.js†L1-L213】【F:frontend-reactjs/src/pages/dashboard/instructor/creationStudio/CreationWizardStepper.jsx†L1-L164】【F:frontend-reactjs/src/pages/dashboard/instructor/creationStudio/CreationAssetLibrary.jsx†L1-L274】
    4. Implement analytics dashboard with export, ranking insights, and scam banner integration.
  - **User Phone App:**
    5. Deliver mobile creation companion for approvals, asset review, and community posting with offline caching.【F:update_docs/1.50/features_to_add.md†L261-L302】
    6. Integrate mobile ads governance screens for campaign insights and fraud flagging.
  - **Provider Phone App:**
    7. Document provider roadmap for ads/creation oversight, including API endpoints and moderation workflows to share with partner team.
  - **Database:**
    8. Create tables for creation_projects, ads_campaigns, community_posts, community_memberships, ranking_insights with indexes.【F:update_docs/1.50/features_to_add.md†L44-L148】
  - **API:**
    9. Generate GraphQL/REST endpoints for live feed aggregation, ads placement, and analytics queries.
  - **Logic:**
    10. Implement recommendation algorithms with explainability logs and multi-tenant feature flags.
    11. Wire AI assistance services with provider-specific throttling and usage metering.【F:update_docs/1.50/features_to_add.md†L118-L171】
  - **Design:**
    12. Finalise design system components for studio layouts, ads dashboards, community feeds, and scam warnings.【F:update_docs/1.50/new_feature_brief.md†L84-L123】

## 4. Integrations, Automation & Notifications (0%)
- **Objective:** Deliver CRM, Slack, Google Drive, AI adapters, notification mesh, and webhook automation per enterprise integration strategy.【F:update_docs/1.50/features_update_plan.md†L94-L135】【F:update_docs/1.50/features_to_add.md†L118-L171】
- **Integration Subtasks (11 total):**
  - **Backend:**
    1. Build integration orchestrator handling HubSpot/Salesforce sync, retry policies, and reconciliation reports.【F:update_docs/1.50/features_to_add.md†L118-L149】
    2. Implement webhook/event bus broadcasting integration and payment events with circuit breakers.【F:update_docs/1.50/features_update_plan.md†L94-L114】
  - **Front-end:**
    3. Add admin integration dashboard showing sync status, error logs, and manual retry controls.
    4. Provide BYO API key management UI with validation and rotation reminders.
  - **User Phone App:**
    5. Integrate Firebase/Slack notifications with unified preference centre and offline queueing.【F:update_docs/1.50/features_to_add.md†L261-L302】
  - **Provider Phone App:**
    6. Prepare integration parity checklist and push-notification design guidelines for future provider release.
  - **Database:**
    7. Add integration status tables, API key vault references, and audit logs for external calls.
  - **API:**
    8. Expose integration health endpoints and Slack notification webhooks with RBAC gating.
  - **Logic:**
    9. Implement AI provider routing with guardrails, safety filters, and per-tenant quotas.【F:update_docs/1.50/features_to_add.md†L149-L171】
    10. Configure notification mesh orchestrator unifying email, push, Slack, and in-app flows.【F:update_docs/1.50/new_feature_brief.md†L56-L83】
  - **Design:**
    11. Create integration status visualisations, BYO key forms, and notification preference UI guidelines.

## 5. Experience, Navigation & Accessibility Modernisation (0%)
- **Objective:** Deliver unified design system, responsive navigation, localisation, accessibility, and resilience improvements on web/mobile.【F:update_docs/1.50/new_feature_brief.md†L84-L171】【F:update_docs/1.50/features_to_add.md†L173-L235】
- **Integration Subtasks (12 total):**
  - **Backend:**
    1. Provide localisation APIs, feature flag metadata, and telemetry endpoints supporting UI resilience.
    2. Emit realtime socket diagnostics for frontend instrumentation and operator dashboards.【F:update_docs/1.50/pre-update_evaluations/fix_suggestions.md†L70-L79】
  - **Front-end:**
    3. Implement global error boundary, Suspense fallbacks, and secure session handling using HTTP-only cookies.【F:update_docs/1.50/pre-update_evaluations/fix_suggestions.md†L52-L70】
    4. Rebuild navigation with role-based configuration and accessible patterns.
    5. Apply design tokens, WCAG-compliant components, and localisation toggles across experiences.
  - **User Phone App:**
    6. Refresh theming, navigation, and accessibility behaviours including dynamic text sizing and contrast adjustments.【F:update_docs/1.50/features_to_add.md†L261-L322】
    7. Surface realtime connectivity states and offline indicators inside messaging/live feed modules.
  - **Provider Phone App:**
    8. Define accessibility and navigation guidelines to reuse for provider personas, ensuring parity once product exists.
  - **Database:**
    9. Seed localisation bundles, policy content, and analytics dashboards with multilingual entries.
  - **API:**
    10. Deliver content/localisation endpoints, analytics export APIs, and notification preference CRUD.
  - **Logic:**
    11. Implement multi-language toggle logic with fallback sequencing and instrumentation.
  - **Design:**
    12. Finalise responsive design system library, icon sets, scam warning placements, and onboarding tooltip storyboards.【F:update_docs/1.50/features_to_add.md†L173-L235】

## 6. Mobile Parity, Security & Performance (0%)
- **Objective:** Achieve enterprise parity on Flutter app including environment configurability, secure storage, consent-aware telemetry, and messaging resilience.【F:update_docs/1.50/new_feature_brief.md†L126-L171】【F:update_docs/1.50/features_to_add.md†L237-L322】
- **Integration Subtasks (10 total):**
  - **Backend:**
    1. Ensure mobile APIs expose same RBAC and audit trails as web endpoints, including capability manifest service.
  - **Front-end:**
    2. Align runtime configuration endpoints and parity dashboards consumed by mobile teams.
  - **User Phone App:**
    3. Implement environment switcher with secure storage and runtime validation for endpoints.【F:update_docs/1.50/features_to_add.md†L237-L260】
    4. Encrypt Hive caches, purge on logout, and implement biometric unlock for credentials.【F:update_docs/1.50/pre-update_evaluations/fix_suggestions.md†L79-L93】
    5. Parallelise bootstrap flows with resilience telemetry and operator alerts on failure.
    6. Deliver full parity for messaging, live feeds, payments, policies, and scam alerts including offline support.
  - **Provider Phone App:**
    7. Produce parity governance matrix and design prototypes to fast-track provider app development.
  - **Database:**
    8. Sync mobile analytics events into warehouse with consent-aware flags.
  - **API:**
    9. Extend notification preference APIs and feature-flag payloads tailored for mobile caching.
  - **Logic:**
    10. Implement consent-aware telemetry toggles and remote config controls for staged rollouts.
  - **Design:**
    11. Update mobile-specific UI kits, motion guidelines, and accessibility checklists.

## 7. Testing, Documentation & Release Enablement (0%)
- **Objective:** Deliver automated/manual testing coverage, documentation updates, change logs, and post-launch readiness artefacts per governance strategy.【F:update_docs/1.50/features_update_plan.md†L144-L224】【F:update_docs/1.50/features_to_add.md†L324-L362】
- **Integration Subtasks (12 total):**
  - **Backend:**
    1. Expand automated unit/integration tests, add SAST/DAST pipelines, and publish SBOMs.【F:update_docs/1.50/features_update_plan.md†L144-L176】
    2. Document runbooks for incidents, rollback, and integration troubleshooting.【F:update_docs/1.50/features_to_add.md†L324-L362】
  - **Front-end:**
    3. Build Playwright/Cypress suites covering creation studio, payments, communities, and navigation resilience.
    4. Document design tokens, accessibility audits, and localisation QA scripts.
  - **User Phone App:**
    5. Create Flutter Driver/Appium scenarios for onboarding, messaging, payments, notifications, and consent flows.
    6. Produce crash reporting, analytics verification, and parity checklist documentation.
  - **Provider Phone App:**
    7. Prepare placeholder QA scripts and documentation templates for provider release to ensure forward compatibility.
  - **Database:**
    8. Implement migration verification scripts, data integrity audits, and rollback rehearsals.【F:update_docs/1.50/pre-update_evaluations/issue_report.md†L18-L40】
  - **API:**
    9. Automate contract tests with Pact/Postman collections for all public endpoints.
  - **Logic:**
    10. Validate feature flag toggles, AI safety guardrails, and notification mesh behaviours via integration harnesses.
  - **Design:**
    11. Deliver updated documentation site, release notes, changelog entries, and training kits with visual assets.
    12. Compile end-of-update report summarising KPIs, risk outcomes, and QA evidence for leadership sign-off.【F:update_docs/1.50/new_feature_brief.md†L202-L221】


---

## Design Execution Addendum
Design workstreams below operate alongside existing platform tasks. Ownership aligns with the design systems, mobile UX, web UX, and design ops squads.

### D1. Cross-Platform Design System Consolidation (0%)
- **Objective:** Provide unified tokens, accessibility baselines, and governance for learner, provider, and web stacks.【F:update_docs/1.50/Design_update_task_list.md†L5-L28】
- **Subtasks:** Mirror the detailed checklist in `Design_update_task_list.md` (items 1.1–1.10) and report progress during M1/M2 readiness reviews.【F:update_docs/1.50/Design_update_task_list.md†L9-L41】

### D2. Mobile Application Experience Overhaul (0%)
- **Objective:** Produce annotated wireframes, logic flows, and content specs across mobile breakpoints to preserve parity and prepare for theming variants.【F:update_docs/1.50/Design_update_task_list.md†L43-L87】
- **Subtasks:** Adopt the 12-step plan captured in `Design_update_task_list.md` (items 2.1–2.12), ensuring parity with creation studio and compliance milestones.【F:update_docs/1.50/Design_update_task_list.md†L45-L87】

### D3. Web Navigation & Funnel Redesign (0%)
- **Objective:** Rebuild marketing funnels and authenticated dashboards with modular partials, Storybook-ready components, and performance guardrails.【F:update_docs/1.50/Design_update_task_list.md†L89-L132】
- **Subtasks:** Execute tasks 3.1–3.11 from the dedicated design task list, coordinating with web platform squads to phase rollouts without blocking integrations.【F:update_docs/1.50/Design_update_task_list.md†L91-L132】

### D4. Asset, Copy, and Compliance Enablement (0%)
- **Objective:** Finalise copy decks, asset manifests, dummy data, and accessibility scripts so implementation teams have production-grade references.【F:update_docs/1.50/Design_update_task_list.md†L134-L172】
- **Subtasks:** Follow tasks 4.1–4.9 from the design task list and include compliance/security leads in reviews for new theme/page variants.【F:update_docs/1.50/Design_update_task_list.md†L136-L172】

### D5. Handoff, Measurement, and Iteration Framework (0%)
- **Objective:** Conduct walkthroughs, deliver QA enablement packages, and codify measurement/feedback loops for post-launch optimisation.【F:update_docs/1.50/Design_update_task_list.md†L174-L206】
- **Subtasks:** Execute tasks 5.1–5.8 from the design task list, syncing outcomes with programme release notes and steering retrospectives.【F:update_docs/1.50/Design_update_task_list.md†L176-L206】
