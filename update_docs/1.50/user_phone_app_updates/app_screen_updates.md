# Version 1.50 – Screen Experience Updates

## Shared Shell Enhancements
- Every primary route now inherits the capability manifest banner so outage messaging appears above dashboards, feeds, and transactional flows without per-screen wiring.【F:Edulure-Flutter/lib/widgets/capability_status_banner.dart†L1-L218】【F:Edulure-Flutter/lib/main.dart†L1-L140】
- Banner chips highlight the first four impacted capabilities while keeping navigation accessible, matching the operator guidance from the desktop experience.【F:Edulure-Flutter/lib/widgets/capability_status_banner.dart†L151-L182】

## Resiliency & Offline States
- Cached manifest metadata is surfaced when the device is offline, including “showing cached status” pills so support agents can reconcile reports from field testers.【F:Edulure-Flutter/lib/widgets/capability_status_banner.dart†L103-L150】【F:Edulure-Flutter/lib/core/runtime/capability_manifest_models.dart†L1-L208】
- Manual refresh controls route through the notifier to retry degraded services without forcing a full app restart, improving operator workflows during partial outages.【F:Edulure-Flutter/lib/core/runtime/capability_manifest_notifier.dart†L58-L112】【F:Edulure-Flutter/lib/widgets/capability_status_banner.dart†L118-L149】
