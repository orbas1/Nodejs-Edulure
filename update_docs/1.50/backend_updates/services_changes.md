# Services Changes – Version 1.50

- Asset ingestion, data retention, and community reminder jobs now run inside the dedicated worker process, allowing deployments to scale or restart job schedulers without impacting the public web API.【F:backend-nodejs/src/servers/workerService.js†L39-L108】
- Realtime socket gateway runs as an isolated deployment that exposes `/live`, `/ready`, and `/health` probes while reusing the shared infrastructure bootstrap for feature flags and search, ensuring outages do not cascade into the web API process.【F:backend-nodejs/src/servers/realtimeServer.js†L15-L104】
