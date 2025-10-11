# Module Changes

- Introduced `CommunityMemberModel`, `DomainEventModel`, and `UserSessionModel` to encapsulate new tables and transactional workflows. `UserSessionModel` now exposes rotation-aware helpers (find/revoke/touch/prune) and tracks `last_used_at`, `rotated_at`, and `revoked_by` metadata for auditing and cache invalidation.
- Updated `UserModel` and `CommunityModel` to use Knex query builders, alias snake_case columns, and support transactional contexts.
- Added content pipeline repositories (`ContentAssetModel`, `AssetIngestionJobModel`, `AssetConversionOutputModel`, `ContentAssetEventModel`, `ContentAuditLogModel`, `EbookProgressModel`) with pagination helpers, lifecycle transitions, and analytics aggregations.
