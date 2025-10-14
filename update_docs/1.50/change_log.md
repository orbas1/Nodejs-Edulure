# Version 1.10 Update Change Log

- Removed all provider phone app artifacts (documentation, evaluations, tests, and UI assets) from the update package to reflect the retirement of the provider mobile experience.
- Decomposed the Node.js API server into dedicated web, worker, and realtime processes with readiness/liveness probes, resilient startup retries, and graceful shutdown orchestration to satisfy the platform hardening charter for Milestone M1.【F:backend-nodejs/src/servers/webServer.js†L1-L114】【F:backend-nodejs/src/servers/workerService.js†L1-L153】【F:backend-nodejs/src/servers/realtimeServer.js†L1-L141】
