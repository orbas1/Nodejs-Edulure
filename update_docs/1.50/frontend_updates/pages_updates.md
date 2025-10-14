# Pages Updated – Version 1.50

## Global Shell & Marketing Pages
- `MainLayout` now displays a persistent service status badge in the desktop navigation and mobile menu, mirroring capability manifest output so marketing, feed, and static pages communicate active incidents without custom wiring.【F:frontend-reactjs/src/layouts/MainLayout.jsx†L24-L260】
- Injected the shared `ServiceHealthBanner` below the header to surface outages or degraded capabilities with refresh controls and impacted feature lists across all publicly-routed pages.【F:frontend-reactjs/src/components/status/ServiceHealthBanner.jsx†L1-L96】【F:frontend-reactjs/src/layouts/MainLayout.jsx†L214-L219】

## Authenticated Dashboard
- Dashboard header copy now references live health telemetry rather than a static “all systems green” placeholder, and the dashboard shell renders the banner component so operators can triage outages from within cohort, analytics, or governance modules.【F:frontend-reactjs/src/layouts/DashboardLayout.jsx†L1-L380】
- Mobile drawer inherits the same status badge and descriptive messaging, ensuring incident visibility when administrators switch roles or navigate via small screens.【F:frontend-reactjs/src/layouts/MainLayout.jsx†L180-L205】
