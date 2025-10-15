# Events & Domain Notifications – Version 1.50

- Creation studio emits domain events for project lifecycle changes, collaborator management, collaboration sessions, and campaign promotions to extend observability dashboards and automation hooks for marketing ops and compliance reviewers.【F:backend-nodejs/src/services/CreationStudioService.js†L322-L808】【F:backend-nodejs/test/creationStudioService.test.js†L111-L207】
- Moderation pipeline now records domain events for post flags, case actions, and scam report submissions so safety dashboards and CDC consumers can audit every decision with actor attribution and risk scoring.【F:backend-nodejs/src/services/CommunityModerationService.js†L228-L626】【F:backend-nodejs/test/communityModerationService.test.js†L110-L236】

