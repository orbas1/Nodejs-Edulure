# Version 1.50 Milestone Breakdown

## Milestone 1 – Platform Foundations Locked (Tasks 1) – Target: Week 4 – Completion 100%
- **Scope:** Complete Task 1 subtasks 1.1–1.5 to remediate security, API, dependency, and database gaps.
- **Entry Criteria:** Steering committee approval of scope; infrastructure environments provisioned.
- **Exit Criteria (Completed):**
  - Security baseline validated via automated tests and manual review.
  - OpenAPI specs published and consumed by shared client SDK.
  - Workspace tooling operational with automated dependency audits.
  - Migration framework executes on staging with rollback rehearsal report.
  - Service orchestration layer powering feeds/notifications skeletons.
- **Cross-Team Responsibilities:** Backend, DevOps, Database, Security, Frontend, Mobile leads.
- **Risks & Mitigations:** Resource contention (reserve dedicated backend squad); schema churn (enforce change control board).

## Milestone 2 – Cloud-Native Content Delivery (Task 2) – Target: Week 8 – Completion 100%
- **Scope:** Deliver Task 2 subtasks covering R2 setup, PowerPoint/ebook pipelines, cross-platform viewers, analytics/compliance.
- **Dependencies:** Milestone 1 API contracts, security foundations, and migration tooling.
- **Exit Criteria (Completed):**
  - R2 buckets live with monitoring dashboards and signed URL flow tested in staging and local environments.
  - PowerPoint conversion pipeline operational with CloudConvert integration, retries, and failure handling recorded in audit logs.
  - Ebook reader experience launched on web and mobile with accessibility controls (theme, font scaling) validated.
  - Offline caching/download management delivered for Flutter along with React caching for instructor review.
  - Analytics dashboards for content engagement available via `/api/content/.../analytics` and surfaced in the React console.
- **Testing Focus:** Load tests (storage), conversion accuracy, DRM penetration, accessibility audits, plus lint/build automation across backend and React clients.

## Milestone 3 – Social Graph & Profile System (Task 3) – Target: Week 10 – Completion 0%
- **Scope:** Implement follow graph, activity feeds, component-based profiles, and analytics per Task 3 subtasks.
- **Dependencies:** Milestones 1–2 for orchestration services, asset storage for profile media.
- **Exit Criteria:**
  - Follows/privacy schema live with migrations and compliance review.
  - Feed and notification services processing live events with monitoring.
  - Component library integrated into web/mobile/provider clients with visual regression baseline.
  - Social UX validated via usability tests; accessibility checklist passed.
  - Recommendation analytics dashboards tracking adoption metrics.
- **Risk Controls:** Abuse scenarios handled via rate limiting and moderation workflows; caching strategy reviewed for scalability.

## Milestone 4 – Communities 2.0 & Monetisation Launch (Task 4) – Target: Week 13 – Completion 0%
- **Scope:** Fulfil Task 4 subtasks for community schema, engagement modules, chat/notifications, monetisation, and cross-platform UX.
- **Dependencies:** Milestones 1–3 for orchestration, social data, and design system assets.
- **Exit Criteria:**
  - Community schema deployed with RBAC verified by QA.
  - Engagement modules (feeds, polls, resource library) functional across web/mobile/provider.
  - Chat upgrade passing load/resilience tests with alerting configured.
  - Affiliate/paywall flows integrated with payment gateway and financial reconciliation tests complete.
  - Accessibility and localisation audits signed off.
- **Risk Controls:** Financial compliance review scheduled; fallback plans documented for monetisation launch.

