# Pre-Update Issue List – Version 1.00

1. Backend routes, resolvers, background jobs, and realtime services ship as stubs without seeded feature flags, workers, or third-party sandbox integrations, so critical flows (payments, moderation, analytics, recommendations) cannot execute outside demos.
2. Database migrations, seeds, and retention tooling are incomplete—tables remain unused, referential integrity is brittle, sensitive data is stored plaintext, and no automated archival, partition rotation, or recovery drills exist to meet compliance claims.
3. Dependency management lacks automation and coherence: npm/yarn/Flutter toolchains conflict, binary prerequisites are undocumented, SDKs drift from backend schemas, and vulnerability/license scanning is absent, leaving known CVEs unresolved.
4. The React dashboard depends on mock data, dead websocket contexts, and non-persistent multi-step forms, producing unusable operator workflows while failing accessibility, localisation, and theming commitments.
5. Security controls across web and backend (token storage, RBAC depth, CSRF/webhook protections, audit logging, key rotation) fall short of enterprise promises, exposing tenants to data leaks and impersonation risk.
6. The legacy provider mobile app is retired without a replacement plan, yet contracts, documentation, and backend jobs still depend on it, leaving partners without scheduling, compliance capture, or notification tooling.
7. The learner Flutter app advertises offline, realtime, and monetisation features but ships with mock services, disabled isolates, broken navigation, and no telemetry or crash reporting, making the experience unstable and unverifiable.
8. Cross-platform feature flags, schemas, and generated SDKs drift without governance; clients fail open on missing flags, and contract mismatches break integrations between backend, web, and mobile surfaces.
9. Operational readiness is missing: no observability pipeline, dead letter queues, automated alerts, or tested incident/backup runbooks exist, so outages and dependency regressions will go undetected until customers escalate.
10. Marketing, roadmap, and compliance narratives (enterprise readiness, accessibility, privacy, provider mobile parity) are misaligned with current capabilities, creating reputational and contractual risk for the 1.00 release.
