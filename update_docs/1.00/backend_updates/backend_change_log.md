# Backend Change Log – Version 1.00

- Hardened the event outbox by pairing `DomainEventModel` with a dedicated dispatch queue, worker integration, and resilience controls (retry, jitter, recovery) to meet SLA expectations for automation flows promised in 1.00.
- Delivered a tenant-aware feature flag governance stack with manifest-driven defaults, bootstrap synchronisation, and admin tooling so operators can evaluate, audit, and override capabilities without engineering interventions.
- Introduced production-grade third-party integration wrappers covering Stripe, PayPal, CloudConvert, and Twilio with sandbox credential routing, Redis-backed circuit breakers, retry/backoff orchestration, webhook idempotency storage, and operational metrics to harden partner workflows.
- Centralised compliance telemetry by introducing an audit event service that encrypts IP evidence, enforces metadata retention budgets, and exposes a single interface for background jobs and controllers to emit SOC2-ready trails.
- Extended the compliance analytics surface with attestation roll-ups, archive discovery, and risk heatmap generation powering the operator dashboard’s compliance snapshot, ensuring policy, incident, and evidence metrics stay in sync across tenants.
- Finalised the instructor dashboard workspace API by layering course, cohort, assignment, authoring, and learner aggregation
  logic behind lazily-imported course models, ensuring `DashboardService.getDashboardForUser` returns a full `coursesWorkspace`
  envelope without incurring database overhead for instructors that have not yet launched a programme.
