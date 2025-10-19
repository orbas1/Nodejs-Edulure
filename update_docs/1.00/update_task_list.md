# Update Task List – Version 1.00

All tasks start at 0% completion and will be updated as implementation progresses.

## Task 1 (20%): Stabilise core services, data governance, and integrations

#### Integration coverage
- **Backend**: Replace mocked controllers/resolvers, reconnect schedulers/queues, enforce feature flag defaults.
- **Front-end**: Provide contract fixtures and flag manifests consumed by the web clients.
- **User phone app**: Expose stable APIs and manifests for the learner app bootstrap.
- **Provider phone app**: Supply migration web hooks and interim APIs for provider workflows.
- **Database**: Rebuild migrations/seeds, add encryption, retention, and partition automation.
- **API**: Publish versioned REST/GraphQL schemas, contract tests, and SDK regeneration pipelines.
- **Logic**: Implement business rules for payouts, moderation, analytics, compliance, and curriculum sync.
- **Design**: Document service behaviours and admin tooling requirements for downstream UX teams.

#### Subtasks
1. **Service hardening and automation** – 100%
   Implement business logic across controllers/resolvers, wire BullMQ/cron workflows, and enable DLQs plus monitoring.
2. **Feature flag governance** – 100%
   Seed defaults in bootstrap scripts, deliver tenant-aware tooling, and document rollout/rollback procedures.
3. **Third-party integration wrappers** – 100%
   Build provider abstractions with sandbox credentials, retries, circuit breakers, and idempotent webhooks.
4. **Data governance rebuild** – 100%
   Reconstructed migrations and seeds, added schema drift guardrails, automated retention instrumentation, and production reporting views with tests.
5. **Security and compliance hardening** – 100%
   Delivered tenant-aware audit logging with encrypted IP capture, request-scoped evidence trails, and controller-level context propagation to evidence compliance readiness while preserving least-privilege access patterns.

## Task 2 (20%): Modernise operator web experience and support tooling

#### Integration coverage
- **Backend**: Deliver consistent APIs, realtime channels, and error contracts consumed by each dashboard (Executive Overview, Learning Operations, Provider Relations, Compliance & Risk, Revenue & Finance, Support & Communications).
- **Front-end**: Replace mocks with SDK clients, implement validation, state management, and accessibility across every operator dashboard, standalone page, and responsive breakpoint.
- **User phone app**: Ensure operator-triggered events propagate to learner devices via notifications/flags.
- **Provider phone app**: Align operator tooling with provider comms, impersonation, and support actions.
- **Database**: Persist workflow states, audit trails, and localisation bundles.
- **API**: Harmonise REST/GraphQL usage, centralise clients, and expose event schemas for realtime updates.
- **Logic**: Define governance workflows, support escalation rules, and multi-step journey logic for each dashboard/page flow.
- **Design**: Deliver responsive layouts, theming tokens, accessibility specs, and localisation coverage per dashboard, page, and screen.

#### Subtasks
1. **Executive & health dashboards rebuild** – 100%
   Wired live KPIs, platform health widgets, incident timelines, release readiness dashboards, and cross-tenant tenant switchers into the Executive Overview and Operations Health surfaces with responsive layouts, offline fallbacks, and automated refresh intervals.
2. **Learning & curriculum workspaces** – 100%
   Deliver course catalogue, cohort analytics, assignment pipelines, content authoring modals, and learner management pages with localisation, draft persistence, and collaborative editing.
3. **Compliance & governance consoles** – 100%
   Delivered audit, accreditation, attestation analytics, risk heatmaps, incident response orchestration, and evidence export screens backed by secure storage and granular permissions.
4. **Finance & monetisation centres** – 100%
   Build billing centre, payout approvals, revenue dashboards, experimentation lab, pricing configuration, and financial reconciliation screens with real-time data, error handling, and ledger integrations.
5. **Support, communications, and settings hub** – 100%
   Launch support ticketing, announcements, in-app chat, notification centre, onboarding wizard, tenant settings, and knowledge base experiences with guided tours, contextual help, and RBAC-controlled admin modals.

## Task 3 (100%): Reintroduce provider value and harden learner mobile app

#### Integration coverage
- **Backend**: Provide mobile-ready APIs, feature flag manifests, and push/notification services.
- **Front-end**: Coordinate dashboards with provider/learner status indicators and escalation controls.
- **User phone app**: Implement live services, offline caching, push notifications, chat, QR attendance, and analytics.
- **Provider phone app**: Publish migration guides, responsive web alternatives, or new mobile roadmap deliverables.
- **Database**: Support sync queues, offline persistence metadata, and consent tracking.
- **API**: Harmonise mobile SDKs, authentication flows, and realtime/event schemas.
- **Logic**: Ensure scheduling, payouts, compliance capture, and personalised learning logic execute end-to-end.
- **Design**: Provide mobile UX guidelines, localisation, theming, and accessibility artefacts.

