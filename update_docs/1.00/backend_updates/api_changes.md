# API Changes

- All endpoints now return `{ success, message, data, meta }` envelopes; validation errors respond with HTTP 422 and descriptive arrays.
- Added `/api/docs` Swagger UI exposing the OpenAPI 3.0 specification used by web/mobile clients.
- `/health` now runs database health checks and returns a structured payload.
- Introduced `/api/content/assets` suite:
  - `POST /assets/upload-session` for presigned Cloudflare R2 uploads with payload validation and size enforcement.
  - `POST /assets/{assetId}/ingest` to confirm uploads, queue ingestion jobs, and transition lifecycle states.
  - `GET /assets`, `GET /assets/{assetId}`, and `GET /assets/{assetId}/analytics` for listing, detail, and analytics views.
  - `GET /assets/{assetId}/viewer-token` and `/progress` endpoints for DRM-protected viewer access and ebook telemetry.
- Exposed `/api/content/assets/{assetId}/events` for recording view/download/progress actions from clients.
- Updated `/api/auth/register` and `/api/auth/login` responses to surface verification metadata alongside the user object, tokens, and session envelope, aligning with the new OpenAPI definitions and returning structured error details for lockout thresholds.
- Added `/api/auth/verify-email` for token confirmation and `/api/auth/resend-verification`, `/api/auth/refresh`, `/api/auth/logout`, `/api/auth/logout-all` for throttled verification and session governance flows, all documented with validation, caching semantics, and error responses.
