# Controllers Changes – Version 1.50

- Added `CreationStudioController` exposing validated endpoints for project lifecycle management, collaborator governance, session orchestration, and campaign promotion so `/api/v1/creation` consumers receive production-ready responses with consistent pagination and validation errors.【F:backend-nodejs/src/controllers/CreationStudioController.js†L1-L392】
- Introduced `CommunityModerationController` to validate moderation case actions, scam reports, and analytics requests, delivering structured responses and RBAC checks for the `/api/v1/moderation` surface.【F:backend-nodejs/src/controllers/CommunityModerationController.js†L1-L342】

