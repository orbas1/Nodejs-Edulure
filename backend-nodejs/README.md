# Edulure Node.js API

Production-ready Express.js API powering the Edulure platform. The service now enforces hardened security defaults, typed API
contracts, managed database migrations, and orchestration hooks used by learner and instructor experiences. Version 1.50 also
ships a full Cloudflare R2 backed content pipeline for ingesting, processing, and distributing course assets.

## Getting started

```bash
cp .env.example .env
npm install
npm run db:install
npm run dev
```

Key environment variables are validated on boot. Ensure the following are set before starting the server:

- `APP_URL` or `CORS_ALLOWED_ORIGINS` – comma-separated list of allowed web origins.
- `CORS_ALLOWED_METHODS`, `CORS_ALLOWED_HEADERS`, `CORS_ALLOW_CREDENTIALS`, `CORS_MAX_AGE_SECONDS` – tighten cross-origin requests
  for production deployments. Defaults permit common REST verbs, authenticated requests, and cache pre-flight responses for ten
  minutes.
- `JWT_KEYSET` / `JWT_ACTIVE_KEY_ID` – base64 encoded JSON describing signing keys. Generate via `npm run security:rotate-jwt`. A legacy `JWT_SECRET` is still honoured for local environments.
- `JWT_REFRESH_SECRET` – 32+ character secret for refresh token HMAC hashing.
- `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` – database credentials. Set `DB_PROVISION_USER=true` only for local installs.
- `TOKEN_EXPIRY_MINUTES`, `REFRESH_TOKEN_EXPIRY_DAYS` – optional overrides for token lifetimes.
- `SESSION_VALIDATION_CACHE_TTL_MS`, `MAX_ACTIVE_SESSIONS_PER_USER` – govern how aggressively session state is cached and the maximum concurrent refresh sessions for any account.
- `TWO_FACTOR_REQUIRED_ROLES` – comma-separated list of roles that must complete multi-factor authentication (e.g. `admin`).
- `TWO_FACTOR_ISSUER`, `TWO_FACTOR_ENCRYPTION_KEY` – customise authenticator branding and secret encryption. Defaults derive from JWT refresh configuration for local environments.
- `DATA_ENCRYPTION_PRIMARY_KEY`, `DATA_ENCRYPTION_ACTIVE_KEY_ID`, `DATA_ENCRYPTION_FALLBACK_KEYS` – enable at-rest encryption and staged key rotation for sensitive columns and document blobs.
- `LOG_SERVICE_NAME`, `LOG_REDACTED_FIELDS` – customise log metadata and extend default secret/PII redaction.
- `AUDIT_LOG_*` – define tenancy, redaction, and payload limits for immutable audit trails exposed to compliance teams.
- `TRACE_HEADER_NAME`, `TRACING_SAMPLE_RATE` – tune inbound trace propagation and sampling for distributed telemetry.
- `METRICS_ENABLED`, `METRICS_USERNAME`/`METRICS_PASSWORD` or `METRICS_BEARER_TOKEN`, `METRICS_ALLOWED_IPS` – secure Prometheus access for operations tooling.
- `SLO_*` – configure objective windows, burn rates, and thresholds powering the readiness dashboards.
- `DATA_RETENTION_ENABLED`, `DATA_RETENTION_CRON`, `DATA_RETENTION_TIMEZONE`, `DATA_RETENTION_MAX_FAILURES`, `DATA_RETENTION_FAILURE_BACKOFF_MINUTES` – control the automated retention scheduler, including execution window and resilience thresholds.
- `DATA_PARTITIONING_*`, `DOMAIN_EVENTS_DISPATCH_*`, `WEBHOOK_BUS_*` – govern background partitioning, domain event delivery, and webhook fan-out reliability.
- `FEATURE_FLAG_CACHE_TTL_SECONDS`, `FEATURE_FLAG_REFRESH_INTERVAL_SECONDS`, `RUNTIME_CONFIG_CACHE_TTL_SECONDS`, `RUNTIME_CONFIG_REFRESH_INTERVAL_SECONDS` – tune feature flag/runtime configuration cache behaviour for the API and CLI.

`npm run db:install` provisions the schema (via Knex migrations) and seeds the database. Use `npm run migrate:latest`/`npm run
migrate:rollback` to manage schema changes in CI/CD. The asset ingestion worker is started alongside the HTTP server and relies on
CloudConvert for PowerPoint renditions and local EPUB parsing for ebook manifest generation.

