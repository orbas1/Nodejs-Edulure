# Backend Change Log – Version 1.50 Platform Hardening

## Modular Service Bootstrap
- Introduced dedicated startup modules for the web (`src/servers/webServer.js`), worker (`src/servers/workerService.js`), and realtime (`src/servers/realtimeServer.js`) processes, each with isolated readiness tracking, retry-aware bootstrap logic, and graceful shutdown orchestration.【F:backend-nodejs/src/servers/webServer.js†L1-L114】【F:backend-nodejs/src/servers/workerService.js†L1-L153】【F:backend-nodejs/src/servers/realtimeServer.js†L1-L141】
- Added CLI entrypoints (`src/bin/web.js`, `src/bin/worker.js`, `src/bin/realtime.js`) and updated package scripts so deployments can manage each process independently or via orchestrators without reintroducing monolithic coupling.【F:backend-nodejs/src/bin/web.js†L1-L10】【F:backend-nodejs/package.json†L10-L26】

## Observability & Bootstrap Utilities
- Created a reusable readiness tracker (`src/observability/readiness.js`) and HTTP probe app factory (`src/observability/probes.js`) to standardise `/live` and `/ready` responses across services and support future health instrumentation.【F:backend-nodejs/src/observability/readiness.js†L1-L72】【F:backend-nodejs/src/observability/probes.js†L1-L39】
- Centralised database and infrastructure bootstrapping with retry semantics in `src/bootstrap/bootstrap.js`, preventing fatal exits when dependent systems are temporarily unavailable and enabling graceful degradation paths.【F:backend-nodejs/src/bootstrap/bootstrap.js†L1-L109】

## Application Entry Adjustments
- Updated `src/app.js` to expose `/live` and `/ready` endpoints and to accept readiness reporters registered by the service entrypoints, ensuring the primary API surface integrates with cluster health monitoring.【F:backend-nodejs/src/app.js†L45-L90】
- Replaced the legacy `src/server.js` implementation with a compatibility shim that delegates to the new web server while warning engineers to adopt the modular scripts.【F:backend-nodejs/src/server.js†L1-L12】

## Configuration & Testing
- Expanded environment schema support for per-service ports, probe bindings, and bootstrap retry tuning so infrastructure-as-code can provision independent deployment targets.【F:backend-nodejs/src/config/env.js†L200-L215】【F:backend-nodejs/src/config/env.js†L455-L507】
- Added a Vitest suite for the readiness tracker to ensure future regressions in health reporting are caught automatically.【F:backend-nodejs/test/readinessTracker.test.js†L1-L33】
