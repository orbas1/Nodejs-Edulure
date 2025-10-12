# Database Change Log – Version 1.50 Task 2

- Created `content_assets`, `asset_ingestion_jobs`, `asset_conversion_outputs`, `content_audit_logs`, `content_asset_events`, and `ebook_read_progress` tables via migration `20241020130000_content_assets.js`.
- Added indexes on asset status/type, ingestion job status, and content event occurrence timestamps to support analytics and worker efficiency.
- Extended existing migrations to ensure timestamps default to `CURRENT_TIMESTAMP` with update triggers for new content tables.
- Added data hygiene migration `20241105153000_data_hygiene.js` introducing `data_retention_policies`, `data_retention_audit_logs`, soft-delete columns, and community owner membership triggers aligned with compliance requirements.
- Provisioned feature flag, feature flag audit, and configuration tables to support runtime governance with environment-scoped entries and seed data.
- Introduced course domain schema additions (`courses`, `course_modules`, `course_lessons`, `course_assignments`, `course_enrollments`, `course_progress`) with indexes for release ordering, prerequisites, and progress tracking to enable the course drip engine.
- Added ebook domain migration `20241115131500_ebook_experience_upgrade.js` creating `ebooks`, `ebook_chapters`, `ebook_highlights`, `ebook_bookmarks`, `ebook_reader_settings`, and `ebook_watermark_events` tables with indexes on authors/status and download audit metadata to power the new ebook authoring, telemetry, and DRM workflows.
- Introduced live learning migration `20241118103000_live_classroom_and_tutor_hire.js` creating tutor profile/availability/booking tables plus live classroom, registration, and chat session tables with seat limit indexes, availability conflict constraints, and soft-delete metadata to support scheduling, bookings, and compliance tracking.
- Added ads intelligence migration `20241119150000_ads_intelligence.js` provisioning campaign, creative, placement, segment audience, budget pacing, and performance metric tables with daily/hourly aggregates powering explorer ads targeting and reporting pipelines.