The bootstrap seed (`npm run seed`) now provisions an operator-ready dataset: verified admin/instructor/learner accounts, two
communities with owner auto-enrolment, a production-style PowerPoint asset and its ingestion history, ebook reading telemetry,
and active + stale refresh sessions for governance testing. Seeds intentionally cover scenarios referenced in retention policies
so QA can validate the automation routines.

### Session hardening & audit trails

The authentication stack enforces account lockouts, refresh session ceilings, and cryptographically protected MFA secrets. Tune `SESSION_VALIDATION_CACHE_TTL_MS`, `MAX_ACTIVE_SESSIONS_PER_USER`, and the `ACCOUNT_LOCKOUT_*` window to match your production risk appetite. Immutable audit trails (`AUDIT_LOG_*`) redact sensitive fields by default while preserving the context required for compliance investigations. When encryption at rest is mandated, supply `DATA_ENCRYPTION_PRIMARY_KEY`, rotate with `DATA_ENCRYPTION_ACTIVE_KEY_ID`, and stage fallbacks via `DATA_ENCRYPTION_FALLBACK_KEYS`.

### Quality gates

- `npm run lint --workspace backend-nodejs` executes the ESLint flat configuration (`eslint.config.mjs`) which lint-checks the
  entire workspace, including Vitest suites and operational scripts, with import resolution tuned for ESM modules and Prometheus
  instrumentation.
- `npm run test --workspace backend-nodejs` runs the Vitest suite. Prometheus collectors and other infrastructure dependencies
  are safely mocked in `test/setupMocks.js` so feature flag/runtime configuration logic and retention schedulers execute without
  external services.

### Rotating JWT signing keys

Run the rotation script whenever access tokens need to be re-keyed or revoked:

```bash
npm run security:rotate-jwt -- --keyset secure/jwt-keys.json
```

The script promotes a newly generated signing key, marks the previous active key as legacy, and prints a base64 encoded payload
that should be copied to your secret manager (`JWT_KEYSET` / `JWT_ACTIVE_KEY_ID`). The plaintext secret is displayed once—store
it immediately and never commit the generated keyset file.

### Content pipeline environment

The following additional variables configure the asset workflow:

- `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` – Cloudflare R2 credentials provisioned for the environment.
- `R2_REGION` – region for R2 (typically `auto`).
- `R2_PUBLIC_BUCKET` – bucket serving public CDN content.
- `R2_PRIVATE_BUCKET` – bucket for private, signed downloads.
- `R2_UPLOADS_BUCKET` – bucket receiving presigned uploads before ingestion.
- `R2_QUARANTINE_BUCKET` – bucket isolating uploads flagged by antivirus until a moderator reviews them.
- `ASSET_PRESIGN_TTL_MINUTES` / `ASSET_DOWNLOAD_TTL_MINUTES` – expiry windows for presigned upload and download URLs.
- `CONTENT_MAX_UPLOAD_MB` – upload size limit enforced before presigning.
- `CLOUDCONVERT_API_KEY` – optional. Required for PowerPoint to PDF conversion and thumbnails.
- `DRM_DOWNLOAD_LIMIT` – throttles the number of ebook downloads per learner account.

When running locally without CloudConvert the ingestion worker will mark PowerPoint jobs as failed. Other formats (EPUB, PDF) are
processed entirely within the service and will continue to function.

### Telemetry pipeline

Version 1.50 introduces a governed telemetry pipeline spanning consent capture, event ingestion, freshness monitoring, and warehouse exports. Configure the following variables when enabling telemetry in any environment:

