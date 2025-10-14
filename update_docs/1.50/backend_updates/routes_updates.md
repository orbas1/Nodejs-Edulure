# Routes Updates – Version 1.50

- `/live` and `/ready` endpoints added to the Express application for Kubernetes-style probes and operator dashboards, providing JSON payloads summarising service health and component readiness.【F:backend-nodejs/src/app.js†L63-L83】
- Realtime server exposes equivalent probe routes alongside socket endpoints, allowing load balancers to verify websocket capacity without touching the REST API.【F:backend-nodejs/src/servers/realtimeServer.js†L35-L104】
