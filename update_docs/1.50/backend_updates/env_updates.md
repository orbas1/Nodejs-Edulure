# Environment Updates – Version 1.50 Platform Hardening

- Added per-service port configuration so infrastructure can deploy and monitor the web, worker, and realtime processes independently:
  - `WEB_PORT` / `WEB_PROBE_PORT`
  - `WORKER_PROBE_PORT`
  - `REALTIME_PORT` / `REALTIME_PROBE_PORT`
- Introduced bootstrap resiliency tuning knobs `BOOTSTRAP_MAX_RETRIES` and `BOOTSTRAP_RETRY_DELAY_MS` to control retry cadence when dependencies (DB, feature flags, search) are temporarily unavailable.
- The exported `env.services` object now surfaces the resolved port bindings for each process, while `env.bootstrap` exposes retry policy metadata for reuse in orchestration scripts.【F:backend-nodejs/src/config/env.js†L200-L215】【F:backend-nodejs/src/config/env.js†L455-L507】
