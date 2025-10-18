# Admin Dashboard Updates – Version 1.00

## Executive overview rebuild
- Delivered a tenant-aware executive overview that surfaces platform KPIs, incident posture, release readiness, and fraud/security alerts in a consolidated responsive grid. The page now consumes live capability manifests and incident feeds, replacing the static learner overview fallback administrators previously saw.
- Introduced a persistent offline cache backed by IndexedDB so operations teams retain the last known metrics when travelling or during network interruptions. The UI raises connectivity banners, timestamps cached payloads, and automatically refreshes when connectivity returns.
- Added granular sections for service health, incident queues, release trains, operations readiness, and audit timelines, each drawing from dedicated API endpoints and enriched with accessibility-friendly status badges and semantic tables.
- Implemented cross-tenant switching directly in the dashboard header. The selector hydrates from `/operator/executive/tenants`, scopes subsequent data fetches, and protects against stale selections when tenants are revoked.

## Data orchestration & testing
- Created a reusable `operatorDashboardApi` client that normalises KPIs, incidents, releases, alerts, and dependency payloads from the operator services. Requests are cached with explicit TTLs and tag invalidation so the executive dashboard can refresh without overloading the API.
- Built a `useExecutiveDashboard` hook that coordinates tenant discovery, overview fetching, offline fallbacks, auto-refresh intervals, and visibility-aware polling. The hook exposes stale/offline states to drive the new UI banners and manual refresh CTA.
- Added Vitest coverage for the executive hook to verify happy-path loading and cached fallback behaviour when API calls fail. The suite mocks the persistent cache, ensuring the offline and retry logic remains deterministic as we evolve the dashboard.
