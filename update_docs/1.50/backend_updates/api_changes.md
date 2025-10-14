# API Changes – Version 1.50

- Added `/live` and `/ready` endpoints to the primary Express application to expose process liveness and readiness states for Kubernetes-style probes and operator dashboards.【F:backend-nodejs/src/app.js†L63-L83】
- Introduced standalone probe endpoints on the realtime service so websocket infrastructure can be monitored independently of the REST API.【F:backend-nodejs/src/servers/realtimeServer.js†L35-L81】
