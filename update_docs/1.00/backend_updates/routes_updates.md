# Routes Updates

- Added `GET /api/docs` Swagger UI and enhanced `GET /health` to perform database checks.
- Updated user and community routes to enforce role hierarchy via the hardened auth middleware.
- Registered `/api/content` router exposing upload sessions, ingestion confirmation, listing/detail, viewer token, analytics, events, and progress endpoints guarded by auth roles.
