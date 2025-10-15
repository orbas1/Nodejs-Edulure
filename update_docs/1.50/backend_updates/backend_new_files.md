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
- `src/services/CapabilityManifestService.js` – aggregates readiness probes and feature flag evaluations into a capability manifest consumable by clients.【F:backend-nodejs/src/services/CapabilityManifestService.js†L1-L209】
- `src/services/DistributedRuntimeCache.js` – Redis-backed snapshot manager providing hydration, lock orchestration, and write-through persistence for feature flags and runtime configuration services.【F:backend-nodejs/src/services/DistributedRuntimeCache.js†L1-L129】
- `test/capabilityManifestService.test.js` – Vitest coverage for manifest construction, ensuring degraded services and disabled flags produce the expected availability signals.【F:backend-nodejs/test/capabilityManifestService.test.js†L1-L111】
- `src/config/redisClient.js` – shared Redis client factory with TLS support, throttled logging, and retry controls for distributed runtime caches.【F:backend-nodejs/src/config/redisClient.js†L1-L92】
- `sdk-typescript/` workspace providing the generated TypeScript SDK, including the OpenAPI generator script (`scripts/generate-sdk.mjs`), runtime configuration helper (`src/runtime/configure.ts`), and compiled distribution artifacts (`dist/index.js`).【F:sdk-typescript/scripts/generate-sdk.mjs†L1-L66】【F:sdk-typescript/src/runtime/configure.ts†L1-L83】【F:sdk-typescript/dist/index.js†L1-L15】
- `src/services/OperatorDashboardService.js` – aggregates manifest health, incidents, scam telemetry, and runbooks into the operator dashboard snapshot powering the admin command centre.【F:backend-nodejs/src/services/OperatorDashboardService.js†L1-L305】
- `src/models/SecurityIncidentModel.js` – normalises encrypted incident records with SLA metadata for operator dashboards and compliance reporting.【F:backend-nodejs/src/models/SecurityIncidentModel.js†L1-L91】
