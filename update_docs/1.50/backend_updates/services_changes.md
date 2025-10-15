# Services Changes – Version 1.50

- Asset ingestion, data retention, and community reminder jobs now run inside the dedicated worker process, allowing deployments to scale or restart job schedulers without impacting the public web API.【F:backend-nodejs/src/servers/workerService.js†L39-L108】
- Realtime socket gateway runs as an isolated deployment that exposes `/live`, `/ready`, and `/health` probes while reusing the shared infrastructure bootstrap for feature flags and search, ensuring outages do not cascade into the web API process.【F:backend-nodejs/src/servers/realtimeServer.js†L15-L104】
- Feature flag and runtime configuration services now consume a shared Redis-backed distributed cache with hydration, lock orchestration, and graceful degradation so horizontally scaled web, worker, and realtime deployments evaluate rollout state consistently.【F:backend-nodejs/src/services/FeatureFlagService.js†L1-L520】【F:backend-nodejs/src/services/DistributedRuntimeCache.js†L1-L129】