- `TELEMETRY_INGESTION_ENABLED` – master switch for the ingestion API. Disable to prevent writes during maintenance windows.
- `TELEMETRY_ALLOWED_SOURCES` / `TELEMETRY_STRICT_SOURCE_ENFORCEMENT` – whitelist authorised producers (for example, `web,backend,worker`) and hard-block unknown sources in production.
- `TELEMETRY_DEFAULT_SCOPE` / `TELEMETRY_CONSENT_DEFAULT_VERSION` / `TELEMETRY_CONSENT_HARD_BLOCK` – control consent scoping and enforcement. When `HARD_BLOCK` is `true` events without active consent are persisted with an ingestion status of `suppressed` and excluded from export.
- `TELEMETRY_EXPORT_ENABLED`, `TELEMETRY_EXPORT_DESTINATION`, `TELEMETRY_EXPORT_BUCKET`, `TELEMETRY_EXPORT_PREFIX`, `TELEMETRY_EXPORT_BATCH_SIZE`, `TELEMETRY_EXPORT_COMPRESS`, `TELEMETRY_EXPORT_RUN_ON_STARTUP`, `TELEMETRY_EXPORT_CRON`, `TELEMETRY_EXPORT_TIMEZONE` – configure warehouse exports. The default settings batch 5,000 events, compress JSONL payloads, and run every ten minutes in UTC.
- `TELEMETRY_FRESHNESS_INGESTION_THRESHOLD_MINUTES` / `TELEMETRY_FRESHNESS_WAREHOUSE_THRESHOLD_MINUTES` – thresholds surfaced in Prometheus metrics and the `/telemetry/freshness` endpoint so operators can detect pipeline drift.
- `TELEMETRY_LINEAGE_TOOL` / `TELEMETRY_LINEAGE_AUTO_RECORD` – annotate exports with lineage metadata (defaults to `dbt`).

Operational endpoints:

- `POST /api/v1/telemetry/events` ingests a single event, enforces consent, and records deduplicated payloads for export. A `202` response indicates the event will flow to the warehouse.
- `POST /api/v1/telemetry/consents` records or revokes consent for a user and scope combination, versioning entries in the consent ledger.
- `GET /api/v1/telemetry/freshness` lists ingestion and export checkpoints with computed lag so operators can validate pipeline health.
- `POST /api/v1/telemetry/export` triggers an immediate warehouse export in addition to the scheduled cron execution.
- `GET /api/v1/analytics/bi/executive-overview` returns aggregated KPIs, revenue trends, community metrics, experiments, and telemetry health powering the operator dashboards. Use the optional `range` query parameter (`7d`, `14d`, `30d`, `90d`) to control KPI deltas.

Exports stream to Cloudflare R2 (or the configured destination) using the background worker. The telemetry warehouse job is registered in `src/jobs/telemetryWarehouseJob.js` and honours the configured cron as well as manual triggers. Freshness checkpoints feed Prometheus metrics (`edulure_telemetry_ingestion_events_total`, `edulure_telemetry_export_lag_seconds`) so alerting can detect stale pipelines.

### Operational instrumentation & SLOs

Prometheus exporters surface latency, availability, and business throughput from every service boundary. Lock down scrape endpoints with `METRICS_USERNAME`/`METRICS_PASSWORD` or a `METRICS_BEARER_TOKEN`, and restrict networks via `METRICS_ALLOWED_IPS`. Service-level objectives configured through `SLO_*` control burn-rate calculations, alert routing, and the readiness dashboards embedded in `/api/v1/release/dashboard`.

### Governance automation & eventing

Retention, partitioning, and downstream webhooks execute from dedicated schedulers. Adjust `DATA_RETENTION_*` for archival cadence, `DATA_PARTITIONING_*` for long-lived table hygiene, and the `DOMAIN_EVENTS_DISPATCH_*` / `WEBHOOK_BUS_*` settings to guarantee reliable event delivery across tenant boundaries.

### Release readiness orchestration

Platform operators gain a dedicated release management surface that consolidates readiness checklists, gate outcomes, and deployment dashboards. Configure the new environment variables to tune thresholds and governance:

- `RELEASE_REQUIRED_GATES` – comma-separated list of gate slugs that must succeed before a run is marked `ready`. Defaults match the seeded quality, security, observability, compliance, and change gates.
- `RELEASE_MIN_COVERAGE` / `RELEASE_MAX_TEST_FAILURE_RATE` – automated quality thresholds applied to auto-evaluated gates.
- `RELEASE_MAX_CRITICAL_VULNERABILITIES` / `RELEASE_MAX_HIGH_VULNERABILITIES` – security thresholds emitted by nightly scans.
- `RELEASE_MAX_OPEN_INCIDENTS` / `RELEASE_MAX_ERROR_RATE` – observability guardrails ensuring production health is stable through the change window.
- `RELEASE_CHANGE_FREEZE_CRON` – cron expression representing enterprise freeze windows. Evaluations warn when runs overlap the freeze schedule.

Core APIs:

