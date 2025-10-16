# Environment Updates – Version 1.50 Platform Hardening

- Added per-service port configuration so infrastructure can deploy and monitor the web, worker, and realtime processes independently:
  - `WEB_PORT` / `WEB_PROBE_PORT`
  - `WORKER_PROBE_PORT`
  - `REALTIME_PORT` / `REALTIME_PROBE_PORT`
- Introduced bootstrap resiliency tuning knobs `BOOTSTRAP_MAX_RETRIES` and `BOOTSTRAP_RETRY_DELAY_MS` to control retry cadence when dependencies (DB, feature flags, search) are temporarily unavailable.
- The exported `env.services` object now surfaces the resolved port bindings for each process, while `env.bootstrap` exposes retry policy metadata for reuse in orchestration scripts.【F:backend-nodejs/src/config/env.js†L200-L215】【F:backend-nodejs/src/config/env.js†L455-L507】
- Added Redis runtime configuration block (`REDIS_ENABLED`, `REDIS_URL`/`REDIS_HOST`, `REDIS_KEY_PREFIX`, `REDIS_LOCK_PREFIX`, cache keys, lock TTL, and TLS options) so distributed feature flag and runtime configuration caches can be enabled per environment with secure defaults and certificate support.【F:backend-nodejs/src/config/env.js†L220-L335】【F:backend-nodejs/src/config/redisClient.js†L1-L92】
- Introduced `DATA_PARTITIONING_*` variables for scheduler cadence, run mode, retention grace, archive buckets/prefixes, and export safety limits powering the automated partition governance workflow and worker readiness instrumentation.【F:backend-nodejs/src/config/env.js†L220-L360】【F:backend-nodejs/src/jobs/dataPartitionJob.js†L1-L154】
- Added `WEBHOOK_BUS_*` tuning knobs (enabled flag, poll interval, batch size, max attempts, exponential backoff window, delivery timeout, and stuck-delivery recovery threshold) so operators can scale or pause webhook dispatch independently of payment processors while keeping retries governed centrally.【F:backend-nodejs/src/config/env.js†L200-L332】【F:backend-nodejs/src/services/WebhookEventBusService.js†L36-L119】

- Added CRM integration controls for HubSpot/Salesforce orchestration, including enable flags, private tokens, OAuth creden
  tials, retry/timeout tuning, and scheduler overrides (`HUBSPOT_*`, `SALESFORCE_*`, `CRM_*`) so the worker can launch the new syn
  c orchestrator with production-ready defaults and governance-friendly scheduling.【F:backend-nodejs/src/config/env.js†L266-L332
】【F:backend-nodejs/src/services/IntegrationOrchestratorService.js†L159-L214】
