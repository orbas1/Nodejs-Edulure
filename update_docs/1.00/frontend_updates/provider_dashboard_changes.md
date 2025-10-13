# Provider Dashboard Updates – Version 1.00

## Monetisation Control Centre
- Added a dedicated monetisation navigation entry in `DashboardLayout.jsx`, surfacing the Cloudflare-backed instructor revenue controls documented in `dashboard_drawings.md`, `menu_drawings.md`, and `Application_Design_Update_Plan/Application Design Update.md`.
- Implemented `InstructorPricing.jsx`, a production-ready workspace that consumes the `dashboard.pricing` aggregate to render course offer funnels, subscription tier health, live session pricing telemetry, revenue mix progress bars, and actionable CTA rails (export finance report, configure pricing rules, promote sessions).
- Normalised cohort conversion, subscriber counts, and seat utilisation metrics inside the page with linted parsing helpers so the UI tolerates numeric/percentage strings emitted by `buildInstructorDashboard` while keeping eslint/react-hooks rulesets green.
- Wired insights cards, progress bars, and responsive tables to match the monetisation overlays in `dashboard_drawings.md` and ensured the instructor dashboard search index resolves to `/dashboard/instructor/pricing` for fast navigation across revenue tooling.