- `GET /api/v1/release/checklist` – list the active readiness gates, success criteria, and default owners for operator playbooks.
- `POST /api/v1/release/runs` – schedule a release run. Stores a point-in-time checklist snapshot, owner assignments, and optional seed metrics for auto-evaluated gates.
- `GET /api/v1/release/runs` / `GET /api/v1/release/runs/:publicId` – inspect historical runs, change windows, readiness scores, and gate-level evidence.
- `POST /api/v1/release/runs/:publicId/gates/:gateKey/evaluations` – record manual or automated gate outcomes with metrics, notes, and evidence links.
- `POST /api/v1/release/runs/:publicId/evaluate` – recompute readiness status using the latest metrics, update Prometheus gauges, and surface blocking gates.
- `GET /api/v1/release/dashboard` – summarise upcoming releases, status breakdowns, and aggregated readiness scores for programme reviews.

Prometheus now publishes `edulure_release_gate_evaluations_total`, `edulure_release_run_status`, and `edulure_release_readiness_score` so runbooks and alerts can track the health of deployment pipelines in real time.

### Monetisation reconciliation

The worker now also schedules `MonetizationReconciliationJob` (`src/jobs/monetizationReconciliationJob.js`). The job recognises deferred revenue, reconciles captured payments with usage metering, and persists GAAP-friendly summaries. Configuration lives under the new `MONETIZATION_*` environment variables in `.env.example`; by default the job runs every five minutes, emits Prometheus metrics (`edulure_monetization_usage_recorded_total`, `edulure_monetization_revenue_recognized_cents_total`, `edulure_monetization_deferred_revenue_cents`), and produces detailed rows in `monetization_reconciliation_runs` for finance review.

#### Multi-tenant scheduling

Set `MONETIZATION_RECONCILIATION_TENANTS` to a comma-separated allow list when only certain tenants should be reconciled. When the allow list is omitted the job auto-discovers tenants across catalog, usage, schedule, and reconciliation tables; the discovered list is cached for `MONETIZATION_RECONCILIATION_TENANT_CACHE_MINUTES` (default 30) to avoid excessive polling but refreshes automatically when the cache expires.

### Explorer search environment

The explorer, recommendation, and ads surfaces rely on a hardened Meilisearch cluster. Configure the following variables to
provision the cluster and secure API access:

- `MEILISEARCH_HOSTS` – comma-separated list of primary/admin hosts (include protocol and port).
- `MEILISEARCH_REPLICA_HOSTS` – optional replica nodes for failover during write operations.
- `MEILISEARCH_SEARCH_HOSTS` – read endpoints consumed by web/mobile clients. Defaults to the union of primary + replica hosts.
- `MEILISEARCH_ADMIN_API_KEY` – admin/master API key used for index provisioning and security audits. Store in a secret manager.
- `MEILISEARCH_SEARCH_API_KEY` – read-only key distributed to clients. The backend will refuse to start if this key has write
  permissions.
- `MEILISEARCH_HEALTHCHECK_INTERVAL_SECONDS` – cadence for cluster health monitoring and Prometheus reporting.
- `MEILISEARCH_REQUEST_TIMEOUT_MS` – timeout for administrative calls (index bootstrap, health checks, snapshots).
- `MEILISEARCH_INDEX_PREFIX` – isolates indexes per environment/tenant (`edulure`, `edulure-staging`, etc.).
- `MEILISEARCH_ALLOWED_IPS` – IP/CIDR list exposed to operations for allow-listing reverse proxies hitting the cluster.

Bootstrap or audit the cluster at any time with:

```bash
npm run search:provision
# Append --snapshot to trigger a Meilisearch snapshot once indexes are synchronised
npm run search:provision -- --snapshot
```

The command ensures explorer indexes exist with production settings, verifies API key privileges, runs live health checks across
primary/replica/read nodes, and (optionally) requests a snapshot for off-site backups. Prometheus now exposes
`edulure_search_operation_duration_seconds`, `edulure_search_node_health`, and `edulure_search_index_ready` so alerting can
detect unhealthy nodes or drifted index definitions.

Explorer ingestion is orchestrated by `SearchIngestionService`. Configure the following to tune throughput and retention:

- `SEARCH_INGESTION_BATCH_SIZE` – number of records fetched per entity batch (default `500`).
- `SEARCH_INGESTION_CONCURRENCY` – how many indexes to process in parallel during a reindex (default `2`).
- `SEARCH_INGESTION_DELETE_BEFORE_REINDEX` – when `true` (default) a full rebuild clears existing documents before ingestion;
  incremental runs (`--since`) always append/update in place regardless of this flag.