## Milestone 5 – Explorer & Release Readiness (Tasks 5–6) – Target: Week 16 – Completion 0%
- **Scope:** Execute Task 5 subtasks for search/explorer plus Task 6 for quality assurance, documentation, release, and monitoring.
- **Dependencies:** Prior milestones for data sources, social/community signals, and documentation inputs.
- **Exit Criteria:**
  - Meilisearch cluster production-ready with DR plans tested.
  - Ingestion pipelines indexing all entities with zero-result monitoring.
  - Explorer UX live on web/mobile/provider with performance SLAs met.
  - Comprehensive testing suites passed; beta feedback resolved to acceptable burndown.
  - Version 1.10 testing plan baselined, signed off, and referenced in release documentation.
  - Release assets (change log, update report, training) delivered; post-launch monitoring dashboards active.
- **Risk Controls:** Search relevance tuning backlog maintained; launch war room staffed; rollback scripts rehearsed.

## Milestone 6 – Mobile Application Completion & Store Launch (Task 7) – Target: Week 18 – Completion 0%
- **Scope:** Finalise Flutter user app and provider app readiness by completing Task 7 subtasks for feature parity, performance, store compliance, and support operations.
- **Dependencies:** Milestones 1–5 for stable APIs, social/community data, explorer endpoints, and release assets.
- **Exit Criteria:**
  - Mobile feature parity matrix signed off for learner and provider experiences.
  - Performance, accessibility, and offline test suites passing on target device matrix.
  - App Store / Play Store submissions prepared with compliance documentation and release notes.
  - Mobile crash/error monitoring configured with alerting and runbooks delivered to support.
  - Post-launch support playbooks, training, and escalation paths published.
- **Risk Controls:** Coordinate release windows with backend rollout; maintain rollback toggles and phased rollout plan across stores.

## Milestone 7 – Design Readiness & Handoff (Task 8) – Target: Week 8 – Completion 20%
- **Scope:** Execute the dedicated design programme covering research alignment, system freeze, feature detailing, and engineering handoff deliverables.
- **Dependencies:** Inputs from product discovery, branding, and compliance teams; coordination with engineering to validate feasibility and analytics requirements.
- **Exit Criteria:**
  - Discovery readout approved with prioritised backlog and telemetry requirements.
  - Cross-platform design system frozen with shared tokens, responsive components, and accessibility baselines documented.
  - High-fidelity specs for mobile and web (home, explorer, Communities 2.0, media, profiles, settings) reviewed with engineering and content stakeholders.
  - Accessibility, localisation, and legal checklists executed with remediation backlog logged.
  - Handoff package (redlines, interaction videos, analytics matrix, QA checklist) distributed to implementing squads.
- **Risk Controls:** Reserve design QA capacity, enforce token governance to prevent drift, and maintain a change-control log for scope adjustments emerging from discovery findings.

## Milestone 8 – Version 1.00 Design Refresh (Task 9) – Target: Week 8 – Completion 35%
- **Scope:** Deliver the Version 1.00 design updates described in `Design_update_milestone_list.md`, covering tokens, navigation, high-fidelity templates, and compliance-ready handoff packages.
- **Dependencies:** Completion of Milestones 1–2 for platform readiness plus alignment with Task 8 research outputs.
- **Exit Criteria:**
  - Token architecture finalised with emo/seasonal theme guidance and accessibility validation reports.
  - Navigation IA, responsive grids, and journey flows signed off across personas.
  - High-fidelity templates and component specs delivered with asset manifests and copy decks approved.
  - Accessibility, localisation, and compliance audits executed with results logged in `Design_Change_log.md`.
- **Risk Controls:** Coordinate with marketing for imagery pipeline, ensure engineering resourcing for QA sessions, and monitor compliance feedback cycles closely.

### Design Milestone Phases
1. **Discovery & Alignment Complete (Week 2 – 45%)** – user research synthesis and navigation approval delivered.
2. **Cross-Platform Design System Frozen (Week 4 – 35%)** – shared tokens and core component kits locked with accessibility baselines and security/error states.
3. **Feature Surface Detailing (Week 6 – 20%)** – high-fidelity workflows approved for core learner/provider journeys.
4. **Design QA & Engineering Handoff (Week 8 – 10%)** – QA reports, localisation packs, and implementation playbooks finalised.
