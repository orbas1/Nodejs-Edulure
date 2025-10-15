# Version 1.50 – Design Update Task List

All tasks start at **0%** completion. Subtasks reference the artefacts and standards documented in `Design_Plan.md`.

## 1. Cross-Platform Design System Consolidation (0%)
- **Objective:** Deliver unified tokens, accessibility baselines, and governance for learner, provider, and web stacks.【F:update_docs/1.50/Design_Plan.md†L19-L47】
- **Subtasks (10 total):**
  1. Audit existing token libraries and map to new typography, color, spacing, elevation, and iconography taxonomy.
  2. Produce JSON exports for each token category and validate integration points with Flutter and React pipelines.【F:update_docs/1.50/Design_Plan.md†L39-L47】
  3. Document dual-mode palettes, gradient recipes, and emo campaign overlays with usage constraints.【F:update_docs/1.50/Design_Plan.md†L39-L47】
  4. Define accessibility baseline checklist covering contrast, focus states, and motion reduction triggers.【F:update_docs/1.50/Design_Plan.md†L65-L74】
  5. Create component state matrix (default, hover, active, disabled) for buttons, cards, tables, forms, modals.【F:update_docs/1.50/Design_Plan.md†L99-L105】
  6. Establish change log template and review cadence with product steering committee.【F:update_docs/1.50/Design_Plan.md†L23-L34】
  7. Align iconography and illustration styles with marketing brand guidelines and asset manifest budgets.【F:update_docs/1.50/Design_Plan.md†L107-L123】
  8. Publish updated design documentation portal and notify all squads of token freeze milestone.【F:update_docs/1.50/Design_Plan.md†L128-L136】
  9. Validate accessibility compliance through automated tooling (Stark, Lighthouse) and manual spot checks.
  10. Capture open issues and risk mitigations for steering review (e.g., conflicting brand requests, security sign-offs).【F:update_docs/1.50/Design_Plan.md†L23-L34】

## 2. Mobile Application Experience Overhaul (0%)
- **Objective:** Produce annotated wireframes, logic flows, and content specs for learner and provider apps across breakpoints.【F:update_docs/1.50/Design_Plan.md†L49-L76】
- **Subtasks (12 total):**
  1. Draft low-fidelity wireframes for learner home, cohort, assignments, community, and profile modules.
  2. Iterate provider dashboard, scheduling, messaging, and analytics views for enterprise parity.【F:update_docs/1.50/Design_Plan.md†L49-L58】
  3. Annotate CTA hierarchy, metrics widgets, and quick-action placements for each screen type.【F:update_docs/1.50/Design_Plan.md†L55-L67】
  4. Map branching logic for onboarding flows, lesson consumption, and assignments including error states.【F:update_docs/1.50/Design_Plan.md†L60-L67】
  5. Define reusable navigation partials (tab bars, drawers, overlays) with theme toggles and partial injection guidelines.【F:update_docs/1.50/Design_Plan.md†L55-L62】
  6. Document responsive behaviours for portrait, landscape, and tablet breakpoints including grid adjustments.【F:update_docs/1.50/Design_Plan.md†L49-L58】
  7. Produce content hierarchy specs covering text styles, CTAs, tooltips, and empty states with dynamic type scaling.【F:update_docs/1.50/Design_Plan.md†L67-L74】 ✅ Completed – privacy drawer, SLA countdown, and scam-education playlists now document copy tone, escalation CTAs, and badge treatments across learner and web hubs.【F:update_docs/1.50/ui-ux_updates/user_app_wireframe_changes.md†L73-L116】【F:update_docs/1.50/ui-ux_updates/web_app_wireframe_changes.md†L101-L130】
  8. Compile dummy data sets and imagery placeholders to stabilise prototype renders.【F:update_docs/1.50/Design_Plan.md†L71-L74】
  9. Run moderated usability reviews to validate KPIs (task completion SLAs) and capture improvement backlog.【F:update_docs/1.50/Design_Plan.md†L27-L34】
  10. Package Zeplin exports and measurement notes for engineering handoff.【F:update_docs/1.50/Design_Plan.md†L128-L136】
  11. Align analytics instrumentation requirements with data/insights team for critical journeys.【F:update_docs/1.50/Design_Plan.md†L140-L146】
  12. Log risk, dependency, and parity status in design change log for weekly review.【F:update_docs/1.50/Design_Plan.md†L23-L34】
  - _Progress note:_ Capability manifest incident messaging has been prototyped in Flutter, and provider RBAC overlays are now documented alongside hooks so operator shells inherit lock states, guardrail cues, and audit messaging without bespoke rewrites.【F:Edulure-Flutter/lib/widgets/capability_status_banner.dart†L1-L218】【F:Edulure-Flutter/lib/provider/runtime/provider_capability_bridge.dart†L1-L182】【F:update_docs/1.50/provider_phone_app_updates/rbac_contracts.md†L1-L51】
  - _Progress note:_ Provider retention blueprint defines dual-signoff prompts, SLA countdown states, and evidence upload guidance tied to new Flutter compliance contracts, ensuring deletion flows meet legal expectations once the provider shell ships.【F:update_docs/1.50/provider_phone_app_updates/governance_retention_contracts.md†L24-L211】【F:Edulure-Flutter/lib/provider/runtime/provider_compliance_contracts.dart†L1-L302】

