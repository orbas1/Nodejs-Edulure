# Migration Updates

## New Migrations
- `20240812_add_course_publish_batches` – Creates batch table and links courses via `publish_batch_id`.
- `20240812_add_webhook_delivery_attempts` – Normalises webhook log storage with retry metadata.
- `20240812_add_payment_ledger_entries` – Adds ledger for payout reconciliation.

## Migration Safety
- Each migration includes reversible `down` scripts and guards to prevent accidental data truncation.
- Pre-deployment check ensures no long-running transactions before applying schema changes.
- Added migration linting verifying naming conventions and idempotency.

## Testing
- ✅ Applied migrations to local, staging, and QA environments.
- ✅ Automated migration diff job ensures production schema matches repository state.
