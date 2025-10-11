# Routes Updates

- Added `GET /api/docs` Swagger UI and enhanced `GET /health` to perform database checks.
- Updated user and community routes to enforce role hierarchy via the hardened auth middleware.
- Registered `/api/content` router exposing upload sessions, ingestion confirmation, listing/detail, viewer token, analytics, events, and progress endpoints guarded by auth roles.
- Extended `/api/auth` router with `/verify-email` and `/resend-verification` endpoints powering the new verification flow.
- Registered `GET /metrics` as a Prometheus scrape endpoint guarded by bearer/basic credentials and IP allow-lists for the operations team.
