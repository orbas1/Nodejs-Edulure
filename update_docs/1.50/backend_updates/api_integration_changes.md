# API Integration Changes – Version 1.50

- Documented new creation studio endpoints for SDK and partner integration teams, highlighting RBAC requirements, pagination contract, template identifiers, collaboration session semantics, campaign promotion payloads, and the expanded creation type catalogue (gigs, job listings, launchpads, volunteering, mentorship) so downstream consumers can map domain-specific metadata correctly.【F:backend-nodejs/src/controllers/CreationStudioController.js†L1-L392】【F:update_docs/1.50/features_to_add.md†L32-L102】
- Published moderation API guidance covering case listing filters, action payloads, scam reporting schema, and analytics summary contracts so trust & safety tooling can integrate without bespoke discovery cycles.【F:backend-nodejs/src/controllers/CommunityModerationController.js†L1-L342】【F:backend-nodejs/src/services/CommunityModerationService.js†L1-L676】

