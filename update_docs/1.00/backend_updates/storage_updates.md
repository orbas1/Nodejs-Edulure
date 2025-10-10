# Storage Updates

- Knex migration creates/enhances `users`, `communities`, `community_members`, `domain_events`, and `user_sessions` tables with role/status enums and audit fields.
- Transactional community creation ensures owners are always enrolled and activity events recorded, preventing orphaned data.
- New migration `20241020130000_content_assets.js` provisions `content_assets`, `asset_ingestion_jobs`, `asset_conversion_outputs`, `content_audit_logs`, `content_asset_events`, and `ebook_read_progress` tables with cascading relationships and indexes.
- `ContentAssetModel` exposes lifecycle transitions (`markStatus`, ingestion metadata) backed by audit/event logging to maintain state integrity.
