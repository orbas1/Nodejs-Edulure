# Database Evaluation

## Schema Changes
- Added `consent_preferences` JSONB column to `users` table with schema validation enforced via application layer and migration check constraints.
- Introduced `provider_experience` table linking to `providers` with timeline entries and metadata for endorsements.
- Added materialized view `mv_tenant_dashboard_summary` to aggregate analytics per tenant and role.

## Performance
- Indexes created for frequently queried fields (`consent_preferences->'marketing'`, `provider_experience.provider_id`, `dispatch_jobs.status`).
- Vacuum/analyze schedule updated to include new tables with off-peak windows to avoid contention.
- Query plans reviewed for new dashboards to ensure index usage and avoid full table scans.

## Data Quality
- Backfill scripts executed in staging to populate consent defaults and experience entries, validated via checksum reports.
- Referential integrity enforced with cascading deletes disabled to prevent accidental data loss; soft-delete patterns maintained.
- CDC (Change Data Capture) pipelines adjusted to replicate new tables to analytics warehouse.

## Security
- Row-level security policies updated to respect tenant isolation for newly introduced objects.
- Sensitive columns (e.g., certifications) encrypted using pgcrypto; access limited through least-privilege roles.
- Audit triggers ensure every update to profile-related tables emits events to `auditTrail` topic with user and tenant metadata.

## Maintenance
- Migration order documented and applied via Liquibase/Knex hybrid pipeline with automated rollback scripts.
- Database health dashboards updated with alerts for replication lag and materialized view refresh failures.

