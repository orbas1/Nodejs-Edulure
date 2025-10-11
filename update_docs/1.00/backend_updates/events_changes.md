# Events Changes

- Added domain event recording (`domain_events` table) for user registrations and community creation, enabling future analytics and moderation hooks.
- Introduced `content_asset_events` to capture view/download/progress actions with actor metadata for analytics dashboards and DRM enforcement.
- `content_audit_logs` now record lifecycle state changes (upload confirmed, processing completed, ingestion failures) to provide operational traceability.
- Extended domain auditing to capture login failures, lockouts (with remaining-attempt telemetry), verification issuance, verification completion, session rotation (`user.session_rotated`), and logout events (`user.session_revoked`, `user.sessions_revoked`) for downstream security analytics.
- Added `data_retention_audit_logs` to persist per-policy enforcement metadata (rows affected, sample IDs, dry-run flags) so governance teams can evidence deletion SLAs.
- Course lifecycle emits domain events (`course.created`, `course.updated`, `course.module.*`, `course.lesson.*`, `course.assignment.*`, `course.progress.updated`, `course.enrollment.updated`) to keep auditing, analytics, and notification pipelines aligned with authoring actions.
- Added `ebook_watermark_events` to persist every DRM download issuance with device/IP metadata so support and compliance teams can audit download limits, while Prometheus counters expose download/highlight/bookmark/reader-preference activity for observability dashboards.
- Tutor and live classroom domains emit lifecycle events: `tutor.profile.created/updated`, `tutor.availability.published`, `tutor.booking.requested/confirmed/cancelled`, `live_classroom.scheduled`, `live_classroom.registration.created/cancelled`, `live_classroom.session.started/ended`, and `live_classroom.chat.message_logged` to power notifications, billing hooks, seat utilisation analytics, and compliance logging.
