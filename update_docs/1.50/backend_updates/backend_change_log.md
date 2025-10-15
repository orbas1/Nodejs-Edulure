# Backend Change Log – Version 1.50 Platform Hardening

## Modular Service Bootstrap
- Introduced dedicated startup modules for the web (`src/servers/webServer.js`), worker (`src/servers/workerService.js`), and realtime (`src/servers/realtimeServer.js`) processes, each with isolated readiness tracking, retry-aware bootstrap logic, and graceful shutdown orchestration.【F:backend-nodejs/src/servers/webServer.js†L1-L114】【F:backend-nodejs/src/servers/workerService.js†L1-L153】【F:backend-nodejs/src/servers/realtimeServer.js†L1-L141】
- Added CLI entrypoints (`src/bin/web.js`, `src/bin/worker.js`, `src/bin/realtime.js`) and updated package scripts so deployments can manage each process independently or via orchestrators without reintroducing monolithic coupling.【F:backend-nodejs/src/bin/web.js†L1-L10】【F:backend-nodejs/package.json†L10-L26】

## Observability & Bootstrap Utilities
- Created a reusable readiness tracker (`src/observability/readiness.js`) and HTTP probe app factory (`src/observability/probes.js`) to standardise `/live` and `/ready` responses across services and support future health instrumentation.【F:backend-nodejs/src/observability/readiness.js†L1-L72】【F:backend-nodejs/src/observability/probes.js†L1-L39】
- Centralised database and infrastructure bootstrapping with retry semantics in `src/bootstrap/bootstrap.js`, preventing fatal exits when dependent systems are temporarily unavailable and enabling graceful degradation paths.【F:backend-nodejs/src/bootstrap/bootstrap.js†L1-L109】

## Application Entry Adjustments
- Updated `src/app.js` to expose `/live` and `/ready` endpoints and to accept readiness reporters registered by the service entrypoints, ensuring the primary API surface integrates with cluster health monitoring.【F:backend-nodejs/src/app.js†L63-L140】
- Replaced the legacy `src/server.js` implementation with a compatibility shim that delegates to the new web server while warning engineers to adopt the modular scripts.【F:backend-nodejs/src/server.js†L1-L12】

## API Versioning & Capability Gating
- Introduced a declarative router registry and mounting utility (`src/routes/routeRegistry.js`, `src/routes/registerApiRoutes.js`) that applies feature-flag gates, `/api/v1` versioning, and per-route error boundaries before traffic reaches domain controllers, isolating regressions and enabling tenant-specific rollouts.【F:backend-nodejs/src/routes/routeRegistry.js†L1-L109】【F:backend-nodejs/src/routes/registerApiRoutes.js†L1-L86】
- Added dedicated middleware for feature flag gating and route-level error boundaries so disabled capabilities return structured responses instead of falling through the global error handler, and so operators can trace failures with correlation IDs.【F:backend-nodejs/src/middleware/featureFlagGate.js†L1-L123】【F:backend-nodejs/src/middleware/routeErrorBoundary.js†L1-L56】
- Updated OpenAPI server entries to advertise the `/api/v1` base path for SDK generators and partner integrations, keeping the specification aligned with the new routing contract.【F:backend-nodejs/src/docs/openapi.json†L9-L19】

## Capability Manifest & Health Aggregation
- Implemented a capability manifest service that evaluates feature flag exposure, correlates dependencies with readiness probes across the web, worker, and realtime processes, and surfaces availability summaries for clients and operator tooling.【F:backend-nodejs/src/services/CapabilityManifestService.js†L1-L209】
- Extended the runtime configuration controller with a public `/api/v1/runtime/manifest` endpoint so web and mobile clients can fetch real-time service availability, capability gating reasons, and dependency impact metadata in a single call.【F:backend-nodejs/src/controllers/RuntimeConfigController.js†L1-L155】【F:backend-nodejs/src/routes/runtimeConfig.routes.js†L1-L11】

