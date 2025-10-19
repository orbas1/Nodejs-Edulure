# Database Change Log – Version 1.00

- Introduced a `domain_event_dispatch_queue` table supporting outbox semantics with retry tracking, lock ownership, and metadata columns to back the new automation pipeline.
- Added `feature_flag_tenant_states` to capture tenant-specific override state, variant selection, and audit metadata for the governance tooling while enforcing uniqueness per tenant/environment.
- Created reporting views (`reporting_course_enrollment_daily`, `reporting_community_engagement_daily`, `reporting_payments_revenue_daily`) to supply consistent analytics feeds for the operator dashboards and finance reconciliation tools.
- Published a schema governance baseline (`database/schema/mysql-governance-baseline.json`) consumed by the new schema guard to detect drift during CI and scheduled retention jobs.
- Added the `domain_event_dead_letters` table to persist terminal domain event failures with retry metadata, payload snapshots, and audit timestamps so SRE teams can triage and replay failed automations. 【F:backend-nodejs/migrations/20250318121500_domain_event_dead_letters.js†L1-L55】
