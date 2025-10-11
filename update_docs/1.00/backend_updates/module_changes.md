# Module Changes

- Introduced `CommunityMemberModel`, `DomainEventModel`, and `UserSessionModel` to encapsulate new tables and transactional workflows. `UserSessionModel` now exposes rotation-aware helpers (find/revoke/touch/prune), tracks `last_used_at`, `rotated_at`, `revoked_by`, and respects `deleted_at` filtering so API queries align with retention sweeps.
- Updated `UserModel` and `CommunityModel` to use Knex query builders, alias snake_case columns, and support transactional contexts.
- Added content pipeline repositories (`ContentAssetModel`, `AssetIngestionJobModel`, `AssetConversionOutputModel`, `ContentAssetEventModel`, `ContentAuditLogModel`, `EbookProgressModel`) with pagination helpers, lifecycle transitions, and analytics aggregations.
