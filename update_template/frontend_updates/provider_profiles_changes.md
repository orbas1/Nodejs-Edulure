# Provider Profile Updates

## Profile Editor
- Streamlined form grouped into identity, credentials, compliance, and services sections with autosave.
- Integrated license verification service to validate certifications in real time and flag expirations.
- Added drag-and-drop media gallery with auto compression and AVIF output for optimized delivery.

## Service Portfolio
- Providers can curate featured services with pricing tiers, lead time, and availability rules.
- Testimonials widget now supports moderation workflow and displays aggregate ratings with contextual comments.
- Service categories align with backend taxonomy to ensure discoverability in the learner catalogue.

## Compliance & Security
- Mandatory upload of KYC documentation with encryption-at-rest indicators and audit logging.
- Consent toggles for marketing and analytics default to least privilege and persist to consent ledger.
- Profile change history accessible with diff viewer and rollback within 30 days.

## UX Improvements
- Responsive card layout adapts from 3-column desktop to single-column mobile while preserving hierarchy.
- Inline validation with error summaries at the top for assistive technology compatibility.
- Provide preview mode to inspect profile as learners would see it before publishing changes.

## Testing & Monitoring
- Unit tests cover validation schema (`providerProfile.schema.test.ts`).
- Visual regression snapshots maintained via Chromatic to ensure layout stability.
- Real user monitoring tracks profile save latency with 95th percentile under 900ms.

