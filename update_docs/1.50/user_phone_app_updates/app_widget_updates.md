# Version 1.50 – Mobile Widget Updates

## Global Shell
- Introduced `CapabilityStatusBanner`, a Riverpod-aware overlay that attaches to the MaterialApp builder and displays outage/degraded states with contextual chips, cached-state messaging, and refresh controls for enterprise incident parity.【F:Edulure-Flutter/lib/widgets/capability_status_banner.dart†L1-L218】【F:Edulure-Flutter/lib/main.dart†L1-L140】
- Added animated transitions and SafeArea handling so the banner coexists with existing navigation stacks without affecting gesture areas or page layouts.【F:Edulure-Flutter/lib/widgets/capability_status_banner.dart†L73-L166】

## Bootstrap & State Management
- Connected `AppBootstrap` to warm both feature flags and capability manifests in parallel, ensuring readiness telemetry is available before routing decisions occur.【F:Edulure-Flutter/lib/bootstrap/app_bootstrap.dart†L19-L58】
- Built `CapabilityManifestNotifier` and Hive-backed repository to manage cached health snapshots, refresh retries, and telemetry logging for resiliency scenarios.【F:Edulure-Flutter/lib/core/runtime/capability_manifest_notifier.dart†L1-L112】【F:Edulure-Flutter/lib/core/runtime/capability_manifest_repository.dart†L1-L88】
