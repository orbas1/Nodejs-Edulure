# Backend Change Log

## Infrastructure and Automation
- Hardened the Postgres Terraform module with password complexity, retention, and network ingress guardrails aligned with production governance.
- Refactored the environment bootstrap script to validate prerequisites, enforce remote state variables, and support Docker Compose readiness checks.
- Enhanced the release readiness runner with CLI filtering, per-check timeouts, and dual-format reporting for JSON and Markdown consumers.
- Rolled out the OpenAPI SDK generator with hash-aware caching, manifest emission, and `--summary` reporting so release managers can audit client runtime drift alongside backend changes.

## Security Tooling
- Upgraded the license report generator to honour optional policy files, detect missing license metadata, and optionally exclude development dependencies.
- Reworked the npm audit wrapper to support multi-workspace execution, external allowlists, and aggregated reporting suitable for CI dashboards.
- Tightened runtime verification to enforce the packageManager contract alongside minimum Node.js and npm versions.

## Compliance
- Refreshed the core release checklist to include RBAC regression, CORS validation, and observability SLO confirmations required for CAB approval.
