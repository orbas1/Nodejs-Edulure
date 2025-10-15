# Configuration Changes – Version 1.50

- `src/app.js` now publishes `/live` and `/ready` endpoints and exposes `registerReadinessProbe` so entrypoints can control readiness payloads without duplicating HTTP handling.【F:backend-nodejs/src/app.js†L45-L90】
- `src/server.js` is retained as a compatibility shim but warns teams to migrate to the new modular scripts, delegating startup to `startWebServer` under the hood.【F:backend-nodejs/src/server.js†L1-L12】
- Package scripts were expanded to target each process separately (`start:web`, `start:worker`, `start:realtime`) and to provide nodemon workflows for local development.【F:backend-nodejs/package.json†L10-L26】
- Added `src/config/redisClient.js` and extended `env.redis` parsing with prefixes, lock keys, TLS certificate decoding, and throttled logging so runtime services can establish resilient Redis connections without duplicating configuration logic.【F:backend-nodejs/src/config/redisClient.js†L1-L92】【F:backend-nodejs/src/config/env.js†L220-L335】
