# Module Changes – Version 1.50

- Added `bootstrap` module for shared startup logic and dependency retries (`src/bootstrap/bootstrap.js`).【F:backend-nodejs/src/bootstrap/bootstrap.js†L1-L109】
- Extended observability layer with readiness tracking utilities (`src/observability/readiness.js`) and probe app generation (`src/observability/probes.js`) to standardise health reporting across services.【F:backend-nodejs/src/observability/readiness.js†L1-L72】【F:backend-nodejs/src/observability/probes.js†L1-L39】
- Established new service entry modules (`src/servers/*.js`) responsible for orchestrating the lifecycle of the web API, background workers, and realtime gateway.【F:backend-nodejs/src/servers/webServer.js†L1-L114】【F:backend-nodejs/src/servers/workerService.js†L1-L153】【F:backend-nodejs/src/servers/realtimeServer.js†L1-L141】
