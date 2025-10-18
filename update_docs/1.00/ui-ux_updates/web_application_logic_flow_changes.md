# Web Application Logic Flow Updates – Version 1.00

- Introduced a tenant-aware data orchestration layer for the executive dashboard. The flow now resolves available tenants, guards against revoked scopes, hydrates the selected tenant into the UI, and feeds the identifier into every API request.
- Added offline detection, cached fallback recovery, and auto-refresh intervals to the executive command centre so operators receive deterministic telemetry during degraded network events without manual reloads.
- Updated the dashboard entry routing to direct admin roles to the executive overview even when `/dashboard/me` omits the legacy admin payload, ensuring role-based navigation never lands on irrelevant learner or instructor summaries.
