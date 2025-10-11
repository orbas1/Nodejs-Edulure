# API Integration Changes

- Published `src/docs/openapi.json` and Swagger UI to give frontend/mobile squads a contract-first integration path.
- Standardised response/error envelopes simplifying API client abstractions across React and Flutter.
- Expanded the OpenAPI document with content asset schemas, Cloudflare R2 credential requirements, and analytics telemetry definitions powering new client SDKs.
- Documented DRM download limits, presigned URL TTLs, and ingestion workflow status codes to guide React upload flows and Flutter offline downloads.
- Refreshed the OpenAPI specification to include verification status schemas, account lockout error codes, and the new `/api/auth/verify-email` plus `/api/auth/resend-verification` endpoints for client integration.
