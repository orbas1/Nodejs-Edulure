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
- `JWT_SECRET` / `JWT_REFRESH_SECRET` – 32+ character secrets used to sign access and refresh tokens.
- `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` – database credentials. Set `DB_PROVISION_USER=true` only for local installs.
- `TOKEN_EXPIRY_MINUTES`, `REFRESH_TOKEN_EXPIRY_DAYS` – optional overrides for token lifetimes.

`npm run db:install` provisions the schema (via Knex migrations) and seeds the database. Use `npm run migrate:latest`/`npm run
migrate:rollback` to manage schema changes in CI/CD. The asset ingestion worker is started alongside the HTTP server and relies on
CloudConvert for PowerPoint renditions and local EPUB parsing for ebook manifest generation.

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
