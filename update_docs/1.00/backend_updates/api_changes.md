# API Changes

- All endpoints now return `{ success, message, data, meta }` envelopes; validation errors respond with HTTP 422 and descriptive arrays.
- Added `/api/docs` Swagger UI exposing the OpenAPI 3.0 specification used by web/mobile clients.
- `/health` now runs database health checks and returns a structured payload.
- Introduced `/api/content/assets` suite:
  - `POST /assets/upload-session` for presigned Cloudflare R2 uploads with payload validation and size enforcement.
  - `POST /assets/{assetId}/ingest` to confirm uploads, stream files through antivirus scanning, quarantine infected artefacts, queue ingestion jobs, and transition lifecycle states.
  - `GET /assets`, `GET /assets/{assetId}`, and `GET /assets/{assetId}/analytics` for listing, detail, and analytics views.
  - `GET /assets/{assetId}/viewer-token` and `/progress` endpoints for DRM-protected viewer access and ebook telemetry.
- Exposed `/api/content/assets/{assetId}/events` for recording view/download/progress actions from clients.
- Updated `/api/auth/register` and `/api/auth/login` responses to surface verification metadata alongside the user object, tokens, and session envelope, aligning with the new OpenAPI definitions and returning structured error details for lockout thresholds.
- Added `/api/auth/verify-email` for token confirmation and `/api/auth/resend-verification`, `/api/auth/refresh`, `/api/auth/logout`, `/api/auth/logout-all` for throttled verification and session governance flows, all documented with validation, caching semantics, and error responses.
- Expanded the OpenAPI specification with `/api/courses` endpoints covering course CRUD, module/lesson/assignment management, enrollment, and progress tracking; new schemas (`Course`, `CourseModule`, `CourseLesson`, `CourseAssignment`, `CourseProgress*`) document drip metadata, progress states, and assignment grading contracts.
- Added `/api/ebooks` endpoints detailing ebook listing/detail, creation/update/publish, chapter CRUD + reorder, highlight/bookmark APIs, reader settings, and DRM download issuance; new schemas (`Ebook*`) capture manifest metadata, chapter stats, reader preferences, and download limits to keep web/mobile clients aligned with the upgraded backend.
- Documented `/api/tutors` endpoints covering tutor profile CRUD, availability slot publishing, booking creation/cancellation, booking summary analytics, and payout preparation hints; schemas define availability windows, hourly rates, booking states, and tutor engagement metrics.
- Added `/api/live-classrooms` endpoints for classroom scheduling, registration (free/paid), attendee roster management, join context issuance (Agora tokens + CDN ingest URLs), chat session retrieval, and post-session analytics; schemas define seat limits, invite codes, pricing, chat transcripts, and join payloads for frontend/mobile parity.
- Added `/api/payments` endpoints for intent creation, PayPal capture, refund issuance, finance summaries, coupon lookups, and Stripe webhook ingestion with new schemas for payment line items, intent records, refund requests, coupons, and finance summary entries.
- Expanded `/api/communities` engagement surface with `/engagement/progress`, `/engagement/points`, `/engagement/streaks/check-in`, `/engagement/leaderboard`, event listing/creation, RSVP, reminder scheduling, and calendar endpoints documented in OpenAPI so web, mobile, and ops clients can drive streaks, tier progression, and automated reminders.
