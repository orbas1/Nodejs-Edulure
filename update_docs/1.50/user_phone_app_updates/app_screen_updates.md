# Version 1.50 – Screen Experience Updates

## Shared Shell Enhancements
- Every primary route now inherits the capability manifest banner so outage messaging appears above dashboards, feeds, and transactional flows without per-screen wiring.【F:Edulure-Flutter/lib/widgets/capability_status_banner.dart†L1-L218】【F:Edulure-Flutter/lib/main.dart†L1-L140】
- Banner chips highlight the first four impacted capabilities while keeping navigation accessible, matching the operator guidance from the desktop experience.【F:Edulure-Flutter/lib/widgets/capability_status_banner.dart†L151-L182】

## Resiliency & Offline States
- Cached manifest metadata is surfaced when the device is offline, including “showing cached status” pills so support agents can reconcile reports from field testers.【F:Edulure-Flutter/lib/widgets/capability_status_banner.dart†L103-L150】【F:Edulure-Flutter/lib/core/runtime/capability_manifest_models.dart†L1-L208】
- Manual refresh controls route through the notifier to retry degraded services without forcing a full app restart, improving operator workflows during partial outages.【F:Edulure-Flutter/lib/core/runtime/capability_manifest_notifier.dart†L58-L112】【F:Edulure-Flutter/lib/widgets/capability_status_banner.dart†L118-L149】

## Notification & Escalation Centre
- Settings screen now hydrates notification preferences from the new orchestrator, surfaces offline sync banners, and exposes granular email/push/SMS toggles so learners understand delivery posture in real time.【F:Edulure-Flutter/lib/services/notification_preference_service.dart†L369-L792】【F:Edulure-Flutter/lib/screens/settings_screen.dart†L200-L705】
- Slack escalation controls capture the channel name, trigger workspace tests, and queue updates when offline, pairing mobile parity with the integrations orchestrator introduced on the backend.【F:Edulure-Flutter/lib/screens/settings_screen.dart†L498-L829】【F:Edulure-Flutter/lib/services/notification_preference_service.dart†L619-L706】

## Privacy & Compliance Flows
- Home screen now triggers a policy review dialog when consent is outdated, guiding learners through acceptance or DSR export requests before unlocking the app shell.【F:Edulure-Flutter/lib/screens/home_screen.dart†L268-L332】
- Consent acceptance records the latest policy version in Hive so the dialog only reappears when policies change, while the logout path clears cached preferences to honour revocation flows.【F:Edulure-Flutter/lib/services/privacy_preferences.dart†L1-L34】【F:Edulure-Flutter/lib/services/session_manager.dart†L1-L110】

## Creation Companion Workspace
- Added the mobile creation companion hub with project filters, pending action indicators, and sync banners so instructors can review assignments, approvals, and publishing readiness on the go.【F:Edulure-Flutter/lib/screens/mobile_creation_companion_screen.dart†L1-L520】
- Outline review drawer supports approve/needs revision states with contextual note capture, while pending actions surface queued offline updates across share posts, metadata edits, and status changes.【F:Edulure-Flutter/lib/screens/mobile_creation_companion_screen.dart†L120-L360】【F:Edulure-Flutter/lib/services/mobile_creation_studio_service.dart†L200-L520】
- Community share dialog enforces meaningful summaries, deduplicates tags, and queues posts for sync when offline, keeping community announcements aligned with creation studio metadata.【F:Edulure-Flutter/lib/screens/mobile_creation_companion_screen.dart†L360-L520】【F:Edulure-Flutter/lib/services/mobile_creation_studio_service.dart†L360-L460】

## Ads Governance Console
- Introduced an instructor-focused ads governance screen with filterable campaign grid, risk badges, and budget vs. spend progress bars so moderators can triage issues without desktop access.【F:Edulure-Flutter/lib/screens/mobile_ads_governance_screen.dart†L1-L320】
- Insight drawer pulls `/ads/campaigns/:id/insights` data into a mobile-friendly metrics grid and daily breakdown, caching payloads for offline reference during on-site reviews.【F:Edulure-Flutter/lib/screens/mobile_ads_governance_screen.dart†L320-L520】【F:Edulure-Flutter/lib/services/mobile_ads_governance_service.dart†L230-L340】
- Pause/resume and fraud-report actions queue offline, surface pending chips, and replay with rich error handling so trust & safety teams can escalate suspicious spend even when coverage is limited.【F:Edulure-Flutter/lib/services/mobile_ads_governance_service.dart†L340-L560】【F:Edulure-Flutter/lib/screens/mobile_ads_governance_screen.dart†L180-L340】
