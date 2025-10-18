# Version 1.00 Update Change Log

## Documentation & Evaluation Additions
- Established the Version 1.00 update documentation workspace derived from the base template so the team can track change requests, testing, and rollout tasks in a consistent format.
- Authored deeply critical pre-update evaluations for backend, database, dependency, front-end, and learner mobile app surfaces to surface high-risk gaps across functionality, usability, error handling, integration, security, and roadmap alignment.
- Added a provider operations app evaluation to capture regressions that remain after retiring the legacy mobile experience and to ensure any successor tooling is reviewed before reintroduction.
- Expanded every pre-update evaluation with additional findings covering operational readiness, performance, observability, compliance, and roadmap alignment gaps uncovered during the second review pass.
- Documented cross-cutting risks such as missing runbooks, absent automation, and marketing misalignments so leadership can prioritise remediation before approving the 1.00 rollout.
- Conducted a fourth evaluation sweep to catalogue advanced operational, integration, and security deficiencies (e.g., LMS connector persistence gaps, unencrypted provider exports, mobile token storage issues) ensuring leadership has granular remediation items before sign-off.

## Removals & Scope Decisions
- Confirmed that all provider phone app assets remain deprecated for this cycle; no resurrection tasks are scheduled until a new business case is approved, preventing scope creep.
- Completed the fifth evaluation sweep incorporating full-stack static and dynamic scans, dependency audits, and mobile build readiness checks; recorded the expanded backend, database, dependency, frontend, provider, and learner findings in the evaluation dossiers.
- Initiated build and test verification runs (backend unit suite, frontend production bundle) to validate the documentation against actual project health, capturing failures for engineering follow-up.

## Backend Stabilisation
- Implemented a production-grade domain event dispatch pipeline powered by a persistent queue, exponential backoff, jitter, and Prometheus metrics so domain events now flow reliably to webhook subscribers instead of remaining passive audit rows.
- Registered the dispatcher with the worker service readiness probes to ensure background automation boots alongside existing schedulers and surfaces health in probes and logs.
- Hardened the domain event model with JSON normalisation, transaction-aware dispatch enqueueing, and backward-compatible options so existing services transparently gain outbox support.
- Delivered manifest-driven feature flag governance with bootstrap synchronisation, tenant override storage, and admin APIs so operators can activate capabilities safely across tenants without database changes or engineer intervention.
- Wrapped Stripe, PayPal, CloudConvert, and Twilio integrations with sandbox-aware gateways, Redis-backed circuit breakers, idempotent webhook receipts, and retry/backoff orchestration while updating payment flows and community reminders to consume the new abstractions.

## Data & Infrastructure Updates
- Added a managed migration that creates the `domain_event_dispatch_queue` table with status tracking, lock metadata, and retry scheduling to persist event delivery state across restarts.
- Extended configuration surfaces (.env, runtime loader, and test harness) with tunable dispatcher controls (batch sizing, backoff, recovery intervals) while documenting defaults in the update notes.
- Created the `feature_flag_tenant_states` table and manifest catalogue, wiring bootstrap automation to keep flag definitions aligned with documentation and audit overrides per tenant/environment.

## Quality Assurance
- Authored automated unit coverage for the dispatcher service validating success, retry, and acknowledgement paths, and executed the Vitest target suite to guarantee deterministic behaviour for the new pipeline.
- Added coverage for tenant override evaluation and governance sync workflows, exercising the new manifest automation and admin endpoints through Vitest to prevent regressions.
