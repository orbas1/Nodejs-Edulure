# Handler Changes

## Release Automation
- `scripts/release/run-readiness.mjs` introduces configurable filters and improved timeout handling, ensuring long-running suites fail fast with actionable metadata.

## Security Scans
- `scripts/security/run-npm-audit.mjs` now walks every workspace sequentially, persisting results with allowlist provenance and providing CI-friendly summaries.

## Operational Scripts
- `scripts/bootstrap-environment.sh` validates remote prerequisites before invoking Terraform and supports optional seeding toggles for local development.
