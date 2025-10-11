# Migration Updates

- Added `backend-nodejs/migrations/20241020130000_content_assets.js` to create content asset lifecycle tables with cascade rules and indexes.
- Migration includes safeguards to create tables conditionally (`hasTable`) to support incremental adoption and idempotent deployments.
- Added `backend-nodejs/migrations/20241105153000_data_hygiene.js` introducing retention policy/audit tables, owner membership triggers, and soft-delete support with `DROP TRIGGER IF EXISTS` guards for repeatable deployments.
- Added `backend-nodejs/migrations/20241107101500_feature_flags_and_runtime_config.js` establishing feature flag, audit, and configuration tables with seed data for staged rollouts.
