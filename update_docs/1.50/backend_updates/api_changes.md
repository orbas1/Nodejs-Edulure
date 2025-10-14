# API Changes – Version 1.50

- Added `/live` and `/ready` endpoints to the primary Express application to expose process liveness and readiness states for Kubernetes-style probes and operator dashboards.【F:backend-nodejs/src/app.js†L63-L140】
- Introduced standalone probe endpoints on the realtime service so websocket infrastructure can be monitored independently of the REST API.【F:backend-nodejs/src/servers/realtimeServer.js†L35-L81】
- Versioned all REST endpoints under `/api/v1` and applied feature-flag gates and route-level error boundaries so tenants without access to specific capabilities receive deterministic JSON responses instead of hitting disabled controllers.【F:backend-nodejs/src/routes/registerApiRoutes.js†L1-L86】【F:backend-nodejs/src/middleware/featureFlagGate.js†L1-L123】【F:backend-nodejs/src/middleware/routeErrorBoundary.js†L1-L56】
- Updated OpenAPI metadata to advertise the new base path, keeping generated SDKs and partner integrations aligned with the versioned contract.【F:backend-nodejs/src/docs/openapi.json†L9-L19】
