# Issue Report

## FE-812: Dispatch Offline Conflict Alerts
- **Impact:** Servicemen reconnecting after offline work might overwrite server updates without clear conflict messaging, risking duplicate or missed tasks.
- **Root Cause:** Conflict resolution modal not triggered when sync detects divergent timestamps.
- **Mitigation:** Implement client-side diff viewer and server merge policy returning conflict payloads; targeted for hotfix prior to GA.

## FE-809: Consent Ledger Telemetry Gap
- **Impact:** Failures in consent mutation API may go unnoticed, jeopardizing compliance commitments.
- **Root Cause:** Missing Grafana panels and alerting rules for consent endpoints.
- **Mitigation:** Instrument Prometheus metrics (`consent_mutation_error_rate`) and create dashboards; scheduled for sprint 2024.46.

## OPS-2198: Blue/Green Runbook Update
- **Impact:** Deployment engineers lack updated instructions for toggling feature flags and cache purges.
- **Root Cause:** Runbook not revised since LaunchDarkly integration.
- **Mitigation:** Documentation refresh with step-by-step guides and rollback timeline; owner assigned and due 2024-11-07.

## SEC-655: CSP Validation in Staging
- **Impact:** Potential CSP misconfiguration could reach production if not detected pre-deploy.
- **Root Cause:** ZAP baseline scan pipeline omits header validation following nginx upgrade.
- **Mitigation:** Extend ZAP script and integrate header checks into CI; AppSec to deliver update within current release window.

## INT-447: CRM Webhook Retry Policy
- **Impact:** Bursty retries can overload CRM endpoints and trigger throttling.
- **Root Cause:** Linear retry without jitter or idempotency key usage.
- **Mitigation:** Implement exponential backoff with jitter and enforce idempotency keys; low risk but planned for next maintenance window.

## UX-233: Provider Onboarding Checklist Copy
- **Impact:** Minor translation inconsistencies in FR/DE locales affecting comprehension.
- **Root Cause:** Legacy localization strings not updated with new copy.
- **Mitigation:** Completed translation review with language specialists; deployed in latest build.

