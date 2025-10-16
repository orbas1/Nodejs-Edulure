# Provider Push Notification Design Guidelines

These guidelines extend the Version 1.50 notification overhaul to the upcoming provider mobile shell. They ensure operators inherit the same preference controls, escalation affordances, and offline guarantees already shipping in the learner application.

## Experience Principles
1. **One control surface** – Provider personas manage channel toggles, category overrides, Slack routing, and webhook diagnostics from a single preference matrix, mirroring the learner settings hub layout.【F:Edulure-Flutter/lib/screens/settings_screen.dart†L200-L833】【F:update_docs/1.50/ui-ux_updates/user_app_wireframe_changes.md†L176-L179】
2. **Capability aware** – Every toggle displays its gating capability (e.g., `integrations.manage`, `ads.moderate`) sourced from the provider RBAC envelope so restricted roles see explanatory lock states rather than missing controls.【F:update_docs/1.50/provider_phone_app_updates/rbac_contracts.md†L1-L51】【F:Edulure-Flutter/lib/provider/runtime/provider_capability_bridge.dart†L1-L182】
3. **Telemetry first** – Slack escalation tests, device registration, and webhook replay events surface toast + banner telemetry, feeding the integrations dashboard and the operator command centre without duplicate instrumentation.【F:Edulure-Flutter/lib/services/notification_preference_service.dart†L369-L706】【F:frontend-reactjs/src/pages/dashboard/AdminOperator.jsx†L19-L371】

## Layout & Interaction Model
- **Channel Matrix:** Reuse the two-column layout (channel vs. incident category) with sticky header summarising tenant defaults. Provider categories must add `Campaign Spend`, `Moderation Escalations`, and `CRM Sync Failures`, each color-coded to the severity palette already documented for operator dashboards.【F:update_docs/1.50/ui-ux_updates/web_app_wireframe_changes.md†L125-L188】
- **Capability Badges:** Each row displays a pill showing the capability required to change the toggle. When a provider lacks access, the toggle enters a disabled state with tooltip copy referencing the relevant guardrail from the RBAC contracts. This matches the manifest lock chips used across other provider surfaces.【F:update_docs/1.50/provider_phone_app_updates/ads_creation_oversight_roadmap.md†L77-L132】
- **Slack Escalation Card:** Persist the learner escalation card copy but update helper text to clarify provider routing (`#provider-ops`, `#ads-oversight`). Slack channel pickers must prefill from the tenant integration API key metadata and expose a “Send Test” CTA that triggers the Slack dispatcher already implemented in the preference service.【F:backend-nodejs/src/services/IntegrationApiKeyService.js†L1-L316】【F:Edulure-Flutter/lib/services/notification_preference_service.dart†L562-L706】
- **Device Registration Status:** Display the latest FCM token registration timestamp, manifest version, and webhook handshake status pulled from the cached preference model so on-call operators can quickly diagnose delivery gaps before escalating.【F:Edulure-Flutter/lib/services/push_notification_service.dart†L24-L155】

## Offline & Failure States
- Persist pending toggle updates and Slack test requests into the Hive outbox already leveraged by the learner app. Provider shells replay the queue after connectivity restoration, with an inline banner matching the offline style defined in the notification hub wireframes.【F:Edulure-Flutter/lib/services/notification_preference_service.dart†L441-L706】【F:update_docs/1.50/ui-ux_updates/user_app_wireframe_changes.md†L176-L179】
- If webhook deliveries fail, surface a red badge with “Retry queued” copy plus a link to the integrations parity checklist so operators can follow the documented remediation path.【F:update_docs/1.50/provider_phone_app_updates/integration_parity_checklist.md†L8-L42】

## Accessibility & Motion
- Toggle controls must respond to dynamic text scaling up to 200% without truncating capability pills; leverage the typography tokens captured in the application design update plan.【F:update_docs/1.50/ui-ux_updates/Design_Task_Plan_Upgrade/Application_Design_Update_Plan/Application Design Update.md†L12-L52】
- Provide haptic feedback for critical state changes (Slack enable, campaign escalation disable) and ensure all CTAs expose `Semantics` labels for TalkBack/VoiceOver parity.
- Maintain WCAG 2.2 AA contrast for severity badges by reusing the existing feedback palette and border treatments from the learner notification hub.【F:update_docs/1.50/ui-ux_updates/user_app_wireframe_changes.md†L176-L179】

## Copy & Tone
- Use direct, action-oriented microcopy (e.g., “Escalate failed CRM syncs to #provider-ops”) and include SLA reminders where relevant: “Campaign spend alerts must remain enabled during active promotions.”
- Error banners should cite the downstream log or dashboard to reference (e.g., “Retry stored; review Sync Run 4381 in Integrations Control Centre”).【F:frontend-reactjs/src/pages/dashboard/AdminIntegrations.jsx†L1-L620】

## Implementation Handoff Checklist
1. Create provider-specific storybook entries demonstrating capability-locked toggles, offline banners, Slack success/error toasts, and webhook retry badges.
2. Reuse the shared `NotificationPreferenceService` by injecting provider persona metadata (role context, Slack channel defaults) during bootstrap; ensure parity with learner caching semantics before QA sign-off.【F:Edulure-Flutter/lib/services/notification_preference_service.dart†L89-L221】
3. Document analytics events (`provider.notifications.channel.updated`, `provider.notifications.slack.tested`) with payload schema referencing capability and incident type for instrumentation parity.
4. Update QA scripts to include biometric-unlock flows if preferences are locked behind credential revalidation, mirroring the learner security posture.

Adhering to these guidelines keeps provider notification management production-ready from the first release while minimising bespoke discovery across design and engineering squads.
