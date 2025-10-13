# Policies Changes

- Implemented platform-wide request throttling and stricter CORS policies; environment variables now drive the allow-list and rate-limit thresholds.
- Added strong password requirements for registration and JWT issuer/audience validation to align with enterprise security posture.
- Enforced DRM download throttling via `DRM_DOWNLOAD_LIMIT` and audit logging, ensuring ebook access policies comply with licensing agreements.
- Introduced account lockout governance and mandatory email verification policies, with hashed token storage and cooldown controls enforced at the API layer.
- Added per-user session concurrency limits, forced logout endpoints, and cached revocation so compromised tokens can be invalidated instantly in line with security governance.
- Established retention governance through policy-driven tables, audit logging, and both CLI and cron-backed enforcement so security/legal teams can prove deletion SLAs across sessions, telemetry, and dormant communities even during unattended operation.
- Established feature flag governance with database-backed definitions, environment scopes, and runtime configuration payloads surfaced via `/api/runtime` so staged rollouts and kill switches are centrally enforced.
- Feature flag environment scopes now treat test deployments as development aliases, ensuring QA environments respect rollout policies while keeping production gating intact.
- Introduced malware scanning and quarantine policies: uploads must pass ClamAV inspection, infected artefacts are isolated in a dedicated bucket, and audit/event logs capture detections for compliance review.
- Added chat moderation and presence retention policies: moderation actions (hide/delete/restore) write immutable audit rows, reactions enforce uniqueness per user/emoji, read acknowledgements cap stored history, and presence sessions expire automatically based on TTL defaults configurable via environment variables.
- Established identity verification governance: learners and instructors must complete the KYC checklist (government ID front/back + selfie) before payouts, uploads are size-limited with checksum validation, submissions require all documents, admin reviewers record risk scores/escalation levels/policy references, and audit logs persist reviewer actions to satisfy regulatory oversight and downstream reporting obligations.