Trigger a full or incremental rebuild with:

```bash
# Full rebuild (deletes and repopulates every explorer index)
npm run search:reindex

# Incremental sync – only reindex documents changed in the last 24 hours
npm run search:reindex -- --since="2024-11-01T00:00:00Z"

# Focus on specific indexes (e.g. courses + ads)
npm run search:reindex -- --indexes=courses,ads
```

Successful runs emit Prometheus metrics `edulure_search_ingestion_duration_seconds`,
`edulure_search_ingestion_documents_total`, `edulure_search_ingestion_errors_total`, and
`edulure_search_ingestion_last_run_timestamp` so dashboards and alerts can track coverage, throughput, and failure causes.

### Payments & finance environment

Stripe and PayPal power the unified checkout, refunds, and finance reporting suite. Configure the following secrets before
enabling commerce in any environment:

- `STRIPE_SECRET_KEY` / `STRIPE_PUBLISHABLE_KEY` – API keys for the target Stripe account. Use restricted keys for staging.
- `STRIPE_WEBHOOK_SECRET` – signing secret from the Stripe dashboard used to validate `/api/payments/webhooks/stripe` requests.
- `STRIPE_STATEMENT_DESCRIPTOR` – 5–22 character descriptor presented on card statements. Defaults to `EDULURE LEARNING`.
- `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` – REST credentials for the PayPal application (sandbox or live).
- `PAYPAL_ENVIRONMENT` – `sandbox` or `live` to control SDK routing.
- `PAYPAL_WEBHOOK_ID` – optional ID for webhook verification once PayPal notifications are enabled.
- `PAYMENTS_DEFAULT_CURRENCY` & `PAYMENTS_ALLOWED_CURRENCIES` – restrict invoicing currencies. Currencies are validated on boot.
- `PAYMENTS_TAX_TABLE` – JSON encoded tax catalogue with per-country and per-region rates. Inclusive/exclusive behaviour is
  toggled with `PAYMENTS_TAX_INCLUSIVE`.
- `PAYMENTS_MAX_COUPON_PERCENTAGE` – hard cap for percentage coupons expressed in % (e.g. `80` = 80%).
- `PAYMENTS_REPORTING_TIMEZONE` – IANA timezone string used when summarising captured revenue in finance reports.

#### Stripe webhook routing

`src/app.js` captures the raw JSON payload for `/api/v1/payments/webhooks/stripe` so signature verification succeeds. The
verifier explicitly checks the versioned route prefix produced by `mountVersionedApi`. If the API prefix or version changes,
update the `VERSIONED_API_BASE_PATH` constant alongside the router configuration; otherwise `req.rawBody` will be undefined and
Stripe requests will fail signature validation.

### Messaging & presence environment

Community chat and direct messaging expose tunable pagination and presence windows so operations teams can right-size load and
privacy controls per deployment:

- `CHAT_PRESENCE_DEFAULT_TTL_MINUTES` / `CHAT_PRESENCE_MAX_TTL_MINUTES` – governs how long a presence beacon remains active
  without a refresh. The API clamps individual updates to this ceiling to avoid stale presence data lingering indefinitely.
- `CHAT_MESSAGE_DEFAULT_PAGE_SIZE` / `CHAT_MESSAGE_MAX_PAGE_SIZE` – controls default and maximum payload sizes for channel
  history requests, ensuring pagination stays efficient even when moderators request large exports.
- `DM_THREAD_DEFAULT_PAGE_SIZE` / `DM_THREAD_MAX_PAGE_SIZE` – sets default and upper limits when listing inbox threads. Offsets
  greater than the configured ceiling are automatically normalised to protect the database from pathological scans.
- `DM_MESSAGE_DEFAULT_PAGE_SIZE` / `DM_MESSAGE_MAX_PAGE_SIZE` – applies to direct-message history endpoints so clients can fetch
  longer timelines without bypassing retention or moderation guardrails.

The Vitest harness provisions safe defaults for these variables so tests run without contacting real providers. In development,
seed data ships with dormant coupons and example orders for validating finance dashboards.

### Social graph environment

Follow relationships, recommendations, and privacy controls introduce their own environment levers so operators can tailor social
experiences per tenant:

