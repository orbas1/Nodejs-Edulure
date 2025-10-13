# Backend Test Results

- `npm run lint` (backend-nodejs) – passed after security and orchestration refactorings. 【414b3a†L1-L5】
- `npm run lint` (backend-nodejs) – re-run post content pipeline additions; no warnings/errors remain. 【98c788†L1-L5】
- `npm run test` (backend-nodejs) – Vitest suite validates StorageService presigning flows and passes under the Zod-validated test harness. 【822c3e†L1-L15】
- `npm test` (backend-nodejs) – verification mailer suite and storage regression both pass under Vitest. 【062da1†L1-L14】
- `npm test --workspace backend-nodejs` – Vitest suite now covers messaging pagination clamps, presence TTL enforcement, and HTTP route integration. 【4aa469†L1-L20】
- `npm test` (backend-nodejs) – Full Vitest suite passes after social graph resilience updates and OpenAPI normalisation. 【61cbce†L1-L33】
- `npx swagger-cli validate src/docs/openapi.json` – Specification passes validation post-nullable normalisation for chat, DM, paywall, and social graph schemas. 【4174d7†L1-L2】
- `npm test` (backend-nodejs) – Explorer/ads suites execute end-to-end with AdsService compliance automation and insights ordering fixes covered by Vitest. 【553d13†L1-L19】
- `npm test` (backend-nodejs) – Explorer analytics, chat, social graph, and ads HTTP/service suites all pass after installing workspace dependencies, confirming telemetry and alert flows remain stable. 【2cc86b†L1-L34】
- `npm test --workspace backend-nodejs` – Fails with Rollup parsing error "Nullish coalescing operator(??) requires parens when mixing with logical operators" while executing Vitest HTTP suites (admin, ads, chat, dashboard, social graph). Requires linting pass to insert parentheses or upgrade parser. 【722075†L1-L39】