## Operator Telemetry & Incident Feeds
- Introduced an operator dashboard service that fuses capability manifest health, security incident telemetry, scam analytics, and runbook shortcuts into a single snapshot powering the new admin command centre UI.【F:backend-nodejs/src/services/OperatorDashboardService.js†L1-L305】【F:backend-nodejs/src/services/DashboardService.js†L826-L899】
- Added a `SecurityIncidentModel` and enriched seed data for encrypted incident notes, detection channels, and SLA metadata so operator tooling can surface real investigations without exposing sensitive payloads.【F:backend-nodejs/src/models/SecurityIncidentModel.js†L1-L91】【F:backend-nodejs/seeds/001_bootstrap.js†L1-L655】

## Data Governance & Compliance Reinforcement
- Modularised compliance schema creation into a reusable domain module that provisions audit, consent, DSR, incident, and CDC tables with encrypted columns, partitioning policies, and retention metadata while wiring the migration to the new helper and exposing a CLI ERD generator for documentation exports.【F:backend-nodejs/src/database/domains/compliance.js†L1-L449】【F:backend-nodejs/migrations/20250204100000_compliance_audit_consent_incidents.js†L1-L60】【F:backend-nodejs/scripts/generate-erd.js†L1-L140】
- Added a Change Data Capture service that normalises payloads, records governance events to the `cdc_outbox`, and exposes delivery/failure handlers; data retention now emits CDC events, supports run identifiers, dry-run alerting, and improved CLI ergonomics for compliance simulations.【F:backend-nodejs/src/services/ChangeDataCaptureService.js†L1-L111】【F:backend-nodejs/src/services/dataRetentionService.js†L1-L231】【F:backend-nodejs/scripts/run-data-retention.js†L1-L214】
- Delivered a production-ready compliance API surface with controllers, services, and routes for DSR queues, consent lifecycle management, and policy history, backed by seeded governance data and metadata registration for discovery.【F:backend-nodejs/src/services/ComplianceService.js†L1-L247】【F:backend-nodejs/src/controllers/ComplianceController.js†L1-L129】【F:backend-nodejs/src/routes/compliance.routes.js†L1-L18】【F:backend-nodejs/seeds/001_bootstrap.js†L656-L855】【F:backend-nodejs/src/routes/routeMetadata.js†L1-L189】
- Extended automated coverage with unit suites for the CDC service and integration tests for the compliance HTTP routes so authentication, validation, and actor attribution paths stay regression-safe.【F:backend-nodejs/test/changeDataCaptureService.test.js†L1-L108】【F:backend-nodejs/test/complianceHttpRoutes.test.js†L1-L138】

## Configuration & Testing
- Expanded environment schema support for per-service ports, probe bindings, and bootstrap retry tuning so infrastructure-as-code can provision independent deployment targets.【F:backend-nodejs/src/config/env.js†L200-L215】【F:backend-nodejs/src/config/env.js†L455-L507】
- Added Redis runtime configuration with TLS-aware client factory and distributed cache orchestrator so feature flag and runtime configuration services can hydrate from shared snapshots, coordinate refresh locks, and degrade gracefully when Redis is unavailable.【F:backend-nodejs/src/config/env.js†L220-L335】【F:backend-nodejs/src/config/redisClient.js†L1-L92】【F:backend-nodejs/src/services/DistributedRuntimeCache.js†L1-L129】
- Added a Vitest suite for the readiness tracker to ensure future regressions in health reporting are caught automatically.【F:backend-nodejs/test/readinessTracker.test.js†L1-L33】
- Introduced router loader tests that validate feature gating, legacy redirects, and error boundary responses so versioned APIs remain deterministic during rollout.【F:backend-nodejs/test/routerLoader.test.js†L1-L68】

## Contract Distribution & SDK Automation
- Normalised OpenAPI path definitions and documented capability manifest schemas so `/api/v1` consumers receive accurate paths and typed payloads when generating SDKs from the contract.【F:backend-nodejs/src/docs/openapi.json†L1-L205】【F:backend-nodejs/src/docs/openapi.json†L15004-L15037】
- Delivered a dedicated TypeScript SDK package that regenerates clients from the OpenAPI spec, compiles them for bundler consumption, and exposes a configuration helper so web and mobile shells share capability gating logic without duplicating DTOs.【F:sdk-typescript/scripts/generate-sdk.mjs†L1-L66】【F:sdk-typescript/src/index.ts†L1-L3】【F:sdk-typescript/src/runtime/configure.ts†L1-L83】
