# Storage Updates

## Database
- Applied connection pool tuning (max 60, min 10, idle timeout 5s) aligned with load test data.
- Added read replica for analytics workloads; documented routing strategy and failover plan.

## Object Storage
- Enabled S3 versioning and lifecycle policies (30-day transition to infrequent access, 180-day archive).
- Configured bucket policies enforcing TLS, signed URLs, and per-tenant prefixes.

## Cache Layer
- Redis clusters upgraded to enhanced I/O profile with encryption in transit enabled.
- Implemented cache invalidation events triggered by course publishing and enrollment changes.

## Backups & Recovery
- Documented daily snapshot schedule for PostgreSQL and S3, with restore drills performed quarterly.
- Added automated verification ensuring backups are encrypted and stored cross-region.
