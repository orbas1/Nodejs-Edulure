# Provider RBAC Contracts & Capability Hooks

## Overview
The provider mobile application inherits the same capability manifest service consumed by the consumer app, but enforces additional RBAC checks to gate operator tooling. The following contracts ensure the future provider shell can evaluate capability access without reimplementing manifest parsing logic.

## Data Contracts
- **Capability Manifest (provider audience):** Queried via `/runtime/manifest?audience=provider-mobile`. Responses map to `CapabilityManifest` models shared with the consumer app.
- **RBAC Matrix (provider audience):** Queried via `/runtime/rbac-matrix?audience=provider-mobile`. Payloads map to the new `RbacMatrix` model featuring:
  - Roles with region-aware capability grants.
  - Capability policies annotated with consent requirements and audit templates.
  - Guardrails capturing rollout strategy, alert thresholds, and two-person controls.

## ProviderRoleContext
```
ProviderRoleContext(
  providerId: 'academy-ops-01',
  roles: {'org_admin', 'incident_responder'},
  region: 'apac',
)
```
- Represents the authenticated provider account and its aggregated roles.
- Passed into `ProviderAppBootstrap` to scope RBAC evaluation per authenticated user.

## Access Evaluation Flow
1. `ProviderAppBootstrap.initialise()` primes Hive, hydrates the provider manifest and RBAC matrix, and exposes a `ProviderCapabilityBridge` instance.
2. When UI modules request access to a capability (e.g. `messaging.escalations.approve`), they call `capabilityBridge.accessFor('messaging.escalations.approve', action: 'approve')`.
3. The bridge resolves:
   - Role-based permission from the cached RBAC matrix.
   - Manifest health and enablement status for the capability.
   - Guardrail metadata (two-person rule, alert thresholds) for UI messaging.
4. The returned `CapabilityAccessEnvelope` indicates whether the feature should render, whether consent gating applies, and which audit strings to log.

## Error Handling
- Bridge initialisation surfaces errors via the notifier `state.error` property. Provider modules must observe the stream and implement retry/alert surfaces.
- Missing matrix/manifest data raises `StateError` to prevent silent insecure fallbacks.
- Refresh calls always force network retrieval to avoid stale RBAC data during incident response.

## Audit & Telemetry
- Audit templates embed `{providerId}` and `{capability}` tokens resolved by the bridge, ensuring audit logs are structured consistently.
- Guardrail data is preserved in the access envelope so analytics can track when two-person rules or threshold alerts apply.
