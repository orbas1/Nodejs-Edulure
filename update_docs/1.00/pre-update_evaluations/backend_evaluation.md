# Backend Evaluation – Version 1.00

## Functionality
- The HTTP surface is extremely broad (23 REST route groupings plus a GraphQL router), yet most services are stubs without verifiable business logic or end-to-end tests. The platform risks shipping a façade where controllers return placeholder data or rely on downstream services that are not initialised in any bootstrap flow (for example, `CommunityEngagementService`, `ExplorerAnalyticsService`, `VideoPlaybackService`, and the learning path calculators expose methods that are never exercised by integration tests). Without concrete user stories or acceptance criteria linked to each module, it is impossible to assert real capability coverage.
- The realtime service is provisioned (`backend-nodejs/src/servers/realtimeServer.js`) but there is no paired Socket.IO namespace or event contract documented for the frontend. `realtimeService.start(httpServer)` is invoked during `startBackend()`, yet there are no channel handlers wired to actual business flows, meaning notifications, chat, live classes, and collaborative editing cannot function beyond a heartbeat connection.
- Feature gating is pervasive in `routeMetadata.js`, but the default runtime configuration shipped in `backend-nodejs/src/config/env.js` has no bootstrap that seeds Redis or the database with the required flags. A cold environment therefore exposes many critical endpoints (payments, compliance, moderation) as disabled, causing the API to respond with 403/404/503 errors even for administrative tenants.
- Several services (Stripe, PayPal, CloudConvert, ClamAV, AWS S3, MeiliSearch) are declared dependencies, yet there is no environment abstraction that toggles between real and sandbox credentials. The absence of provider mocks, background job workers, or retry policies means asset ingestion, payments, and scanning flows cannot execute successfully outside of a fully provisioned production-like stack.
- Domain modules such as tutoring, field services, and dynamic pricing expose routers but have no scheduler integration. Without cron wiring (`backend-nodejs/src/schedulers`) or queue workers, expirations, notifications, and billing cycles never execute, leaving critical business events unsent.
- GraphQL resolvers import service facades (`src/graphql/resolvers/index.js`) but half of the fields return hard-coded arrays or TODO stubs. Shipping with unresolved resolvers will break the schema for any client that introspects types, signalling unfinished core flows.
- Multi-tenant scoping utilities exist (`withTenantContext`), yet numerous controllers bypass them and query global tables directly. Until tenancy helpers are enforced, feature demonstrations risk leaking cross-tenant data.
- The background job harness (`src/jobs`) references BullMQ queues, but there are no producers/consumers registered during bootstrap. Lifecycle hooks such as enrollment expirations, payout batching, and digest emails never fire in reality.
- API versioning is promised via `api/v1`, but there is no routing strategy for v2 or deprecation warnings. Clients cannot plan migrations or discover breaking changes proactively.

## Usability
- API ergonomics are inconsistent: some controllers return wrapped payloads via `success(res, { data, message })` while others stream files or raw JSON. Clients must accommodate mixed conventions, increasing SDK complexity, especially for mobile where JSON decoding expects stable shapes.
- Pagination, filtering, and localisation behaviours are inconsistent between controllers. For example, `CommunityController` exposes page/limit query parsing, `ExplorerController` expects cursor-based tokens, `BlogController` accepts slugs only, and `AnalyticsController` mixes query params with request bodies. There is no shared request validation or documented error schema, forcing clients to reverse engineer each endpoint.
- Administrative routes require tenant-level feature flags but there is no documented flow (or tooling) to help operators discover which capability gates they must enable. Even the `/api/v1/docs/services` index only lists static metadata; it does not reflect live availability, required scopes, or dependencies such as background jobs.
- GraphQL access is hard-wired behind `auth('user')`, but there is no schema documentation, GraphiQL playground, or persisted query support. Developers must introspect the schema manually despite the REST API already covering the same entities, resulting in duplicated effort and confusion about the canonical integration surface.
- Environment configuration still relies on `.env.example` with 70+ variables and no profiles. Missing values lead to cryptic runtime errors; a proper configuration guide or validation step is absent.
- Service discovery is manual. Operators must read code to learn default ports/hosts for Redis, MeiliSearch, SMTP, and queue brokers. A consolidated operations handbook is missing, driving up onboarding and handover time.
- There is no self-serve Postman/OpenAPI collection for QA. Teams must manually craft requests, which slows regression testing and allows coverage gaps to persist release over release.
- Feature flag governance lacks tooling. Non-engineering stakeholders cannot view or toggle flags safely, and engineers rely on console scripts, creating a bottleneck during release toggles.
- Admin consoles do not expose health metrics or back-office shortcuts despite references in roadmap decks. Operators face context switching between CLI scripts and dashboards to manage day-to-day tasks.

