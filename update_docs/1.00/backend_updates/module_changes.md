# Module Changes

- Introduced `CommunityMemberModel`, `DomainEventModel`, and `UserSessionModel` to encapsulate new tables and transactional workflows.
- Updated `UserModel` and `CommunityModel` to use Knex query builders, alias snake_case columns, and support transactional contexts.
- Added content pipeline repositories (`ContentAssetModel`, `AssetIngestionJobModel`, `AssetConversionOutputModel`, `ContentAssetEventModel`, `ContentAuditLogModel`, `EbookProgressModel`) with pagination helpers, lifecycle transitions, and analytics aggregations.
