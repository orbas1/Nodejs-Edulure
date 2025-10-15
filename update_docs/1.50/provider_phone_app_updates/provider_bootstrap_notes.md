# Provider App Bootstrap Notes

## Capability & RBAC Initialisation
- `ProviderAppBootstrap` initializes Hive once, wires the `CapabilityManifestRepository` and `RbacMatrixRepository` with the `provider-mobile` audience, and warms both caches before returning control to the UI shell.
- The bootstrap exposes a `ProviderCapabilityBridge` change notifier so feature modules can subscribe to combined manifest + RBAC state changes and drive banner, toast, or navigation behaviour.

## Access Envelope Consumption
- Modules should call `bootstrap.evaluate('capability.key', action: 'perform')` to receive a `CapabilityAccessEnvelope` describing:
  - `allowed`: whether the provider roles and manifest allow the capability.
  - `requiresConsent`: if additional consent capture is required before executing the action.
  - `guardrail`: guardrail metadata describing alert thresholds and two-person rule requirements.
  - `auditContext`: resolved audit template for structured logging.
- Envelopes should be cached at the module level for immediate UX decisions and revalidated on manifest refresh events.

## Error & Incident Handling
- `ProviderCapabilityBridge.state.error` surfaces bootstrap or refresh failures; shells must surface retry affordances and log incidents to the operator dashboards.
- Refresh routines should call `refreshOperationalState(force: true)` after incident acknowledgement or role changes to avoid stale RBAC data.

## Future Integration Checklist
- Instrument telemetry for bridge warm/refresh timings to feed operator dashboards and incident alerting.
- Coordinate with backend to version RBAC schemas as new provider capabilities roll out; repository parsing logic already tolerates additional JSON fields for forward compatibility.
- Extend provider design artefacts with high-fidelity mocks referencing the RBAC lock states documented in `rbac_contracts.md` before engineering begins implementing provider surfaces.
- Map compliance flows to the new `ProviderComplianceContracts` so DSR management, consent revocation, and escalation actions can reuse the same SLA calculations, evidence validation, and dual-signoff checks outlined in the governance blueprint.【F:update_docs/1.50/provider_phone_app_updates/governance_retention_contracts.md†L24-L211】【F:Edulure-Flutter/lib/provider/runtime/provider_compliance_contracts.dart†L1-L302】