## 3. Web Application Navigation & Funnel Redesign (0%)
- **Objective:** Restructure marketing funnels and authenticated dashboards with modular components and performance guardrails.【F:update_docs/1.50/Design_Plan.md†L78-L117】
- _Progress note:_ Backend readiness probes are now available for integration, enabling the operator dashboard and banner tasks below to consume live service health data without additional design-blocking API work.【F:backend-nodejs/src/servers/webServer.js†L19-L94】
- **Subtasks (11 total):**
  1. Create sitemap and navigation blueprint covering marketing pages, dashboards, and contextual menus.【F:update_docs/1.50/Design_Plan.md†L80-L94】
  2. Develop hero, testimonial, curriculum, and CTA partials for themed marketing campaigns.【F:update_docs/1.50/Design_Plan.md†L82-L94】
  3. Produce high-fidelity comps for home, catalog, cohort detail, pricing, and resource pages at 1280/1440/768 widths.【F:update_docs/1.50/Design_Plan.md†L82-L94】
  4. Define command palette interactions, breadcrumb patterns, and sidebar behaviours for dashboards.【F:update_docs/1.50/Design_Plan.md†L95-L105】
  5. Document component specifications for cards, tables, charts, forms, modals with state diagrams.【F:update_docs/1.50/Design_Plan.md†L99-L105】
  6. Align copy decks (marketing + in-app) with localisation workflows, security disclosures, and support messaging.【F:update_docs/1.50/Design_Plan.md†L107-L114】
  7. Specify imagery/vectors with compression budgets to preserve LCP < 2.5s and CLS < 0.1.【F:update_docs/1.50/Design_Plan.md†L115-L123】
  8. Prepare accessibility protocol covering keyboard navigation, focus management, screen reader announcements.【F:update_docs/1.50/Design_Plan.md†L115-L123】
  9. Run performance design review with engineering to validate partial loading strategies and asset budgets.【F:update_docs/1.50/Design_Plan.md†L107-L123】
  10. Publish Storybook backlog entries and asset manifests for front-end squads.【F:update_docs/1.50/Design_Plan.md†L99-L123】
  11. Capture conversion and usability success metrics with baseline analytics queries for post-launch comparisons.【F:update_docs/1.50/Design_Plan.md†L140-L153】
  - _Progress note:_ Service availability banner specifications implemented in the shell, ensuring navigation badges mirror readiness telemetry for operator awareness.【F:frontend-reactjs/src/layouts/MainLayout.jsx†L24-L260】【F:update_docs/1.50/ui-ux_updates/web_application_styling_changes.md†L65-L78】
  - _Progress note:_ Service-specific OpenAPI catalogues are now published, enabling UI copy, badge states, and escalation flows to reference the exact contract serving each dashboard module.【F:backend-nodejs/src/docs/builders/openapiBuilder.js†L1-L169】【F:backend-nodejs/src/app.js†L125-L190】
  - _Progress note:_ Distributed runtime cache behaviour is documented with Redis snapshot states so banner, manifest, and parity tasks include degraded/offline treatments without waiting for additional engineering changes.【F:backend-nodejs/src/services/DistributedRuntimeCache.js†L1-L129】【F:update_docs/1.50/Design_Plan.md†L33-L47】
  - _Progress note:_ Operator command centre wireframes now detail severity-coded KPI cards, service matrices, incident queues, scam alerts, and runbook callouts, aligning design, backend aggregation, and admin navigation updates.【F:update_docs/1.50/ui-ux_updates/web_app_wireframe_changes.md†L125-L151】【F:frontend-reactjs/src/pages/dashboard/AdminOperator.jsx†L19-L371】【F:backend-nodejs/src/services/OperatorDashboardService.js†L92-L305】
  - _Progress note:_ Governance control centre flows document DSR queue triage, policy timelines, and consent posture badges mapped to the compliance API, ensuring admin navigation and copy decks reuse the new privacy contracts.【F:frontend-reactjs/src/pages/dashboard/AdminGovernance.jsx†L1-L196】【F:update_docs/1.50/ui-ux_updates/web_app_wireframe_changes.md†L152-L188】
  - _Progress note:_ Creation studio launchpads, wizard flows, and publish checkpoints now mirror the backend project, template, and campaign contracts—including course, e-book, community, and ad asset variants—so instructors follow the same state machine reflected in the new APIs and telemetry feeds.【F:update_docs/1.50/ui-ux_updates/web_app_wireframe_changes.md†L135-L204】【F:update_docs/1.50/ui-ux_updates/web_application_logic_flow_changes.md†L134-L204】
  - _Progress note:_ High-fidelity specs capture readiness stepper badges, collaborator presence chips, and template onboarding modals to guide engineering on microcopy and iconography for the React creation studio workspace.【F:update_docs/1.50/ui-ux_updates/web_application_styling_changes.md†L124-L176】【F:update_docs/1.50/ui-ux_updates/web_app_wireframe_changes.md†L135-L170】
  - _Progress note:_ Trust & safety dashboards will incorporate the moderation pipeline data model—case queues, action history, scam reports, and analytics summaries—thanks to the newly provisioned `/api/v1/moderation` service, reducing design discovery before UI implementation.【F:backend-nodejs/src/services/CommunityModerationService.js†L1-L676】【F:update_docs/1.50/ui-ux_updates/web_app_wireframe_changes.md†L152-L188】

