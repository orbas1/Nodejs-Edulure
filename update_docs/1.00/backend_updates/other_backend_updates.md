# Other Backend Updates

- Modernised `scripts/install-db.js` to provision databases programmatically, run Knex migrations/seeds, and avoid shipping default SQL credentials.
- Replaced the legacy SQL installer (`database/install.sql`) with a documented placeholder explaining the new provisioning workflow.
- Updated `backend-nodejs/README.md` with hardened onboarding steps, required environment variables, and governance scripts.
- Documented Cloudflare R2, CloudConvert, and DRM environment requirements in the README along with ingestion worker behaviour and new content endpoints.
- Added a `security:rotate-jwt` npm script and operational guidance for signing-key rotation, highlighting secret vault storage expectations.
- Extended README guidance with workspace runtime requirements (Node.js 20.12.2+/npm 10.5.0+), pointing teams to the root verifier and shared audit scripts.
- Documented Prometheus/Grafana integration expectations in the backend README, including alerting runbooks for HTTP errors, storage latency, and unhandled exceptions.
- Added session governance runbook notes to the backend README covering refresh/logout endpoints, concurrency caps, and cache invalidation expectations for support teams.
- Documented retention automation and audit expectations in the backend README, including the `npm run data:retention` workflow, CLI flags, and policy table guidance for operations teams.
- Updated retention documentation to cover the managed scheduler, new `DATA_RETENTION_*` environment toggles, dry-run bootstraps, and backoff behaviour so operations can monitor and pause automation responsibly.
