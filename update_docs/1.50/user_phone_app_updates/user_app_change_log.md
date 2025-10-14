# Version 1.50 – User Phone App Change Log

- Bootstrapped the Flutter container with capability manifest warm-up so cached service availability is ready before the UI mounts, preventing blank states when the API is slow or offline.【F:Edulure-Flutter/lib/bootstrap/app_bootstrap.dart†L1-L58】【F:Edulure-Flutter/lib/core/runtime/capability_manifest_notifier.dart†L1-L112】
- Added a manifest repository with Hive-backed caching to reuse the most recent health snapshot and gracefully handle refresh failures without losing telemetry context.【F:Edulure-Flutter/lib/core/runtime/capability_manifest_repository.dart†L1-L88】【F:Edulure-Flutter/lib/core/runtime/capability_manifest_models.dart†L1-L208】
- Delivered a global capability status banner that surfaces outage/degraded messaging, cached-state hints, and manual refresh controls across every route via the MaterialApp builder.【F:Edulure-Flutter/lib/widgets/capability_status_banner.dart†L1-L218】【F:Edulure-Flutter/lib/main.dart†L1-L140】