#### Subtasks
1. **Provider transition and communications** – 100%
   Publish EOL statements, migration workflows, partner comms, and updated OKRs/SLAs for provider experiences.
2. **Learner app service integration** – 100%
   Connect feature flags, background isolates, downloads, chat, calendar sync, and adaptive recommendations to live APIs.
3. **Mobile UX and accessibility improvements** – 100%
   Add deep-links, adaptive layouts, localisation, accessibility audits, and deterministic fixtures.
4. **Security and telemetry hardening** – 100%
   Enforce token refresh/device binding, secure storage fallbacks, SSL pinning, jailbreak detection, Crashlytics/Sentry.
5. **Mobile CI/CD and QA automation** – 100%
   Implement fastlane pipelines, automated screenshots, staged rollouts, widget/golden/integration tests, and rollback plans.

## Task 4 (0%): Industrialise infrastructure, release management, and compliance operations

#### Integration coverage
- **Backend**: Enforce contract tests, observability, and deployment policies across services.
- **Front-end**: Integrate CI pipelines, smoke tests, and environment parity checks for web builds.
- **User phone app**: Align mobile build pipelines, release gates, and monitoring with infrastructure standards.
- **Provider phone app**: Coordinate deployment strategies for responsive/web alternatives and future native clients.
- **Database**: Automate migrations, backups, retention, and drift detection via IaC and policy-as-code.
- **API**: Version and validate schemas, publish SDKs, and run compatibility gates in CI.
- **Logic**: Establish release readiness criteria, incident response runbooks, and SLO-driven alerts.
- **Design**: Support design QA in release checklists, accessibility audits, and UI regression baselines.

#### Subtasks
1. **Contract testing and observability fabric** – 100%
   Delivered automated OpenAPI contract validation for observability endpoints, rolled out SLO aggregation/alerting middleware, published `/observability/slos` APIs with governance metadata, and wired Prometheus + SLO telemetry into the runtime logger.
2. **Environment parity and IaC consolidation** – 100%
   Standardised Terraform modules across dev/staging/prod, added Docker/Docker Compose parity images, wired GitHub policy checks, and exposed `/environment/health` parity reporting with dependency probes.
3. **Dependency and supply-chain governance** – 100%
   Enabled Dependabot coverage across workspaces, wired dependency-governance and provenance workflows, delivered npm audit/licence tooling, refreshed backend/frontend runtime dependencies, and replaced the Explorer map implementation with D3/topojson.
4. **Release management and QA automation** – 100%
   Established automated release readiness orchestration with backend load/security probes, frontend accessibility gates, lint checks for the new artefacts, supply-chain audits, and a governance checklist to produce go/no-go evidence on every run.
5. **Security, compliance, and risk operations** – 100%
   Centralised the risk register, audit evidence lifecycle, continuity drills, and assessment scheduling with automated logging, analytics, and evidence capture to support compliance reviews.

## Task 5 (60%): Deliver analytics, monetisation, documentation, and stakeholder enablement

#### Integration coverage
- **Backend**: Emit structured telemetry, monetisation events, and contract metadata for downstream analytics.
- **Front-end**: Instrument dashboards, localisation, and support tooling updates tied to analytics and enablement assets.
- **User phone app**: Align telemetry schemas, consent syncing, and personalised insights with warehouse pipelines.
- **Provider phone app**: Capture provider engagement metrics through new workflows and analytics instrumentation.
- **Database**: Host warehouse, data marts, consent records, and monetisation aggregates with lineage tracking.
- **API**: Expose analytics endpoints, capability matrices, and documentation for stakeholders.
- **Logic**: Build pricing engines, contract governance workflows, and operational analytics rules.
- **Design**: Produce enablement materials, updated collateral, and documentation templates consistent with new capabilities.

#### Subtasks
1. **Telemetry and warehouse implementation** – 100%
   Deploy ingestion pipelines, consent-aware schemas, dbt models, freshness monitoring, and lineage tracking.
2. **BI and insight delivery** – 100%
   Rebuild dashboards, scorecards, experimentation tooling, and governance reviews for analytics accuracy.
3. **Monetisation and finance reconciliation** – 100%
   Completed payout integrations, catalog governance, refund-aware revenue recognition, ledger variance metrics, and automated GAAP reconciliation pipelines.
4. **Documentation and enablement refresh** – 0%  
   Rewrite onboarding guides, API docs, support playbooks, training curricula, marketing collateral, and capability matrices.
5. **Governance and stakeholder communications** – 0%  
   Stand up contract lifecycle management, vendor risk assessments, cross-functional reviews, and proactive roadmap comms.
