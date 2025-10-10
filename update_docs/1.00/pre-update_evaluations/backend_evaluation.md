# Backend Evaluation (v1.50 Pre-Update)

## Functionality
- The Express API currently exposes only authentication (`/api/auth`), user profile (`/api/users`), and community membership (`/api/communities`) routes, leaving key platform capabilities such as feed content, search, lesson management, notifications, and admin workflows unimplemented. The front-end and mobile clients expect these surfaces, so the backend cannot yet drive the experiences shipped in the UI. 
- Role-based workflows are incomplete: there is no instructor onboarding pipeline, no moderation endpoints, and no administrative approval queues even though they are surfaced in other clients. Community ownership also does not automatically create a membership record, meaning newly created communities will not show up in `listByUser` without a manual insert.
- There is no support for pagination metadata on list endpoints beyond raw limit/offset, and there is no filtering, sorting, or search facility. `/api/communities` for example cannot scope by role or status, limiting usefulness for dashboards.

## Usability
- Response envelopes are inconsistent (`register`/`login` return `{ token, user }`, `/api/users` returns `{ data, pagination }`, `/api/communities` returns `{ data }`, `/health` returns `{ status, timestamp }`), which complicates client abstractions and error handling. Standardising envelopes or introducing a HAL/JSON:API-style contract would simplify integrations.
- Request validation is only present for auth and community creation via Joi. Other inputs (query parameters for pagination, IDs in path segments, etc.) are not validated or sanitised, increasing the likelihood of runtime errors or SQL misuse.
- There is no OpenAPI/Swagger description or Postman collection, so consumers must reverse engineer payloads from code. Additionally, environment-specific configuration (CORS origins, DB credentials) is only documented implicitly in `.env` usage, not in developer docs.

## Errors
- The global error handler logs and responds with `err.message`, but it does not mask internal messages in production, risks leaking stack hints, and drops stack traces (logged but not persisted). It also returns 500 for database connectivity issues without retrying the pool.
- Auth middleware assumes `Authorization` headers are of the form `Bearer <token>`; malformed headers lead to a generic "Invalid token" response with no logging, hampering diagnosis. Missing or expired JWT secrets cause unhandled exceptions because there is no startup validation for critical environment variables.
- The CORS configuration defaults to `'*'` while `credentials: true` is enabled. This is rejected by browsers and results in confusing preflight failures that are hard to trace for consumers.

## Integration
- There is no service layer integration beyond direct SQL queries via `mysql2`. Domain services do not orchestrate cross-aggregate operations (e.g., creating a community does not enrol the creator, no emails or notifications are triggered). This limits alignment with growth/engagement goals mentioned in product narratives.
- The backend does not expose or consume any external services (search, payments, real-time updates) despite UI references to Meilisearch, live sessions, and analytics. Stubs or adapters should be introduced so clients can be wired without large refactors later.
- Front-end React components and Flutter screens currently depend on static mock data. Without REST hooks, any change to payload shape risks breaking clients unnoticed because there are no contract tests or shared DTOs.

## Security
- Sensitive defaults are insecure: the database installer creates a globally accessible `edulure_user` with a hard-coded password, and JWT signing relies on `process.env.JWT_SECRET` without fallback or length validation. There is no rate limiting, IP throttling, or account lockout to mitigate brute-force attacks.
- Password policies are minimal (only `min(8)`), there is no email verification, and refresh tokens/session invalidation are absent. Compromised credentials remain valid until JWT expiry, with no ability to revoke tokens or enforce password rotation.
- Role checks are fragile; `auth('instructor')` blocks admins even though they should inherit instructor privileges. There is no audit logging for critical actions, and error responses reveal whether an email exists (409 on register) which can aid enumeration.

## Alignment
- Platform positioning in the UI promises community feeds, search, analytics, and admin control centres, but the backend surface covers only foundational auth/community CRUD. The update should focus on delivering APIs that unlock the advertised experiences.
- Observability and reliability standards implied by enterprise positioning (health checks, structured logging) start to exist (`/health`, `pino` logger) but are not extended to metrics, tracing, or structured audit logs.
- Compliance considerations (GDPR deletion, consent tracking, privacy controls) are not represented in schema or services, which diverges from the "global community" messaging and could block launches in regulated markets.
