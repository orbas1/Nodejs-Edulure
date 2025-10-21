# Helper Changes

- Introduced Compose capability detection helpers in `scripts/bootstrap-environment.sh` to fall back gracefully when the Docker plugin lacks `--wait` support.
- Added CLI argument parsing utilities in `scripts/release/run-readiness.mjs` and security tooling to standardise flag handling and output serialisation.
- Extended version parsing utilities in `scripts/verify-node-version.mjs` to interpret the `packageManager` declaration.