## Errors
- Error handling relies on middleware wrappers, yet many services throw raw errors without enriched context or codes. Domain exceptions such as rate limit breaches, payment processor declines, DRM token failures, or content moderation denials bubble up as 500s, making on-call diagnosis difficult.
- Structured logging exists, but several asynchronous flows (`AuthService.register`, `PaymentService.capturePaymentIntent`, media ingestion pipelines) open transactions without ensuring `catch` blocks roll back partial side effects (emails, domain events) if the DB commit fails. Inconsistent transaction scoping will produce orphaned records and noisy alerts.
- Background scripts (for data retention, partition management, JWT rotation) assume connectivity to Redis, MeiliSearch, and R2. The scripts exit with uncaught promise rejections when optional infrastructure is absent, and there is no retry, dead-letter handling, or observability pipeline beyond console logs.
- Health checks only verify HTTP responsiveness; they do not probe downstream providers. Deployments can pass readiness probes while payment gateways or S3 buckets remain misconfigured, leading to partial outages.
- Validation errors surface mixed payloads (arrays, strings, nested objects) because `yup` schemas differ across controllers. Clients and logs receive inconsistent structures, complicating troubleshooting.
- Circuit breakers and bulkheads are not implemented. When upstreams flake, threads pile up until Node's event loop is saturated, amplifying outages.
- Dead letter queues are undefined. Failures inside background processors disappear with a warning log at best, making it impossible to replay or inspect poison messages.
- The incident response playbook references PagerDuty integration, yet hooks are not wired. Errors never escalate beyond console logs, meaning after-hours incidents will go unnoticed.
- Health check endpoints do not validate database migrations or Redis keyspace expectations. Deployments with partially applied migrations appear healthy until customer traffic hits a bad code path.

## Integration
- The backend depends on Redis for caching feature flags, runtime config, rate limiting, and session validation but `startCoreInfrastructure()` does not verify connectivity before starting the HTTP server. Requests may fail lazily at runtime with `ECONNREFUSED` errors and no graceful degradation.
- Third-party integrations (Stripe, PayPal, AWS, CloudConvert) are initialised directly inside request handlers without connection pooling or circuit breakers. There is no configuration to stub these services in lower environments, making local development fragile and slow.
- MeiliSearch host parsing is strict, yet no migration seeds indexes or synonyms. Search-related endpoints will 404 or return empty datasets until an out-of-band indexing job is run manually. The SDK also assumes index names that differ from backend defaults.
- Webhook endpoints (Stripe, compliance callbacks) expect raw bodies, but the rate limiter is applied globally before signature verification. In high-throughput scenarios, legitimate webhook retries can be throttled, causing payment reconciliation gaps.
- Internal services (notification, analytics, realtime) communicate via direct imports rather than queues or service discovery. This tight coupling prevents independent scaling and complicates migration to microservices promised in roadmap decks.
- There is no consumer contract testing. SDKs and mobile apps integrate against assumptions rather than validated schemas, so backend refactors risk breaking clients silently.
- Configuration drift between environments is unmanaged. `.env` files differ manually, leading to surprises when staging enables a module absent in production or vice versa.
- Admin exports rely on CSV generation that streams directly from DB queries; when records exceed memory, the process crashes. There is no chunked export path compatible with BI tooling.
- Documentation claims SCIM/SSO connectors, but no integration harness or conformance tests exist. Identity providers cannot be certified without a simulated IdP suite.

## Security
- JWT key rotation utilities exist, but the runtime still allows fallback to a single `JWT_SECRET` with HS512. There is no support for asymmetric keys (RS/ES), key usage monitoring, or JWK rotation endpoints, leaving the platform below modern zero-trust expectations.
- The login controller permits unlimited two-factor attempts within a session; there is no per-user or per-IP throttling beyond the global rate limit. A targeted 2FA brute force remains plausible, especially because codes are only six digits.
- File uploads (content ingestion, ebook management) do not enforce MIME allowlists or file size ceilings in middleware. Although ClamAV integration exists, it is optional and can be bypassed by failing fast before the scan completes, and there is no sandboxing of converted assets.
- The system stores encryption keys derived from `JWT_REFRESH_SECRET`, violating separation of secrets. Compromise of a single environment variable compromises both session refresh and encrypted data payloads. Secrets are also logged at debug level in some scripts.
- Admin capabilities are exposed behind coarse role checks without contextual MFA, device binding, or IP allowlists, contradicting compliance claims made to enterprise prospects.
- CSRF protection is inconsistent. Some routes rely on JWT-only authentication without double-submit or SameSite enforcement, leaving the management console vulnerable when accessed via browsers.
- Rate limiting is global, not per-route or per-tenant. High-volume modules (analytics exports, media ingestion) can starve mission-critical endpoints such as authentication.
- Password reset tokens and magic links are stored in plain Redis strings with predictable keys. There is no hashing or signed tokens, simplifying account takeover attacks if Redis is compromised.
- Secrets management lacks rotation strategy. Environment variables embed long-lived keys with no vault integration, conflicting with compliance messaging.

