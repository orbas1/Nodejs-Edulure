# Config Changes

## Runtime Enforcement
- `scripts/verify-node-version.mjs` now validates the `packageManager` field to ensure contributors run the documented npm toolchain alongside minimum Node.js/npm versions.

## Terraform
- Postgres module variables enforce production-ready defaults for password complexity, backup retention, and destruction safeguards.

## Release Automation
- Readiness runner adds CLI options for selective execution and outputs Markdown alongside JSON for easier human review.
