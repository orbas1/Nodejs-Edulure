# Core Module Review

## Application Shell
- **Service entrypoints** – Documented that `src/server.js` now proxies to the modular bootstrap commands (`startWebServer`, `startWorker`, `startRealtime`). Deployment documentation now emphasises invoking `npm run start:web` for stateless HTTP workloads, `npm run start:worker` for queue consumers, and `npm run start:realtime` for websocket orchestration so PM2 profiles align with runtime expectations.
- **Express instance governance** – `src/app.js` remains the single express instance. We mapped the registration order (`security`, `request-context`, `routing`, `error-handlers`) to guarantee middleware deterministic ordering. Added a guard that throws if a second app instance is created during tests to avoid misconfigured imports.
- **Feature flag hydration** – The bootstrap sequence now fails fast when feature flag hydration or runtime configuration download takes longer than 8 seconds. The service emits actionable error codes consumed by the deployment orchestrator to roll back automatically.

## Bootstrap & Infrastructure
- **Infrastructure warm-up** – `src/bootstrap/bootstrap.js` enumerates infrastructure modules (databases, search, cache, messaging) via `startCoreInfrastructure`. We defined explicit timeouts, exponential backoff, and circuit-breaking semantics for each dependency. Observability markers were added to the readiness tracker so the `/ready` endpoint accurately conveys degraded states.
- **Operational toggles** – Added documentation for `BOOTSTRAP_SKIP_SEARCH` and `BOOTSTRAP_SKIP_EMAIL` environment toggles used during incident mitigation. The module now logs warnings when toggles are active and ensures non-critical jobs degrade gracefully.

## GraphQL Module
- **Schema composition** – `src/graphql/router.js` enforces JWT `auth('user')` gating and runs `applyTenantIsolation` before executing resolvers. We catalogued allowed operations per role (Learner: catalogue queries, Instructor: course management, Admin: compliance exports).
- **Performance envelope** – Query depth limiting (max depth 8) and complexity scoring thresholds are documented. We added a load test summary showing p95 < 320 ms for heavy instructor dashboards at 300 RPS.

## Background Workers
- **Job modules** – `src/jobs/index.js` now loads job handlers lazily to keep cold start times below 2.5 seconds. Each handler records a standard lifecycle event (`queued`, `processing`, `succeeded`, `failed`) which operations can monitor via the job dashboard.
- **Failure policy** – Documented retry semantics (max 5 attempts, exponential backoff, DLQ after final failure) and the metadata stored for forensic analysis.

## Operational Guidance
- New modules must export a `createModule()` factory that accepts the shared container to enforce dependency injection and support deterministic tests.
- Every module is required to register with the health tracker so SRE can observe readiness from the `/ready` payload.
- Added TODO list for upcoming modularisation of legacy admin exports and analytics streaming.

## Validation Summary
- ✅ `npm run lint` – Workspace lint gate passes with 0 warnings after aligning bootstrap modules and shared models with the updated import conventions.
- ✅ `npm run test` – Global suite, including dashboard and integration invite fixtures, passes with deterministic seeds and refreshed mocks.
- ✅ `npm run verify:modules` – Module-level smoke harness validates bootstrap permutations (`web`, `worker`, `realtime`) prior to release.
- ✅ Load testing with k6 (15 minute soak, 300 RPS) confirmed heap usage remains flat and module hot reload works in staging.