- `SOCIAL_FOLLOW_DEFAULT_PAGE_SIZE` / `SOCIAL_FOLLOW_MAX_PAGE_SIZE` – clamp follower/following pagination to safe bounds for API
  clients and moderation exports.
- `SOCIAL_RECOMMENDATION_MAX_RESULTS` – maximum number of algorithmic suggestions returned from `/api/social/recommendations`.
- `SOCIAL_RECOMMENDATION_REFRESH_MINUTES` – downstream workers use this cadence to refresh cached recommendations; document the
  value alongside scheduler configuration.
- `SOCIAL_MUTE_DEFAULT_DURATION_DAYS` – default length applied when clients mute a user without specifying a duration. Controllers
  accept explicit overrides but never exceed the configured ceiling.

Common API workflows:

```bash
# Request to follow user 91 (auto-approves when allowed)
curl -X POST https://api.local.edulure.com/api/social/follows/91 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"source":"profile-card"}'

# Approve a pending request as the target user
curl -X POST https://api.local.edulure.com/api/social/users/42/followers/91/approve \
  -H "Authorization: Bearer <token>"

# Retrieve personalised suggestions capped by SOCIAL_RECOMMENDATION_MAX_RESULTS
curl https://api.local.edulure.com/api/social/recommendations?limit=8 \
  -H "Authorization: Bearer <token>"
```

## Project structure

```
src/
  config/        # env validation, logger, knex connection
  controllers/   # request handlers returning standard envelopes
  docs/          # OpenAPI specification served at /api/docs
  middleware/    # shared Express middleware (auth, error handling)
  models/        # data mappers using Knex
  routes/        # API route definitions
  services/      # domain logic & orchestration
migrations/      # versioned Knex migrations
seeds/           # optional data seeds for local development
scripts/         # operational scripts (database install, etc.)
```

## Security & governance

- HTTP requests are protected by Helmet, HPP, compression, rate limiting, and strict CORS origin allow-lists.
- JWTs include issuer/audience claims and role-aware access control. Refresh tokens are stored as hashed session records.
- Environment validation (Zod) prevents the API from booting with unsafe defaults.
- Dependabot configuration lives at the repo root (`.github/dependabot.yml`) and `npm run audit:dependencies` surfaces CVEs.
- Workspace tooling enforces Node.js 20.12.2+/npm 10.5.0+ via a preinstall runtime check and shared `.nvmrc`/`.npmrc` so local, CI, and production environments stay aligned.
- Observability defaults now expose Prometheus metrics, structured request/trace logging, and per-request correlation IDs to power runbooks and dashboards.

## Observability & telemetry

- **Prometheus metrics** – `GET /metrics` emits application, HTTP, and Cloudflare R2 storage histograms/counters. Protect the endpoint with either Basic or Bearer auth and IP allow-lists via the environment variables outlined above. Attach the scrape job to your monitoring stack to unlock latency/error dashboards and alerting.
- **Request correlation** – every inbound request (and downstream log line) carries a `traceId` propagated via the configurable `TRACE_HEADER_NAME`. Existing request IDs from upstream gateways are preserved when valid; otherwise a UUID is issued and echoed back in the response header.
- **Structured logging** – Pino enriches each log with trace/span/user identifiers, service metadata, and redacts secrets and PII by default. Extend redaction lists through `LOG_REDACTED_FIELDS` to match compliance requirements.
- **Storage instrumentation** – Cloudflare R2 interactions are wrapped with duration/throughput metrics and telemetry spans so ingestion issues surface quickly. Histogram buckets can be tuned downstream without code changes.

Alerting runbooks should monitor:

1. `edulure_http_request_errors_total` spikes over a rolling five-minute window (API regressions, dependency outages).
2. `edulure_storage_operation_duration_seconds` 95th percentile exceeding 2 seconds (Cloudflare or network issues) alongside `edulure_storage_operations_in_flight` saturation.
3. `edulure_unhandled_exceptions_total` increments correlated with low `edulure_http_request_duration_seconds` (fast failures indicative of configuration errors).

Example Prometheus scrape configuration:

```yaml
- job_name: edulure-api
  metrics_path: /metrics
  scheme: https
  static_configs:
    - targets: ['api.edulure.com']
  basic_auth:
    username: ${EDULURE_METRICS_USER}
    password: ${EDULURE_METRICS_PASS}
```

