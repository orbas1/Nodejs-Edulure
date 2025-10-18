# Database Change Log – Version 1.00

- Introduced a `domain_event_dispatch_queue` table supporting outbox semantics with retry tracking, lock ownership, and metadata columns to back the new automation pipeline.
- Added `feature_flag_tenant_states` to capture tenant-specific override state, variant selection, and audit metadata for the governance tooling while enforcing uniqueness per tenant/environment.
- Enhanced data governance tables by extending `data_retention_audit_logs` with status, mode, run identifiers, and duration metrics and by materialising the `vw_data_governance_retention_overview` view so retention telemetry is queryable for dashboards and alerts without bespoke SQL.
