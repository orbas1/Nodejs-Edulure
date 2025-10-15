# Provider Mobile Roadmap – Creation & Ads Oversight

## 1. Programme Overview
- **Objective:** Deliver a provider-facing Flutter shell that gives senior instructors and trust & safety reviewers a single moderation workspace for creation studio approvals and campaign governance.
- **Drivers:** Mobile-first partner cohorts require the ability to pause spend, review drafts, and escalate fraud without opening the desktop console. Provider parity also unlocks after-hours coverage for the creation studio lifecycle and ads budget protection.
- **Initial Scope:** Focus on *read*, *triage*, and *escalate* actions against existing `/api/v1/creation` and `/api/v1/ads` endpoints, while instrumenting evidence capture through the moderation service so audit posture matches the learner app.

## 2. Capability Map
### 2.1 Ads Governance Command Centre
- Campaign list with risk, spend, and pacing surfaced from `GET /api/v1/ads/campaigns`, mirroring the data consumed by the learner moderation view and populating card states used in the Flutter governance console.【F:backend-nodejs/src/routes/ads.routes.js†L1-L16】【F:Edulure-Flutter/lib/screens/mobile_ads_governance_screen.dart†L40-L360】
- Campaign detail drawers hydrate insights via `GET /api/v1/ads/campaigns/:campaignId/insights`, exposing conversion breakdowns, anomaly streaks, and fraud indicators already computed by the ads service.【F:backend-nodejs/src/routes/ads.routes.js†L9-L16】【F:backend-nodejs/src/services/AdsService.js†L18-L142】
- Offline-safe pause/resume controls reuse the queueing discipline implemented for the learner ads governance surface so provider reviewers can stage a moderation action, capture context, and replay once connectivity returns.【F:Edulure-Flutter/lib/services/mobile_ads_governance_service.dart†L200-L520】

### 2.2 Creation Oversight Workspace
- Project queue sourced from `GET /api/v1/creation/projects` filtered by review status to display outstanding drafts, revisions, and promotions awaiting approval.【F:backend-nodejs/src/routes/creation.routes.js†L1-L34】【F:backend-nodejs/src/services/CreationStudioService.js†L36-L208】
- Collaboration session tracker hooks into `GET /api/v1/creation/projects/:projectId` and session endpoints to show active reviewers, outstanding tasks, and last activity for each asset.【F:backend-nodejs/src/routes/creation.routes.js†L8-L24】【F:backend-nodejs/src/services/CreationStudioService.js†L210-L396】
- Campaign promotion checklist surfaces readiness blockers using `/projects/:projectId/promote`, aligning provider UI copy with the same validations powering the instructor desktop workflow.【F:backend-nodejs/src/routes/creation.routes.js†L24-L31】【F:backend-nodejs/src/services/CreationStudioService.js†L398-L520】

### 2.3 Trust & Safety Integration
- Fraud escalation sheet emits payloads to `/api/v1/moderation/cases` with attachments generated from campaign/project context, mirroring the moderation pipeline service so provider analysts follow the same audit trail as central ops.【F:backend-nodejs/src/routes/communityModeration.routes.js†L1-L45】【F:backend-nodejs/src/services/CommunityModerationService.js†L1-L676】
- Policy nudges leverage the capability manifest bridge to highlight which actions are gated for the current provider role, preventing unauthorized spend adjustments while still surfacing read-only insight cards.【F:Edulure-Flutter/lib/provider/runtime/provider_capability_bridge.dart†L1-L168】

## 3. Contract Alignment & Data Requirements
| Domain | Endpoint | Notes | Owner |
| --- | --- | --- | --- |
| Ads | `GET /api/v1/ads/campaigns` | Include risk score, pacing, spend-to-budget, and fraud status. Provider client consumes pagination + filters identical to learner console. | Ads Platform |
| Ads | `POST /api/v1/ads/campaigns/:id/pause` & `.../resume` | Accept reason codes (`fraud_alert`, `budget_correction`, `policy_violation`) plus offline action ID for replay tracking. | Trust & Safety |
| Creation | `GET /api/v1/creation/projects` | Adds `reviewState`, `complianceScore`, and `pendingTaskCount` fields already present in studio service but hidden from external consumers. | Creation Studio |
| Creation | `POST /api/v1/creation/projects/:id/promote` | Surface validation errors grouped by checklist item (curriculum, assets, ads) for consistent provider messaging. | Creation Studio |
| Moderation | `POST /api/v1/moderation/cases` | Accepts attachments pointing to campaign/project IDs, replicating schema used by the mobile learner escalation form. | Trust & Safety |
| Analytics | `GET /api/v1/creation/analytics/summary` | Powers KPI strip (approvals throughput, rejection reasons, average turnaround). | Insights |

