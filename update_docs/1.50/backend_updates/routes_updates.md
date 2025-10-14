# Routes Updates – Version 1.50

- `/live` and `/ready` endpoints added to the Express application for Kubernetes-style probes and operator dashboards, providing JSON payloads summarising service health and component readiness.【F:backend-nodejs/src/app.js†L63-L140】
- Realtime server exposes equivalent probe routes alongside socket endpoints, allowing load balancers to verify websocket capacity without touching the REST API.【F:backend-nodejs/src/servers/realtimeServer.js†L35-L104】
- All REST routes are now versioned under `/api/v1` through a declarative router registry that applies feature-flag gates and error boundaries before delegating to domain routers, ensuring disabled capabilities return structured responses instead of generic 404s.【F:backend-nodejs/src/routes/registerApiRoutes.js†L1-L86】【F:backend-nodejs/src/middleware/featureFlagGate.js†L1-L123】
- Requests hitting the legacy `/api/*` paths receive an automatic `308` redirect to their `/api/v1/*` equivalent, allowing clients to migrate without downtime while enforcing the new contract for SDK generation.【F:backend-nodejs/src/routes/registerApiRoutes.js†L58-L84】
