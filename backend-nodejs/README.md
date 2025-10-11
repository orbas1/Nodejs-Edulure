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
- `JWT_KEYSET` / `JWT_ACTIVE_KEY_ID` – base64 encoded JSON describing signing keys. Generate via `npm run security:rotate-jwt`. A legacy `JWT_SECRET` is still honoured for local environments.
- `JWT_REFRESH_SECRET` – 32+ character secret for refresh token HMAC hashing.
- `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` – database credentials. Set `DB_PROVISION_USER=true` only for local installs.
- `TOKEN_EXPIRY_MINUTES`, `REFRESH_TOKEN_EXPIRY_DAYS` – optional overrides for token lifetimes.
- `LOG_SERVICE_NAME`, `LOG_REDACTED_FIELDS` – customise log metadata and extend default secret/PII redaction.
- `TRACE_HEADER_NAME`, `TRACING_SAMPLE_RATE` – tune inbound trace propagation and sampling for distributed telemetry.
- `METRICS_ENABLED`, `METRICS_USERNAME`/`METRICS_PASSWORD` or `METRICS_BEARER_TOKEN`, `METRICS_ALLOWED_IPS` – secure Prometheus access for operations tooling.

`npm run db:install` provisions the schema (via Knex migrations) and seeds the database. Use `npm run migrate:latest`/`npm run
migrate:rollback` to manage schema changes in CI/CD. The asset ingestion worker is started alongside the HTTP server and relies on
CloudConvert for PowerPoint renditions and local EPUB parsing for ebook manifest generation.

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

- `R2_*` credentials – Cloudflare R2 account, access keys, and bucket names for uploads, private storage, and public CDN assets.
- `ASSET_PRESIGN_TTL_MINUTES` / `ASSET_DOWNLOAD_TTL_MINUTES` – expiry windows for presigned upload and download URLs.
- `CONTENT_MAX_UPLOAD_MB` – upload size limit enforced before presigning.
- `CLOUDCONVERT_API_KEY` – optional. Required for PowerPoint to PDF conversion and thumbnails.
- `DRM_DOWNLOAD_LIMIT` – throttles the number of ebook downloads per learner account.

When running locally without CloudConvert the ingestion worker will mark PowerPoint jobs as failed. Other formats (EPUB, PDF) are
processed entirely within the service and will continue to function.

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
- `GET /api/content/assets` – list content assets with pagination and filtering.
- `GET /api/content/assets/{assetId}` – fetch asset metadata, conversion outputs, and audit trail.
- `GET /api/content/assets/{assetId}/viewer-token` – issue DRM-protected download tokens.
- `POST /api/content/assets/{assetId}/events` – record download/view/progress analytics.
- `POST /api/content/assets/{assetId}/progress` & `GET /api/content/assets/{assetId}/progress` – ebook reader telemetry.
- `GET /api/content/assets/{assetId}/analytics` – instructor analytics dashboard dataset.

All protected routes expect a `Bearer` access token issued via the authentication endpoints. Refresh tokens are returned for
secure storage on the client to support future token rotation flows.
