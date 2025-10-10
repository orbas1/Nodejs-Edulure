# Config Changes

- Added `src/config/env.js` to validate critical environment variables with Zod and expose a typed config object consumed across the service.
- Reworked `src/config/database.js` to build a Knex client with strict SQL modes, pooled connections, and a health check helper used by `/health`.
- Updated `src/config/logger.js` to honour the validated log level and restrict pretty logging to development.
- Introduced `.nvmrc` and a Node `engines` constraint to standardise the runtime version for CI/CD.
- Added `src/config/storage.js` with typed Cloudflare R2 client configuration and exported endpoint for presigned URL generation.
- Expanded `.env.example` with R2 credentials, upload/download TTLs, content size limits, CloudConvert API key, and DRM download constraints.
- Introduced `vitest.config.mjs` with a dedicated `test/setupEnv.js` bootstrap to satisfy Zod env validation during automated test runs.
