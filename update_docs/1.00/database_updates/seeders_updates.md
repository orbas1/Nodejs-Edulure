# Seeder Updates – Version 1.00

- Hardened `001_bootstrap` to clear and repopulate `feature_flag_tenant_states`, inserting production-like overrides for internal, learning, and creator tenants with explicit rollout notes and guardrails.
- Seeded `domain_event_dispatch_queue` with representative pending, delivering, delivered, and failed entries to exercise the new outbox pipeline and smoke the DLQ monitoring dashboards.
- Added integrity assertions to the bootstrap transaction to fail fast when tenant overrides or dispatch queue rows are not created, preventing partially seeded environments.