Data contracts must be published in the service-specific OpenAPI catalogue so provider squads can validate integration before the Flutter shell ships.【F:backend-nodejs/src/docs/builders/openapiBuilder.js†L1-L169】【F:backend-nodejs/src/docs/serviceSpecRegistry.js†L1-L56】

## 4. Workflow Blueprint
1. **Campaign Review:** Provider reviewer opens campaign card → fetches insights → records moderation notes. If action required, they submit pause/resume queue item with context that replicates the offline replay envelope already in the learner service.【F:Edulure-Flutter/lib/services/mobile_ads_governance_service.dart†L360-L520】
2. **Creation Approval:** Reviewer triages project backlog, checks collaborator activity, and either approves or requests changes, which triggers notifications via the existing studio lifecycle events (no new backend needed).【F:backend-nodejs/src/services/CreationStudioService.js†L210-L520】
3. **Fraud Escalation:** High-risk campaigns/projects spawn a moderation case with attachments, severity, SLA, and linked evidence so central ops can intervene without re-entering context.【F:backend-nodejs/src/services/CommunityModerationService.js†L520-L676】
4. **Audit & Analytics:** Offline/online actions emit CDC events already consumed by analytics, enabling dashboards to display provider contribution metrics alongside desktop moderation throughput.【F:backend-nodejs/src/services/ChangeDataCaptureService.js†L1-L111】

## 5. Offline, Security, and Telemetry Considerations
- Reuse session manager Hive boxes to isolate provider queues from learner storage, enforcing biometric unlock before executing sensitive moderation actions.【F:Edulure-Flutter/lib/services/session_manager.dart†L1-L164】
- Attach retry metadata (`attempt`, `lastError`, `syncedAt`) to provider moderation envelopes so support can audit offline recovery identical to the learner governance console.【F:Edulure-Flutter/lib/services/mobile_ads_governance_service.dart†L400-L520】
- Instrument analytics events with consent-aware flags and role context so downstream warehouse tables can segment provider vs learner activity without leaking PII.【F:backend-nodejs/src/services/dataRetentionService.js†L1-L231】

## 6. Delivery Milestones
| Sprint | Deliverable | Notes |
| --- | --- | --- |
| S1 | Provider ads oversight Flutter module skeleton, manifest integration, and offline queue storage. | Leverage existing governance service and capability bridge for parity. |
| S2 | Creation oversight views (project backlog, session tracker, promotion checklist) with moderation case hand-off hooks. | Align copy + states with studio API validations. |
| S3 | Trust & safety escalation, audit telemetry, and analytics instrumentation. | Dry-run CDC validation and contract tests before pilot. |
| S4 | Pilot rollout with partner cohort, incident runbooks, and QA automation baselines for offline replay scenarios. | Feed learnings into Testing & Release workstream deliverables. |

## 7. Risks & Mitigations
- **Risk:** Provider moderation actions executed without latest manifest snapshot. **Mitigation:** Block action buttons until `ProviderCapabilityBridge` confirms manifest age <15 minutes; expose refresh CTA and degrade to read-only state.【F:Edulure-Flutter/lib/provider/runtime/provider_capability_bridge.dart†L1-L168】
- **Risk:** Offline queues diverge between learner/provider apps. **Mitigation:** Share serialization schema and telemetry events defined in the learner governance service so support tooling recognises envelopes from both clients.【F:Edulure-Flutter/lib/services/mobile_ads_governance_service.dart†L200-L520】
- **Risk:** Duplicate moderation cases between campaign and project reviews. **Mitigation:** Enforce deduplication via moderation service’s idempotency keys and attach cross-links within the provider UI using case references returned by `/api/v1/moderation/cases`.【F:backend-nodejs/src/services/CommunityModerationService.js†L520-L676】

