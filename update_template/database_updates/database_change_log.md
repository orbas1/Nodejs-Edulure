# Database Change Log

## Summary
- Applied migration batch `2024_08_12` adding support for instructor bulk publishing metadata and audit tables.
- Introduced new tables for webhook retries and payment ledger reconciliation.

## Schema Changes
- `courses` – Added `version` (int) for optimistic locking, `publish_batch_id` (uuid) for grouped releases.
- `course_publish_batches` – Tracks status, initiator, scheduled time, and completion metrics.
- `webhook_delivery_attempts` – Stores request/response payloads, status codes, retry counters.
- `payment_ledger_entries` – Normalised record capturing Stripe balance transactions, payout references, and reconciliation status.

## Indexes
- Added composite indexes on `course_publish_batches (tenant_id, status, scheduled_at)` and `webhook_delivery_attempts (event_type, status)` to improve query performance.
- Created partial index on `payment_ledger_entries` for entries with `reconciliation_status = 'pending'` to accelerate monitoring jobs.

## Data Migrations
- Backfilled existing courses with default `version = 1` and `publish_batch_id = NULL`.
- Migrated legacy webhook logs into the new structure, preserving audit trails.

## Rollback Plan
- Provide down migrations removing new columns/tables while retaining backup snapshots prior to deployment.
- Ensure rollback also purges feature flag enabling bulk publishing to avoid inconsistent application behaviour.

## Validation
- ✅ `npm run db:migrate` executed in staging.
- ✅ `npm run db:validate` ensures migration ordering and checksum integrity.
- ✅ Load tests confirmed query performance remained within SLO.
