# Frontend Page Updates – Version 1.00

## Dashboard
- Added `AdminExecutiveOverview` under `src/pages/dashboard/admin/` to host the new executive command centre experience. The page assembles KPI cards, incident queues, release tables, readiness widgets, and activity timelines driven by the executive data hook.
- Updated `DashboardHome` to route admin roles into the new executive overview while maintaining existing instructor, learner, and community behaviour.
- Relaxed the dashboard layout guard so admins can load the executive overview even when legacy admin payloads are not returned by `/dashboard/me`, preventing unnecessary empty-state messaging during rollout.
- Expanded `InstructorCourseManage` to render the production-ready learning workspace, wiring in catalogue analytics, assignment
  queues, authoring drafts with modal inspection, and learner risk tables sourced from the `coursesWorkspace` API payload.
- Rebuilt `AdminComplianceSection` within `src/pages/admin/sections/` to surface audit summaries, attestation analytics, framework trackers, risk heatmaps, incident response flows, and evidence exports with accessible tab navigation and defensive state management.
- Added `AdminFinanceMonetisation` under `src/pages/dashboard/admin/` to deliver the revenue & finance centre with tenant selectors, offline-aware refresh controls, billing ageing analytics, open invoice actions, payout approvals, ledger reconciliation, experimentation controls, and pricing catalogue governance.
- Added `AdminSupportHub` under `src/pages/dashboard/admin/` to ship the support, communications, and settings hub with tenant-aware ticket triage, escalation workflows, automation health analytics, broadcast scheduling, knowledge base governance, and notification policy controls.

## Explorer
- Replaced the legacy `react-simple-maps` explorer with a D3-driven map that hydrates TopoJSON world data, applies mercator projections, and supports zoom/pan plus drill-in tooltips so discovery teams can analyse geographic performance without regressions. 【F:frontend-reactjs/src/pages/Explorer.jsx†L1-L220】
