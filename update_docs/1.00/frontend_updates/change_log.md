# Frontend Change Log – Version 1.00

## Operator dashboards
- Replaced the admin dashboard home fallback with a dedicated executive overview that renders live KPI, incident, release, and operations readiness data with accessibility-friendly status badges and responsive card layouts.
- Added a tenant-aware executive data pipeline (API client + React hook) that handles offline caching, background refresh, and visibility-aware polling so operators always work with deterministic metrics.
- Wired the dashboard shell to route admin roles into the rebuilt overview while keeping instructor and learner flows untouched, ensuring multi-role accounts land on the correct workspace automatically.
- Expanded Vitest coverage to validate the executive data hook’s load, refresh, and cached fallback behaviour to guard against regressions in degraded network conditions.
- Completed the instructor course management workspace by introducing catalogue, analytics, assignment pipeline, authoring, and
  learner management sections with persistent modals and Vitest coverage to protect the new UI surface.
- Replaced the placeholder compliance tile with a full admin compliance console that renders audits, attestation coverage, frameworks, risk heatmaps, incident response queues, and evidence export controls backed by new Vitest coverage.
- Delivered the revenue & finance centres with a dedicated admin page, finance-specific React hook, actionable billing dashboards, payout approvals, ledger reconciliation widgets, experimentation tables, and pricing governance workflows so operators can close the loop on monetisation.
- Delivered the support, communications, and settings hub with a production-ready admin page, support-specific data hook, actionable ticket workflows, escalation controls, knowledge base governance, broadcast scheduling, and notification policy management so frontline teams can deliver on contractual SLAs.
