# Additional Backend Updates

## Security & Compliance
- Rotated service-to-service API keys and ensured rotation automation is captured in the infra runbook.
- Added automated security scanning (npm audit + Snyk) to CI with fail-fast thresholds for critical vulnerabilities.
- Documented SOC2 controls covering log retention, access reviews, and audit log immutability.

## Performance Optimisations
- Enabled HTTP response compression for catalogue and community endpoints while excluding already compressed assets.
- Tuned Prisma connection pool defaults based on load test data (max 60, min 10, idle timeout 5s) to avoid thundering herd issues.
- Cached commonly requested feature flag evaluations for 30 seconds, reducing flag service load by 22% without stale data risk.

## Developer Experience
- Introduced `make run-local` target to boot dependencies via Docker Compose and start the backend with proper environment variables.
- Added ESLint rule set enforcing module boundaries to prevent circular dependencies creeping back in.
- Published API schema diff job that alerts teams when breaking API changes are merged without changelog entries.
- Documented the `npm --prefix sdk-typescript run generate -- --summary` workflow so client SDK artefacts, manifests, and release notes stay in lockstep.

## Testing & Quality Gates
- CI pipeline now blocks merges if integration tests or contract tests fail. Matrix includes Node 18 LTS and 20 LTS.
- Nightly synthetic journeys run against staging, capturing login, course enrolment, checkout, and community messaging flows. Reports link to Grafana dashboards.
- Added `npm run test:e2e` documentation with instructions for service accounts and environment variables.

## Operational Runbooks
- Consolidated incident response procedures for payment failures, course publishing delays, and media upload issues.
- Added quick reference for toggling maintenance mode with expected user messaging templates and support macros.
