# Build & Deployment Updates

## Pipeline Enhancements
- CI now runs on Node.js 18 LTS with nightly smoke builds on Node.js 20 to anticipate future upgrades.
- Added dedicated `npm run verify` script bundling lint, unit tests, and type checks to simplify local validation.
- Docker image builds leverage multi-stage builds with production-only dependencies to reduce image size by 32%.

## Quality Gates
- Pull requests must pass lint, unit, integration, and contract test suites. Coverage thresholds enforced: 85% statements, 80% branches.
- Added static analysis (ESLint, Sonar, dependency scanning) with fail-fast on high severity findings.

## Deployment Workflow
- Blue/green deployments with automated health checks and traffic cutover when `/ready` passes for 5 consecutive polls.
- Feature flags required for risky changes; default to off until product signs off.
- Documented rollback procedure with database migration guard rails.

## Runtime Configuration
- Deployments validate runtime configuration before startup (CORS origins, feature flags, provider credentials). Config mismatches block release.
- Added configuration drift detector comparing Git-tracked defaults with live environment snapshots.

## Testing Summary
- ✅ `npm run lint` – Workspace lint job passes with zero warnings after normalising imports across dashboard and integration modules.
- ✅ `npm run test` – Full unit and integration suite green, with flaky dashboard/invite cases stabilised via deterministic seeds.
- ✅ `npm run build` – Production build succeeds in CI pipeline #519 and produces signed artefacts pushed to the release registry.
- ✅ Docker image vulnerability scan (Trivy) – no critical findings; scan embedded in `npm run verify` composite step.
