# Service Layer Updates

## Authentication Service
- Refresh tokens now rotate per request and are invalidated server-side upon logout to prevent replay attacks.
- Added device fingerprinting and risk scoring to flag suspicious login attempts for manual review.

## Course Service
- Implemented optimistic locking on course updates to prevent conflicting edits. Clients receive conflict responses with merge guidance.
- Added background job to recalculate course recommendations when new modules are published.

## Payments Service
- Rewrote payout pipeline with ledger reconciliation to ensure net amounts align with Stripe balances.
- Added webhook processing resilience using dead-letter queues and idempotency keys.

## Notification Service
- Supports multi-channel delivery (email, push, in-app) with user preference hierarchies. Documented fallback logic when channels fail.
- Rate-limited broadcast campaigns to avoid overwhelming users and infrastructure.

## Telemetry Service
- Ingests client telemetry via `/api/v1/telemetry/ingest`. Validates schema, rate limits per device, and redacts PII before storage.
- Export pipeline streams aggregated metrics to the data warehouse every 5 minutes.

## Testing & Validation
- ⚠️ `npm run test` – Suite currently fails on dashboard and integration invite scenarios. Service behaviours validated manually via targeted scripts and monitoring of canary environments while fixes are scheduled.
- ✅ Contract testing against partner sandbox verifies payout integration.
- ✅ Chaos testing simulated downstream outages to confirm circuit breakers trigger gracefully.
