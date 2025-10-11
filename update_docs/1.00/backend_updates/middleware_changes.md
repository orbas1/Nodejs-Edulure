# Middleware Changes

- Added global rate limiting, HPP protection, strict CORS handling, compression, and structured request logging in `src/app.js`.
- `auth` middleware now validates JWT issuer/audience, honours key identifiers via the shared key store, normalises `req.user.id`, and enforces role hierarchy rather than exact matches.
- The global error handler masks internal messages in production while preserving stack traces in non-production environments, and logs structured error context via Pino.
- Added `requestContext` middleware to propagate correlation IDs, plus an HTTP metrics collector feeding Prometheus histograms with auth/IP gating on `GET /metrics`.
