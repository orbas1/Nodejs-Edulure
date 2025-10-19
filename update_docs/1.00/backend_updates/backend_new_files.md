# New Backend Files – Version 1.00

- `migrations/20250301100000_domain_event_dispatch_queue.js` — creates the domain event dispatch queue table with indexes, locking metadata, and timestamps.
- `src/models/DomainEventDispatchModel.js` — data access layer for the dispatch queue handling claims, acknowledgements, retries, and recovery scanning.
- `src/services/DomainEventDispatcherService.js` — background worker that publishes domain events to webhooks with instrumentation and backoff management.
- `test/domainEventDispatcherService.test.js` — Vitest coverage verifying success, retry, and acknowledgement behaviour of the dispatcher.
- `migrations/20250301110000_feature_flag_tenant_states.js` — provisions tenant override storage with audit-friendly metadata and indexes for manifest-governed feature flags.
- `src/config/featureFlagManifest.js` — central catalogue of feature flag definitions, rollout strategies, and default tenant overrides consumed by bootstrap automation and operator tooling.
- `src/services/FeatureFlagGovernanceService.js` — orchestrates manifest synchronisation, tenant overrides, auditing, and snapshot generation while coordinating with the runtime cache.
- `src/controllers/AdminFeatureFlagController.js` — exposes admin APIs for synchronising manifest definitions and managing tenant-specific overrides with validation and audit logging.
- `scripts/manage-feature-flags.js` — CLI utility for operations teams to sync manifests, inspect tenant snapshots, and apply overrides outside the web console.
- `test/featureFlagServiceOverrides.test.js` — regression coverage ensuring the runtime evaluator honours tenant overrides and wildcard rules.
- `test/featureFlagGovernanceService.test.js` — service-level unit coverage validating manifest sync plans, override application, and tenant snapshot output.
- `migrations/20250301120000_integration_webhook_receipts.js` — creates the integration webhook receipt ledger used for webhook idempotency and processing telemetry across partner providers.
- `src/models/IntegrationWebhookReceiptModel.js` — persistence layer for webhook receipt deduplication, status tracking, and pruning.
- `src/services/IntegrationWebhookReceiptService.js` — helper for hashing payloads, recording receipt metadata, and marking webhook outcomes.
- `src/services/IntegrationProviderService.js` — centralised factory that provisions Stripe, PayPal, CloudConvert, and Twilio clients with circuit breakers, retries, and sandbox routing.
- `src/integrations/IntegrationCircuitBreaker.js` — Redis-aware circuit breaker utility shared by integration gateways to enforce graceful degradation.
- `src/integrations/StripeGateway.js` — resilient Stripe wrapper providing retry/backoff, webhook verification, and idempotent refund helpers.
- `src/integrations/PayPalGateway.js` — PayPal Orders/Payments abstraction instrumented with retries and circuit breaker guards.
- `src/integrations/CloudConvertClient.js` — wrapped CloudConvert SDK with sandbox routing, retries, and circuit breaker coordination for asset ingestion.
- `src/integrations/TwilioMessagingClient.js` — Twilio messaging client with sandbox sender controls, retry handling, and circuit breaker integration.
- `test/integrations/stripeGateway.test.js` — Vitest coverage for the Stripe gateway retry, duplication, and receipt processing behaviour.
- `src/services/AuditEventService.js` — centralised compliance logger encapsulating encrypted IP capture, metadata redaction, and request-context enrichment for audit trails.
- `test/auditEventService.test.js` — focused Vitest coverage validating the audit service encryption, enrichment, and truncation policies.
- `src/models/CourseModel.js` — instructor-facing data access layer that normalises catalogue metadata, language arrays, and date
  attributes for the course workspace payload.
- `src/models/CourseModuleModel.js` — module repository exposing ordered module retrieval with metadata parsing to support cohort
  pipeline generation.
- `src/models/CourseLessonModel.js` — lesson data mapper converting release timestamps and metadata for learner pacing analytics.
- `src/models/CourseAssignmentModel.js` — assignment gateway exposing due date offsets, rubric metadata, and automation flags.
- `src/models/CourseEnrollmentModel.js` — enrollment model providing cohort segmentation and learner status context for risk scoring.
- `src/models/CourseProgressModel.js` — lesson progress aggregator fuelling learner risk detection and pacing metrics within the
  dashboard workspace.
- `src/observability/sloRegistry.js` — maintains rolling SLO state, burn-rate calculations, and latency samples for HTTP routes.
- `src/controllers/ObservabilityController.js` — admin controller exposing SLO snapshot list/detail endpoints with logging.
- `src/routes/observability.routes.js` — wires observability endpoints into the versioned API registry behind admin auth.
- `test/observabilitySloRegistry.test.js` — validates SLO aggregation logic, burn-rate calculations, and latency summaries.
- `test/observabilityHttpRoutes.test.js` — exercises the observability HTTP endpoints for access control and payload structure.
- `test/observabilityContracts.test.js` — Ajv-powered contract tests that assert runtime responses match the OpenAPI schema.
- `src/services/EnvironmentParityService.js` — assembles environment parity reports by hashing Terraform/Docker artefacts and executing dependency probes for the `/environment/health` surface. 【F:backend-nodejs/src/services/EnvironmentParityService.js†L1-L217】
- `src/controllers/EnvironmentParityController.js` — minimal controller that maps parity service responses onto HTTP semantics. 【F:backend-nodejs/src/controllers/EnvironmentParityController.js†L1-L13】
- `src/routes/environmentParity.routes.js` — Express router exposing the new admin `/environment/health` endpoint. 【F:backend-nodejs/src/routes/environmentParity.routes.js†L1-L9】
- `test/environmentParityService.test.js` — Vitest coverage validating manifest hashing, drift detection, and dependency probing logic. 【F:backend-nodejs/test/environmentParityService.test.js†L1-L97】
- `test/environmentParityHttpRoutes.test.js` — Vitest coverage confirming the admin route status codes reflect parity state. 【F:backend-nodejs/test/environmentParityHttpRoutes.test.js†L1-L99】
- `scripts/wait-for-db.js` — lightweight bootstrap helper invoked by Docker compose to block until Postgres is ready before running migrations. 【F:backend-nodejs/scripts/wait-for-db.js†L1-L36】
