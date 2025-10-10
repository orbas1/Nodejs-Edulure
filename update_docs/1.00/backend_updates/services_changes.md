# Service Changes

- `AuthService` issues signed access tokens with issuer/audience claims, persists hashed refresh tokens in `user_sessions`, and records registration events for auditing.
- `CommunityService` orchestrates community creation with slug collision detection, automatic owner enrolment, metadata storage, and domain event emission.
- `UserService` proxies the new repository helpers, ensuring consistent pagination metadata.
- `StorageService` provides presigned upload/download helpers, direct buffer uploads, public URL builders, and object lifecycle utilities on top of the Cloudflare R2 client, and is now exported for isolated testing.
- `AssetService` manages content asset lifecycle (upload session creation, ingestion confirmation, analytics, DRM enforcement) while emitting audit logs and telemetry events.
- `AssetIngestionService` polls for pending jobs, integrates with CloudConvert, normalises EPUB manifests, and updates asset metadata/status with error handling.
