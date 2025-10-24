# API Changes

## Summary
- No REST, WebSocket, or GraphQL contract changes were introduced in this release cycle.
- Existing endpoints for release automation, RBAC, and telemetry remain backward compatible.
- Regenerated the TypeScript SDK against the `backend-nodejs/src/docs/openapi.json` contract and published the `.manifest.json` fingerprint for downstream tooling.

## Validation
- Confirmed the automated readiness suite exercises the public health and telemetry endpoints without regression.
- Smoke-tested SDK clients to verify that pagination, filtering, and authentication flows continue to behave as expected.
- Captured the `node ./scripts/generate-sdk.mjs --summary` output in release notes so contract auditors can reconcile spec hashes.

## Follow-up
- Monitor Postman and Newman monitor dashboards during the next 48-hour window to ensure latency and contract drift remain within SLO.
