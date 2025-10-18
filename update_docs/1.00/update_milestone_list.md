# Update Milestone List – Version 1.00

## Milestone 1 (0%): Core service restoration and governance foundation
- **Goals**: Deliver working backend workflows, enforce feature flag governance, rebuild migrations/seeds, harden third-party integrations, and establish baseline observability and compliance controls.
- **Included tasks/subtasks**:
  - Task 1: Subtasks 1–5 (service hardening, feature flags, integration wrappers, data governance rebuild, security/compliance hardening).
  - Task 4: Subtask 1 (contract testing/observability) kicked off to support backend verification.
  - Task 4: Subtask 2 (environment parity/IaC) scoped for backend/data prerequisites.
- **Entry criteria**: Development environments reproducible, dependency scans in place, synthetic datasets ready, stakeholder sign-off on remediation scope.
- **Exit criteria**: All backend workflows executable end-to-end with monitored queues, migrations/seeds pass clean install tests, feature flag defaults seeded automatically, sensitive data encrypted, third-party integrations validated in sandbox, observability dashboards live.
- **Key tests**: Backend integration tests, contract tests, load smoke for queues, database migration dry runs, security scans, policy-as-code checks.

## Milestone 2 (0%): Operator experience, web hardening, and support tooling
- **Goals**: Replace mock web flows with production integrations, deliver accessibility/localisation/security improvements, and surface support tooling.
- **Included tasks/subtasks**:
  - Task 2: Subtasks 1–5 (executive & health dashboards, learning/curriculum workspaces, compliance/governance consoles, finance/monetisation centres, support/communications/settings hub).
  - Task 1: Subtask 3 dependencies completed to provide stable APIs.
  - Task 4: Subtask 4 kickoff to integrate automated web QA suites.
- **Entry criteria**: Milestone 1 exit criteria met, contract tests stable, design tokens/localisation assets ready, support tooling requirements validated.
- **Exit criteria**: Executive Overview, Learning Operations, Provider Relations, Compliance & Risk, Revenue & Finance, and Support/Communications dashboards plus their associated pages/screens execute payments, onboarding, analytics, governance, compliance, and support flows end-to-end; accessibility audits pass WCAG AA; localisation coverage validated; secure storage/CSP in place; Sentry/RUM streaming; support teams trained on new tooling.
- **Key tests**: Web end-to-end journeys, accessibility (axe/Lighthouse/manual), localisation checks, penetration tests for web surfaces, support workflow simulations, RBAC verification.

## Milestone 3 (0%): Provider transition and mobile hardening
- **Goals**: Provide a coherent provider story, fully integrate the learner mobile app, and establish mobile CI/CD, security, and telemetry.
- **Included tasks/subtasks**:
  - Task 3: Subtasks 1–5 (provider communications, learner integration, mobile UX/accessibility, security/telemetry, mobile CI/CD).
  - Task 4: Subtask 3 (dependency/supply-chain governance) extended to mobile toolchains.
  - Task 5: Subtask 1 telemetry pipelines to capture mobile signals.
- **Entry criteria**: Stable APIs/feature flags from Milestones 1–2, provider roadmap approved by stakeholders, mobile design backlog groomed, telemetry infrastructure ready.
- **Exit criteria**: Provider migration guide published, responsive fallback workflows operational, learner app passes integration/widget tests, crash/analytics telemetry live, mobile security posture validated, staged rollout pipelines functional with rollback procedures.
- **Key tests**: Mobile integration/widget/golden tests, push notification end-to-end runs, offline/online sync drills, security audits (SSL pinning/jailbreak), usability studies, beta pilot metrics.

## Milestone 4 (0%): Analytics, monetisation, compliance, and release excellence
- **Goals**: Stand up analytics/warehouse capabilities, complete monetisation and finance flows, refresh documentation/enablement, and institutionalise compliance/risk/release management.
- **Included tasks/subtasks**:
  - Task 4: Subtasks 4–5 (release management/QA automation, security/compliance/risk operations).
  - Task 5: Subtasks 1–5 (telemetry/warehouse, BI delivery, monetisation/finance, documentation enablement, governance communications).
  - Residual work from Tasks 1–3 required for changelog/end-of-update deliverables and Version 1.50 planning.
- **Entry criteria**: Prior milestones complete with stable telemetry feeds, finance/legal stakeholders engaged, documentation templates prepared, risk register draft ready.
- **Exit criteria**: Warehouse pipelines operational with validated dashboards, GAAP-aligned financial reconciliations, release checklist enforced with automated gates, compliance evidence packages assembled, documentation/enablement assets published, governance communications delivered, changelog and end-of-update report finalised.
- **Key tests**: Data pipeline freshness and quality checks, financial reconciliation audits, release dry-runs, disaster recovery/tabletop exercises, documentation QA, stakeholder sign-off reviews.

