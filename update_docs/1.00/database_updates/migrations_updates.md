# Migration Updates – Version 1.00

- Added `20250301100000_domain_event_dispatch_queue.js` to provision a durable outbox table for domain event deliveries. The migration enforces foreign keys to `domain_events`, records lock metadata, and creates indexes on status, availability, and worker ownership for efficient polling.
- Added `20250301110000_feature_flag_tenant_states.js` to create the governance override table with enum-backed state values, composite uniqueness constraints, and timestamp columns for audit trails.
- Added `20250305100000_data_governance_reporting.js` to enrich `data_retention_audit_logs` with execution metadata, seed default values for legacy rows, and create the `vw_data_governance_retention_overview` reporting view that powers retention dashboards and SLA monitoring.
