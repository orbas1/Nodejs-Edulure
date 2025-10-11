# Events Changes

- Added domain event recording (`domain_events` table) for user registrations and community creation, enabling future analytics and moderation hooks.
- Introduced `content_asset_events` to capture view/download/progress actions with actor metadata for analytics dashboards and DRM enforcement.
- `content_audit_logs` now record lifecycle state changes (upload confirmed, processing completed, ingestion failures) to provide operational traceability.
- Extended domain auditing to capture login failures, lockouts (with remaining-attempt telemetry), verification issuance, and verification completion events for downstream security analytics.