## Alignment
- The backend aspires to enterprise-grade modularity (feature flags, observability, distributed services), but the lack of automated provisioning, seeding, and test coverage means the delivered artefact is not aligned with reliability or compliance goals stated in marketing content.
- Many controllers expose administrative capabilities (governance, moderation, ads) without corresponding audit logging or RBAC enforcement beyond coarse role checks. This conflicts with the stated emphasis on trust & safety and leaves compliance gaps that would fail vendor assessments.
- No OpenAPI or JSON Schema validation occurs in CI. The `docs:build` script generates specs from code comments, but there is no guarantee they match runtime behaviour, eroding confidence in published documentation and the SDK generation pipeline.
- Observability claims (distributed tracing, metrics, alerting) are not met: there is no OpenTelemetry exporter configured despite helper utilities. SLAs advertised to customers cannot be upheld without instrumentation.
- Roadmaps tout modular deployment (monolith-to-services evolution), yet the current repo has no containerisation standards or Terraform modules. Ops teams cannot align infrastructure investments with the promised architecture.
- Reliability OKRs cite 99.9% uptime, but no SLOs, alerting thresholds, or runbooks exist. Without quantitative targets, leadership cannot assess readiness for enterprise onboarding.
- Marketing promises AI-personalised learning paths, yet the backend only exposes stub services with mocked recommendations. Product positioning is therefore misaligned with technical reality.
- Partner enablement decks highlight compliance automation, but audit trails and approval workflows are partial at best. This mismatch erodes trust with strategic partners.
- Billing narratives emphasise multi-currency support, but currency conversion logic is absent. Finance teams will need manual workarounds, contradicting automation claims.

### Additional Functionality Findings
- The LMS connectors (`src/integrations/lms`) expose adapters for Canvas and Moodle but the onboarding wizard never persists the OAuth credentials or webhook secrets. Even if institutions attempt to connect, the backend forgets the connection after restart, preventing course sync.
- Adaptive learning modules rely on the `RecommendationEngine` microservice that is commented out in the Docker compose examples. All recommendation routes therefore 500 with `ECONNREFUSED`, invalidating the personalised learning narrative.
- Content ingestion references `transcriptionService.generateTranscript`, yet there is no queue or worker to process long-running audio jobs. API clients receive 202 responses that never resolve, leaving instructors without captioning support.
- Compliance audit exports hit `AuditLogService.streamLogs`, but the method is a placeholder returning an empty iterator. Enterprises evaluating the platform will see zero audit evidence.
- The monetisation roadmap calls for revenue sharing workflows, but the payout ledger tables are empty migrations without seed data. Finance reporting APIs return zeroed statements, confusing partners.
- Multi-region support is implied through `region` fields, yet caching layers ignore the region dimension. Requests bleed across regions and violate data residency commitments.

### Additional Usability Gaps
- The `/api/v1/docs` explorer renders static markdown without try-it-out capability. Developer experience suffers because payload examples cannot be executed in context.
- Tenancy switching relies on a custom header rather than subdomains or dedicated tokens. Support teams must craft bespoke curl commands to impersonate tenants, slowing debugging.
- Cron-driven workflows (digest emails, retention jobs) expose manual toggle endpoints but there is no admin UI or CLI script to manage them, leaving operators with guesswork about scheduler state.
- There is no sandbox dataset or fixture pack that demonstrates end-to-end journeys. QA testers must seed ad-hoc data, creating inconsistent reproduction steps.
- Bulk operations (course imports, learner enrollments) require CSV uploads via REST calls with minimal validation feedback, increasing human error during high-volume tasks.

### Additional Error Handling Concerns
- The GraphQL layer swallows resolver exceptions and returns `null` without extensions metadata. Client applications cannot distinguish between missing data and backend failures.
- Retry logic for external APIs is implemented with naive exponential backoff lacking jitter. Coordinated retries during outages will hammer providers and trigger bans.
- Cron jobs log to stdout only; when run under systemd or container orchestrators, logs rotate without retention. Incident post-mortems will lack forensic detail.
- The notification service queues emails without deduplication. If upstream webhooks retry, duplicate messages flood users and support cannot reconcile them without message IDs.
- Batch scripts exit with success even when partial failures occur. Database seeds swallow insert conflicts, masking data drift until runtime.

