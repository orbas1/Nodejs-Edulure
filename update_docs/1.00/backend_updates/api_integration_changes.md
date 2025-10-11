# API Integration Changes

- Published `src/docs/openapi.json` and Swagger UI to give frontend/mobile squads a contract-first integration path.
- Standardised response/error envelopes simplifying API client abstractions across React and Flutter.
- Expanded the OpenAPI document with content asset schemas, Cloudflare R2 credential requirements, and analytics telemetry definitions powering new client SDKs.
- Added antivirus scan/quarantine response schemas so web/Flutter clients can surface malware warnings, retry guidance, and admin escalation workflows.
- Documented DRM download limits, presigned URL TTLs, and ingestion workflow status codes to guide React upload flows and Flutter offline downloads.
- Refreshed the OpenAPI specification to include verification status schemas, account lockout error codes, the session envelope schema, and the new `/api/auth/verify-email`, `/api/auth/resend-verification`, `/api/auth/refresh`, `/api/auth/logout`, and `/api/auth/logout-all` endpoints for client integration.
- Extended the OpenAPI contract with `/api/payments` endpoints, Stripe webhook documentation, coupon schemas, payment totals, and finance summary responses so web/mobile checkout flows, tutor payouts, and dashboards can integrate without reverse-engineering payloads.
- Documented the community engagement contract in OpenAPI, covering point award payloads, streak check-ins, leaderboard filters, event metadata (with map coordinates/timezone hints), RSVP lifecycle states, and reminder scheduling rules so React, Flutter, and cron consumers implement identical validation and analytics tagging.
