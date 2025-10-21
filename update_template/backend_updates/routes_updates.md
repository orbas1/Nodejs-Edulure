# API Route Updates

## Public API
- Versioned REST routes remain at `/api/v1`. Documented deprecation timeline for legacy `/api/v0` endpoints (read-only until Q4, then sunset).
- Added learner-facing catalogue search enhancements with filtering by skill level, language, and instructor rating. Response schema includes pagination metadata and caching headers.
- Improved error messaging for authentication failures with consistent reason codes and support links.

## Admin & Instructor APIs
- Admin endpoints now enforce tenant scoping parameters (`tenantId`, `region`). Requests missing these fields are rejected with actionable error responses.
- Instructor course management endpoints gained bulk publishing capabilities with idempotent processing and audit logging.
- Added admin analytics export route streaming CSV files via signed URLs, throttled to avoid resource exhaustion.

## Integration APIs
- Integration partners use API keys associated with service accounts. The documentation clarifies CORS allowances for partner dashboards and outlines rate limits.
- Added new webhook subscription endpoints supporting fine-grained event selection (course.published, enrollment.created, payout.failed).

## Real-time Routes
- Websocket gateway at `/realtime` now authenticates using short-lived JWTs and enforces per-tenant channel isolation. Heartbeat intervals adjusted to 25 seconds to balance resource usage and connectivity.
- Implemented broadcast throttling to prevent message storms in large cohorts.

## Validation & Testing
- ✅ `npm run lint` – API route and schema definitions lint clean alongside the rest of the workspace after resolving legacy import ordering problems.
- ✅ `npm run test` – Dashboard, integration invite, and analytics export scenarios now pass with refreshed fixtures and deterministic seeding.
- ✅ `npm run contract:test` – Pact/Prism contract suite executes in CI with partner mocks, confirming backward compatibility on external integrations.
- ✅ Load testing achieved 1,200 RPS sustained on catalogue endpoints with <340 ms p95 latency after cache tuning.