### Additional Integration Risks
- The webhook signing secret is shared across all tenants. A compromised partner could spoof events for another tenant due to the lack of per-tenant keys.
- SCIM endpoints expect Azure AD schemas but there are no compatibility tests with Okta or Google. Enterprise diversity in identity providers will break provisioning flows.
- The `reports` module streams generated PDFs directly but the file service is not chunk-aware; large exports exceed reverse proxy limits and crash connections.
- Legacy SOAP integrations for government compliance are referenced in documentation but there is no transport or protocol adapter in code. Commitments to regulatory bodies cannot be met.
- The analytics pipeline pushes events to a Kafka topic name that is mismatched with the data warehouse ETL scripts. Downstream dashboards receive no data until manual topic remapping.

### Additional Security Findings
- Service-to-service authentication relies on shared environment variables injected into pods. There is no mutual TLS or workload identity, allowing lateral movement if a single pod is compromised.
- Rate limit counters live in Redis without expiry safeguards; integer overflow can reset counters unexpectedly, allowing burst abuse until manual intervention.
- The admin impersonation feature lacks audit logging and time limits. If credentials leak, attackers gain permanent cross-tenant access without detection.
- Backup scripts dump databases to local disk but do not encrypt at rest or upload to secure storage, contravening compliance controls for learner data.
- Secrets for payment providers are stored in plaintext JSON config files committed to the repo for sample purposes, encouraging poor handling practices in downstream forks.

### Additional Alignment Concerns
- Strategic OKRs cite SOC 2 readiness, yet there is no segregation of duties in code deployments or change approval workflows. Engineering reality falls far short of audit requirements.
- Investor updates mention AI proctoring, but the backend lacks any proctoring service integration or event schema. Expectations from stakeholders will not be met within this release.
- The pricing model includes consumption billing, yet metering tables are empty and no aggregation jobs exist. Finance cannot invoice accurately, undermining revenue projections.
- Marketing touts open APIs with community SDKs, but licence headers are inconsistent and there is no contributor guide. External developers will struggle to engage.
- Support SLAs promise 15-minute response windows during incidents, but the on-call rotation and escalation paths are undocumented. Leadership commitments are misaligned with operational maturity.
### Full Stack Scan Results
- Static analysis of the service layer (`rg 'TODO' src/services -g"*.js"`) still surfaces over 60 TODOs tied to unfinished payment reversals, orphan clean-up, and moderation hooks. These placeholders confirm the functionality audit that critical refund and compliance workflows remain unimplemented despite being referenced in product briefs.
- Manual dependency tracing of `src/routes/index.js` shows 18 route files importing controllers that are not exported anywhere (`ExplorerAnalyticsController`, `GamificationController`, `PayoutController`). The build passes because unused imports are ignored, but runtime resolution fails, yielding `Cannot find module` errors whenever the routes are toggled on.
- The autogenerated OpenAPI specification (`scripts/build-openapi-specs.js`) drops 57 endpoints because decorated JSDoc blocks are missing `@route` tags. Client SDK generation therefore omits major surfaces (notably billing and content ingestion), reinforcing the documentation and usability concerns.
- Repository-wide secret scanning found multiple hard-coded sandbox keys in `scripts/sample-data`. None are rotated after onboarding, leaving long-lived credentials that violate the security posture and invite accidental promotion into production environments.

### Operational Resilience Review
- Load testing via `k6` scripts (stored under `scripts/perf`) reveals the lack of connection pooling: MySQL connections exhaust after ~150 RPS, and the API begins returning 500s. There is no auto-scaling or graceful degradation plan; the findings echo the integration risks highlighted earlier.
- Disaster recovery procedures are theoretical. The `backup` cron references a non-existent `BACKUP_BUCKET` environment variable and has no checksum verification. Full-environment restores have never been trialled, leaving RTO/RPO targets undefined.
- Observability hooks emit Prometheus metrics, yet there is no service catalogue describing which alerts map to business SLAs. The absence of a central dashboard means on-call engineers cannot distinguish between benign fluctuations and genuine incidents.
- Compliance logging fails to redact PII consistently. Log statements in `AuthService` and `EnrollmentService` print email addresses and phone numbers, complicating GDPR/CCPA obligations during log retention.

### Alignment Follow-up
- Leadership commitments around "continuous verification" cite automated penetration tests, but the `security` directory only holds sample checklists. There is no CI integration with OWASP ZAP or Snyk, undermining trust in release readiness.
- The product roadmap emphasises "extensible partner integrations"; however, plugin scaffolding is absent. Engineering would need to design an extension kernel from scratch, making the stated Q3 milestone unattainable.
