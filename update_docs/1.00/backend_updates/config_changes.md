# Config Changes

- Added `src/config/env.js` to validate critical environment variables with Zod and expose a typed config object consumed across the service.
- Extended `src/config/env.js` to parse multi-key JWT keysets, enforce algorithm/secret validation, surface the active key, and expose DRM signature configuration.
- Reworked `src/config/database.js` to build a Knex client with strict SQL modes, pooled connections, and a health check helper used by `/health`.
- Updated `src/config/logger.js` to honour the validated log level and restrict pretty logging to development.
- Introduced `src/config/jwtKeyStore.js` to centralise signing key lookup, verification, and logging when legacy tokens are encountered.
- Introduced `.nvmrc`, `.npmrc`, and a workspace runtime verifier (`scripts/verify-node-version.mjs`) to standardise the Node/npm versions for CI/CD and block unsupported package managers.
- Added `src/config/storage.js` with typed Cloudflare R2 client configuration and exported endpoint for presigned URL generation.
- Expanded `.env.example` with R2 credentials, upload/download TTLs, content size limits, CloudConvert API key, and DRM download constraints.
- Introduced `vitest.config.mjs` with a dedicated `test/setupEnv.js` bootstrap to satisfy Zod env validation during automated test runs.
- Enhanced `src/config/env.js` with SMTP, verification, and account lockout controls, surfacing structured configuration for the new mailer and credential governance policies. Latest iteration adds session validation cache TTLs and per-user session caps to back the logout/rotation tooling.
- Hardened logging/observability configuration: added configurable trace header names, sampling, metrics auth, IP allow-lists, and redactable field lists surfaced via `env.logging`/`env.observability`.
- Extended `src/config/env.js` with an `engagement` namespace capturing reminder enablement, cron expressions, batch sizes, lookahead windows, and timezone defaults consumed by the engagement service and reminder job.
- Added Meilisearch configuration primitives: `src/config/env.js` now validates host lists, admin/search API keys, timeouts,
  prefixes, and search allow-lists; new `src/config/search.js` builds typed admin/replica/read client pools with a shared
  user-agent used by `SearchClusterService` and operational scripts.
- Extended the search configuration namespace with ingestion controls (batch size, concurrency, delete-before-reindex toggles) consumed by `SearchIngestionService` and the new CLI so operators can throttle indexing safely per environment.