## Automated data retention

- **Managed scheduler** – The HTTP process boots a `node-cron` powered `DataRetentionJob` that enforces policies according to the configured `DATA_RETENTION_CRON`. Toggle dry-runs with `DATA_RETENTION_DRY_RUN`, gate execution with `DATA_RETENTION_ENABLED`, and rely on automatic backoff after repeated failures to avoid destructive retries during outages.
- **Policies as data** – Data hygiene is managed through the `data_retention_policies` table. Each record defines the entity,
  action (`hard-delete` or `soft-delete`), retention horizon, and JSON criteria so governance can fine-tune behaviour without a
  deploy cycle.
- **Execution service** – Run `npm run data:retention` on a schedule to enforce policies. Add `--dry-run` to review the impact
  and `--verbose` for per-policy output. Every live run writes an immutable record to `data_retention_audit_logs` capturing rows
  touched, sample identifiers, and contextual metadata for compliance teams.
- **Session hygiene** – Expired or inactive refresh sessions older than 90 days (30 days of inactivity) are automatically purged,
  keeping authentication tables lean and preventing unlimited token accumulation. The session model now honours a `deleted_at`
  flag so API queries ignore cleaned-up rows.
- **Lifecycle coverage** – Communities dormant for two years are softly deleted rather than wiped, preserving the ability to
  restore IDs while hiding them from member listings. Domain events and content asset telemetry follow rolling hard deletes to
  keep analytics performant and storage predictable.

## Feature flags & runtime configuration

- **Database-backed definitions** – Feature flags, audits, and runtime configuration entries live in dedicated tables created by migration `20241107101500_feature_flags_and_runtime_config.js`. Flags support boolean, percentage, and segment strategies with environment scopes and schedules.
- **Caching & metrics** – `FeatureFlagService` and `RuntimeConfigService` cache records in-memory, expose Prometheus counters (`edulure_feature_flag_evaluations_total`, `edulure_runtime_config_reads_total`), and auto-refresh based on the new TTL environment variables.
- **Operational interfaces** – `/api/runtime/public`, `/api/runtime/user`, and `/api/runtime/snapshot` provide scoped payloads for clients and ops. `npm run runtime:config` generates JSON snapshots for change reviews or incident response.
- **Frontend integration** – The React app consumes `/api/runtime` through `RuntimeConfigProvider`, gating navigation (e.g., admin console kill switch) and surfacing support contacts from configuration entries.

## API surface

The OpenAPI document served at `GET /api/docs` captures contracts for the following production endpoints:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/users/me`
- `GET /api/users` (admin-or-higher)
- `GET /api/communities`
- `POST /api/communities` (instructor-or-higher)
- `POST /api/content/assets/upload-session` – instructors request Cloudflare R2 presigned uploads.
- `POST /api/content/assets/{assetId}/ingest` – confirm uploads and queue ingestion jobs.
- `GET /api/content/assets` – list content assets with pagination and filtering (instructor or admin roles).
- `GET /api/content/assets/{assetId}` – fetch asset metadata, conversion outputs, and audit trail.
- `GET /api/content/assets/{assetId}/viewer-token` – issue DRM-protected download tokens.
- `POST /api/content/assets/{assetId}/events` – record download/view/progress analytics.
- `POST /api/content/assets/{assetId}/progress` & `GET /api/content/assets/{assetId}/progress` – ebook reader telemetry.
- `GET /api/content/assets/{assetId}/analytics` – instructor analytics dashboard dataset.
- `POST /api/payments` – create Stripe or PayPal intents with automatic tax, coupon, and metadata orchestration.
- `POST /api/payments/paypal/{paymentId}/capture` – capture previously approved PayPal orders once learners approve payment.
- `POST /api/payments/{paymentId}/refunds` – issue full or partial refunds with idempotent Stripe/PayPal integrations.
- `GET /api/payments/reports/summary` – finance snapshot summarising gross/discount/tax/refund totals per currency.
- `GET /api/payments/coupons/{code}` – fetch coupon metadata (permissions enforced by role).
- `POST /api/payments/webhooks/stripe` – ingest Stripe events (requires raw body middleware) for intent/charge lifecycle updates.

All protected routes expect a `Bearer` access token issued via the authentication endpoints. Refresh tokens are returned for
secure storage on the client to support future token rotation flows.
