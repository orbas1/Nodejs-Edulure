# Database Change Log – Version 1.50 Task 2

- Created `content_assets`, `asset_ingestion_jobs`, `asset_conversion_outputs`, `content_audit_logs`, `content_asset_events`, and `ebook_read_progress` tables via migration `20241020130000_content_assets.js`.
- Added indexes on asset status/type, ingestion job status, and content event occurrence timestamps to support analytics and worker efficiency.
- Extended existing migrations to ensure timestamps default to `CURRENT_TIMESTAMP` with update triggers for new content tables.
