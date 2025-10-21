# Policy & Governance Updates

## Access Control Policies
- **Role Definitions** – Clarified permissions for Learner, Instructor, Admin, and System-Service roles. Each policy now lists permitted API groups, rate limits, and data access boundaries.
- **Scoped Admin Actions** – Admins must provide tenant-specific justification when invoking elevated endpoints. Requests are logged with ticket references to maintain compliance.
- **Service Tokens** – Service-to-service tokens now include least-privilege scopes (read:analytics, write:payments). Tokens rotate every 24 hours with automatic revocation on compromise detection.

## Data Retention & Privacy
- Updated GDPR/CCPA deletion pipeline to propagate erasure requests across cache, search index, and analytics warehouse within 24 hours.
- Documented retention timelines: transactional data 7 years, learning activity data 3 years, telemetry 90 days. Added automated reminders for legal review.
- Masked personal data in lower environments via anonymisation scripts triggered during database refresh.

## Audit & Compliance
- Weekly access review checklist ensures only authorised staff retain admin permissions. The report is attached to the compliance tracker.
- Added audit log parity tests verifying sensitive actions (RBAC changes, payouts, integration toggles) are captured with actor, timestamp, and reason codes.
- SOC2 evidence folder updated with proof of change management, testing, and deployment approvals for this release.

## Security Controls
- Mandatory MFA for all admin accounts enforced via identity provider integration. Documented fallback procedures for break-glass accounts.
- Described encryption standards: TLS 1.2+ for transport, AES-256-GCM for data at rest, hashed secrets using Argon2id.
- Provided checklist for secret rotation (Stripe, Twilio, SendGrid) with automation runbooks.

## Change Management Process
- Release approvals require successful completion of automated test suites, peer review, and product sign-off recorded in the change log.
- Back-out plan defined for each high-risk change with estimated recovery times.
- Stakeholder communication templates prepared for customer success, marketing, and legal teams.
