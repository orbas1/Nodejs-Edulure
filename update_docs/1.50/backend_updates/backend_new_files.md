# New Backend Files – Version 1.50

- `src/bootstrap/bootstrap.js` – shared bootstrap utilities for database and infrastructure services.【F:backend-nodejs/src/bootstrap/bootstrap.js†L1-L109】
- `src/observability/readiness.js` – readiness state tracker used by all modular services.【F:backend-nodejs/src/observability/readiness.js†L1-L72】
- `src/observability/probes.js` – express app factory for `/live` and `/ready` probe endpoints.【F:backend-nodejs/src/observability/probes.js†L1-L39】
- `src/servers/webServer.js`, `src/servers/workerService.js`, `src/servers/realtimeServer.js` – dedicated entrypoints orchestrating each service lifecycle.【F:backend-nodejs/src/servers/webServer.js†L1-L114】【F:backend-nodejs/src/servers/workerService.js†L1-L153】【F:backend-nodejs/src/servers/realtimeServer.js†L1-L141】
- `src/bin/web.js`, `src/bin/worker.js`, `src/bin/realtime.js` – CLI starters for the new services.【F:backend-nodejs/src/bin/web.js†L1-L10】【F:backend-nodejs/src/bin/worker.js†L1-L10】【F:backend-nodejs/src/bin/realtime.js†L1-L10】
- `test/readinessTracker.test.js` – Vitest coverage for the readiness tracker utility.【F:backend-nodejs/test/readinessTracker.test.js†L1-L33】
- `src/middleware/featureFlagGate.js` – request middleware enforcing feature-flag decisions and structured fallback responses for gated routes.【F:backend-nodejs/src/middleware/featureFlagGate.js†L1-L123】
- `src/middleware/routeErrorBoundary.js` – error boundary middleware that captures route failures and returns correlation-aware JSON payloads.【F:backend-nodejs/src/middleware/routeErrorBoundary.js†L1-L56】
- `src/routes/routeRegistry.js` – declarative registry describing API capabilities, feature flags, and base paths for versioned mounting.【F:backend-nodejs/src/routes/routeRegistry.js†L1-L109】
- `src/routes/registerApiRoutes.js` – versioned router loader applying feature gating, error boundaries, and legacy redirects for `/api/v1` traffic.【F:backend-nodejs/src/routes/registerApiRoutes.js†L1-L86】
- `test/routerLoader.test.js` – Vitest suite validating feature gating, redirects, and error boundary responses for the router loader.【F:backend-nodejs/test/routerLoader.test.js†L1-L68】
