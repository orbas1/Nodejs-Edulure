# Migration Updates – Version 1.00

- Added `20250301100000_domain_event_dispatch_queue.js` to provision a durable outbox table for domain event deliveries. The migration enforces foreign keys to `domain_events`, records lock metadata, and creates indexes on status, availability, and worker ownership for efficient polling.
- Added `20250301110000_feature_flag_tenant_states.js` to create the governance override table with enum-backed state values, composite uniqueness constraints, and timestamp columns for audit trails.
- Added `20250301113000_reporting_views.js` to publish MySQL reporting views powering cohort analytics, community engagement pulse, and revenue dashboards.
- Added `20250305113000_release_management.js` to create release checklist, run, and gate result tables with indexes on status, scheduling, and categories supporting the release orchestration APIs. 【F:backend-nodejs/migrations/20250305113000_release_management.js†L1-L96】
- Created `20250318121500_domain_event_dead_letters.js` to provision the `domain_event_dead_letters` table with foreign keys, retry metadata, JSON payload storage, and indices for operations dashboards while seeding a bootstrap row to validate provisioning scripts. 【F:backend-nodejs/migrations/20250318121500_domain_event_dead_letters.js†L1-L55】
