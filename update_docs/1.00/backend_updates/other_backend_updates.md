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
- Documented feature flag and runtime configuration governance in the backend README, covering new environment variables, `/api/runtime` endpoints, and the `npm run runtime:config` CLI workflow for operations.
- Added README guidance for the new ESLint flat config and Vitest suites so engineers consistently run lint/test gates with Prometheus-safe mocks before shipping runtime governance updates.
- Added operational documentation for `npm run storage:provision`, detailing required R2 IAM scopes, lifecycle expectations, quarantine retention, and how antivirus/quarantine alerts surface in admin consoles and observability dashboards.
- Expanded backend README and `.env.example` to document Stripe/PayPal credentials, currency/tax configuration, new `/api/payments` endpoints, Stripe raw-body requirements, and Vitest commerce coverage so engineers and operators can bootstrap checkout environments safely.
- Documented engagement configuration, reminder scheduler operations, and cron deployment guidance in the backend README so SRE and product teams can tune batch sizes/lookahead windows and monitor reminder telemetry without source-diving.
- Updated backend README and `.env.example` to document community chat and direct messaging prerequisites (websocket/notification hooks, presence TTL defaults, moderation workflows), reference the new `/api/communities/{id}/chat` and `/api/chat` endpoints, and outline the seed data/storyboards used by frontend and mobile teams.
- Extended backend README and `.env.example` with social graph guidance: documented follow pagination/mute defaults, described `/api/social` follow/mute/block/privacy workflows, and noted seed data representing follower approvals/pending requests so product, support, and frontend squads can exercise the new social experiences locally.
- Documented Meilisearch explorer operations in the backend README: captured new environment variables, Prometheus metrics, the
  `npm run search:provision` bootstrap/snapshot workflow, and security guidance calling out the enforced read-only search key
  requirement.
- Extended README/search docs with ingestion coverage: outlined `npm run search:reindex`, incremental sync guidance, ingestion env toggles, expected dataset seeds (courses, ebooks, tutors, live classrooms, ads), and Prometheus metrics so ops teams can run catch-up indexing safely.

- Added backend README and `.env.example` guidance for the KYC verification pipeline: documented storage configuration requirements (`R2_UPLOADS_BUCKET`, max upload bytes), checksum expectations, presigned URL TTLs, reviewer role mapping, audit log retention, and `/api/verification` usage so engineering, compliance, and support teams can manage document capture and review workflows without reverse-engineering code.
