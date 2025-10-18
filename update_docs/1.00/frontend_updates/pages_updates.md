# Frontend Page Updates – Version 1.00

## Dashboard
- Added `AdminExecutiveOverview` under `src/pages/dashboard/admin/` to host the new executive command centre experience. The page assembles KPI cards, incident queues, release tables, readiness widgets, and activity timelines driven by the executive data hook.
- Updated `DashboardHome` to route admin roles into the new executive overview while maintaining existing instructor, learner, and community behaviour.
- Relaxed the dashboard layout guard so admins can load the executive overview even when legacy admin payloads are not returned by `/dashboard/me`, preventing unnecessary empty-state messaging during rollout.
