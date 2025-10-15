# Provider Phone App – Change Log

## 2024-06-18 – Capability & RBAC Bootstrap Foundations
- Added capability manifest and RBAC repositories tailored for the provider mobile app, including scoped caching and API audience routing to isolate provider telemetry from consumer traffic.
- Delivered a ProviderAppBootstrap harness that primes Hive, loads the provider-specific manifest, hydrates the RBAC matrix, and exposes parity evaluation helpers for onboarding future Flutter modules.
- Documented access evaluation envelopes so provider squads can audit consent requirements, guardrail thresholds, and audit log templates before wiring new surfaces.

## 2024-06-21 – Retention & Consent Governance Blueprint
- Authored a production-ready retention checklist and provider API contract catalogue so the future provider shell can execute GDPR deletion requests, escalate retention holds, and capture audit evidence without relying on the web console.【F:update_docs/1.50/provider_phone_app_updates/governance_retention_contracts.md†L1-L211】
- Implemented Flutter data contracts (`ProviderDsrRequest`, `ProviderConsentRecord`, `ProviderRetentionChecklist`) that parse the compliance payloads, compute SLA severity, and verify evidence/dual-signoff requirements before completion actions are exposed to operators.【F:Edulure-Flutter/lib/provider/runtime/provider_compliance_contracts.dart†L1-L302】
- Extended bootstrap documentation to reference compliance capabilities so RBAC guardrails can gate mutations like `compliance.dsr.manage`, ensuring parity with backend audit obligations.【F:update_docs/1.50/provider_phone_app_updates/provider_bootstrap_notes.md†L1-L34】【F:update_docs/1.50/provider_phone_app_updates/rbac_contracts.md†L1-L65】