## 4. Asset, Copy, and Compliance Enablement (0%)
- **Objective:** Deliver documentation, assets, and compliance artefacts that unblock development, QA, and marketing teams.【F:update_docs/1.50/Design_Plan.md†L107-L136】
- **Subtasks (9 total):**
  1. Finalise marketing copy deck with CTA variants, tooltip language, and error messaging guidelines.【F:update_docs/1.50/Design_Plan.md†L107-L114】
  2. Produce asset manifest enumerating illustrations, icons, video stills, and vector requirements by page/screen.【F:update_docs/1.50/Design_Plan.md†L45-L47】【F:update_docs/1.50/Design_Plan.md†L115-L123】
  3. Define dummy data sets for QA and integration tests across mobile and web modules.【F:update_docs/1.50/Design_Plan.md†L71-L74】
  4. Build accessibility testing scripts covering high-contrast modes, keyboard flows, screen readers, and reduced motion settings.【F:update_docs/1.50/Design_Plan.md†L65-L74】【F:update_docs/1.50/Design_Plan.md†L115-L123】
  5. Produce compliance checklist capturing security considerations, data handling notes, and documentation needs for new pages.【F:update_docs/1.50/Design_Plan.md†L134-L138】 ✅ Completed – privacy & trust center specs enumerate consent receipt storage, fraud escalation paths, evidence download requirements, and retention windows for QA/legal review.【F:update_docs/1.50/ui-ux_updates/web_application_logic_flow_changes.md†L109-L140】【F:update_docs/1.50/Design_Change_log.md†L30-L36】
  6. Align with marketing/brand for emo theme variants and campaign-specific assets, ensuring governance sign-off.【F:update_docs/1.50/Design_Plan.md†L39-L47】【F:update_docs/1.50/Design_Plan.md†L107-L123】
  7. Prepare QA regression notes linking design artefacts to automated/manual test coverage expectations.【F:update_docs/1.50/Design_Plan.md†L128-L136】
  8. Publish documentation updates in central repository and notify stakeholders of version changes.【F:update_docs/1.50/Design_Plan.md†L128-L136】
  9. Capture outstanding compliance or localisation gaps and present to steering committee for mitigation.【F:update_docs/1.50/Design_Plan.md†L23-L34】
  - _Progress note:_ Compliance dashboard briefs now tap encrypted audit, consent, and incident ledgers so UI states can surface SLA countdowns, encryption badges, and escalation ownership without exposing sensitive payloads in design artefacts.【F:backend-nodejs/migrations/20250204100000_compliance_audit_consent_incidents.js†L1-L180】
  - _Progress note:_ Learner profile consent ledger mock-ups now reference the compliance service and revoke workflow, pairing copy decks and iconography with the live API to keep privacy messaging consistent across surfaces.【F:frontend-reactjs/src/pages/Profile.jsx†L830-L870】【F:update_docs/1.50/Design_Plan.md†L65-L117】

## 5. Handoff, Measurement, and Iteration Framework (0%)
- **Objective:** Enable smooth transition to development and ensure post-launch measurement and feedback loops are in place.【F:update_docs/1.50/Design_Plan.md†L128-L153】
- **Subtasks (8 total):**
  1. Conduct cross-platform walkthrough sessions to review design system updates, theming toggles, and partial injection logic.【F:update_docs/1.50/Design_Plan.md†L134-L138】
  2. Deliver Zeplin/Storybook packages, QA scripts, and measurement notes to engineering, QA, product, and marketing stakeholders.【F:update_docs/1.50/Design_Plan.md†L128-L136】
  3. Define analytics dashboards and event taxonomies for navigation usage, conversion funnels, and productivity metrics.【F:update_docs/1.50/Design_Plan.md†L140-L153】
  4. Schedule moderated usability and accessibility checkpoints post-launch to validate design KPIs.【F:update_docs/1.50/Design_Plan.md†L27-L34】【F:update_docs/1.50/Design_Plan.md†L140-L153】
  5. Establish feedback intake channels (surveys, interviews, support tickets) and backlog triage cadence.【F:update_docs/1.50/Design_Plan.md†L146-L153】
  6. Track open risks, bugs, and parity gaps in design change log with weekly status updates.【F:update_docs/1.50/Design_Plan.md†L23-L34】
  7. Coordinate with security and compliance leads to review new page designs for data handling and consent implications.【F:update_docs/1.50/Design_Plan.md†L107-L114】【F:update_docs/1.50/Design_Plan.md†L134-L138】
  8. Prepare v1.51 enhancement backlog prioritised by impact, feasibility, and stakeholder feedback.【F:update_docs/1.50/Design_Plan.md†L152-L153】
