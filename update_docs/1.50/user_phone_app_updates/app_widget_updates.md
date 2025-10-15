# Version 1.50 – Mobile Widget Updates

## Global Shell
- Introduced `CapabilityStatusBanner`, a Riverpod-aware overlay that attaches to the MaterialApp builder and displays outage/degraded states with contextual chips, cached-state messaging, and refresh controls for enterprise incident parity.【F:Edulure-Flutter/lib/widgets/capability_status_banner.dart†L1-L218】【F:Edulure-Flutter/lib/main.dart†L1-L140】
- Added animated transitions and SafeArea handling so the banner coexists with existing navigation stacks without affecting gesture areas or page layouts.【F:Edulure-Flutter/lib/widgets/capability_status_banner.dart†L73-L166】

## Bootstrap & State Management
- Connected `AppBootstrap` to warm both feature flags and capability manifests in parallel, ensuring readiness telemetry is available before routing decisions occur.【F:Edulure-Flutter/lib/bootstrap/app_bootstrap.dart†L19-L58】
- Built `CapabilityManifestNotifier` and Hive-backed repository to manage cached health snapshots, refresh retries, and telemetry logging for resiliency scenarios.【F:Edulure-Flutter/lib/core/runtime/capability_manifest_notifier.dart†L1-L112】【F:Edulure-Flutter/lib/core/runtime/capability_manifest_repository.dart†L1-L88】

## Privacy Tooling
- Session manager now exposes dedicated privacy preference storage and purge helpers so logout flows remove consent metadata alongside cached dashboards, guaranteeing revocations clear local state.【F:Edulure-Flutter/lib/services/session_manager.dart†L59-L110】
- Lightweight `DsrClient` abstraction enables widgets to file GDPR data access requests while remaining testable through injected fakes in the new widget tests.【F:Edulure-Flutter/lib/services/dsr_client.dart†L1-L10】【F:Edulure-Flutter/test/home_screen_test.dart†L8-L39】

## Creation Companion Entry Points
- Service suite screen surfaces a creation companion teaser card with project counts, offline sync status, and CTA linking into the mobile workspace so instructors notice pending tasks immediately.【F:Edulure-Flutter/lib/screens/service_suite_screen.dart†L40-L220】
- Home quick actions expose a "Creation Companion" button for instructors, gated by capability checks and featuring badge counts derived from queued project activity.【F:Edulure-Flutter/lib/screens/home_screen.dart†L180-L320】
