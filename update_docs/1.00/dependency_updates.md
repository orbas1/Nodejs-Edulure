# Dependency Updates – Version 1.00

- Added root-level security automation by wiring `audit`, `audit:ci`, and `license:report` scripts plus `license-checker`/`vitest` dev dependencies and workspace overrides so supply-chain checks run consistently across packages. 【F:package.json†L16-L43】
- Refreshed backend dependencies to `adm-zip@^0.5.15`, `pino@^10.1.0`, `pino-http@^11.0.0`, `nodemailer@^7.0.9`, and pulled in `ajv@^8.17.1` for OpenAPI validation alongside aligned build tooling (`vite@^7.1.3`, `vitest@^3.2.4`). 【F:backend-nodejs/package.json†L37-L88】
- Upgraded the operator web app build pipeline with `vite@^7.1.3`, `vitest@^3.2.4`, `@vitejs/plugin-react@^5.0.4`, `postcss@^8.5.6`, and `autoprefixer@^10.4.20`, introduced `topojson-client@^3.1.0`, and bumped `axios@^1.7.7` to support the Explorer rewrite. 【F:frontend-reactjs/package.json†L10-L59】
- Added an `audit:dependencies` script to the TypeScript SDK so publishing pipelines can surface npm advisories independently of the platform audit workflow. 【F:sdk-typescript/package.json†L12-L18】
- Added `autocannon` to the backend workspace and `jest-axe` to the frontend to power release load testing and accessibility audits for the new readiness pipeline. 【F:backend-nodejs/package.json†L22-L79】【F:frontend-reactjs/package.json†L11-L49】
