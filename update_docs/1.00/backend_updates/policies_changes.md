# Policies Changes

- Implemented platform-wide request throttling and stricter CORS policies; environment variables now drive the allow-list and rate-limit thresholds.
- Added strong password requirements for registration and JWT issuer/audience validation to align with enterprise security posture.
- Enforced DRM download throttling via `DRM_DOWNLOAD_LIMIT` and audit logging, ensuring ebook access policies comply with licensing agreements.
- Introduced account lockout governance and mandatory email verification policies, with hashed token storage and cooldown controls enforced at the API layer.
- Added per-user session concurrency limits, forced logout endpoints, and cached revocation so compromised tokens can be invalidated instantly in line with security governance.
