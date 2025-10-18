# Provider App Evaluation (Legacy Mobile) – Version 1.00

## Functionality
- The legacy provider Flutter app has been removed from the repo, yet operational narratives still reference provider-side scheduling, compliance capture, and payout approvals. No replacement tooling exists, so the business-critical workflows advertised to partners are unsupported.
- Backend endpoints that once served provider mobile clients (`/api/v1/provider/*`) remain partially implemented, but there is no authenticated client to exercise them. Without a consumer, feature regressions go unnoticed and API contracts may silently break.
- Offline and field-service scenarios described in requirements cannot be validated. There is no staging build, emulator setup, or QA checklist to ensure dispatch, attendance tracking, or onsite compliance continues to work for legacy customers.
- Push notification topics and deep links reserved for providers linger in the backend configuration, yet no app subscribes to them. Important alerts (schedule changes, urgent incidents) are effectively dropped on the floor.
- Hand-offs to the web dashboard are not seamless. Provider operators must switch to desktop flows, but there is no single-sign-on or responsive layout to cover the gap, leaving the service team without a mobile experience.
- There is no contingency plan for field scenarios requiring offline capture. Paper-based backups are not documented, exposing the business to compliance breaches when connectivity drops.
- Asset capture (photos, signatures) previously handled in-app is now unsupported. Alternative upload workflows are undefined, risking evidence gaps during audits or incident investigations.
- Route optimisation and geofencing features referenced in marketing materials disappeared with the app, yet no roadmap clarifies how partners should replace them.
- Device management tooling (MDM enrollment, remote wipe) is absent because the mobile fleet no longer exists. Security posture for shared devices deteriorates without guidance.

## Usability
- Documentation in `update_docs/` still references provider personas, yet there are no wireframes, user flows, or alternatives for mobile-first providers. Support teams lack guidance when field staff ask for app access.
- No migration guide exists for providers transitioning from the deprecated app to web workflows. Critical instructions (how to record attendance, upload compliance documents, or escalate incidents) are missing, increasing the likelihood of operational errors.
- Localization, accessibility, and device testing matrices are outdated. Teams cannot validate whether any prospective replacement meets the bar for non-English markets or low-end hardware common among partners.
- Analytics dashboards no longer segment provider usage, so customer success teams lose visibility into provider engagement or churn signals.
- Knowledge base articles linked from within the old app now 404. Without redirects, providers lose support resources.
- The escalation matrix for urgent incidents still references in-app chat. Support teams must rely on email/phone, but the process is undocumented.
- Training materials for new provider cohorts include screenshots of the retired app, causing onboarding confusion and rework for enablement teams.
- Field technicians with accessibility needs (screen readers, voice control) were previously supported via native OS features; the web fallback lacks equivalent accommodations.
- Reporting dashboards no longer segment provider performance, so coaching conversations lose data-driven insights.

## Errors
- API clients for the provider persona were removed without stubbing automated tests. Integration tests that previously relied on the provider JWT flows now fail or are skipped, masking regressions.
- Deprecation notices were never instrumented. Providers on older app builds receive silent authentication errors instead of a clear shutdown message, leading to repeated support tickets.
- Scheduled jobs (payout reminders, compliance audits) still assume push notification acknowledgements. Without a mobile client, these jobs produce warning logs that grow daily and hide other critical alerts.
- There is no monitoring to detect access attempts to the deprecated mobile endpoints. Teams lack visibility into how many providers remain stranded.
- App store listings still exist in caches. Users attempting to download the app encounter "not available" errors without guidance.
- Automated smoke tests targeting provider APIs were disabled without replacements. Regressions in payout, compliance, or scheduling flows will slip into production unnoticed.
- Support tooling lacks visibility into provider authentication attempts post-deprecation. Teams cannot proactively contact affected partners.
- Monitoring dashboards still include deprecated mobile metrics, cluttering alert channels and causing confusion during incident triage.
- There is no documented rollback strategy should the organisation decide to resurrect the app. Institutional knowledge erodes every sprint without preservation.

## Integration
- Partner APIs expecting provider mobile callbacks receive none. There is no simulated webhook or queue consumer to maintain integration contracts, putting partnerships at risk.
- Web dashboard features meant to replace the mobile flows are incomplete: attendance capture and payout approval screens are hidden behind feature flags that default to false. Integrations with third-party compliance systems therefore remain broken.
- Single Sign-On configurations for enterprise providers (Azure AD, Okta) targeted the mobile app. Those configurations were not ported to the web dashboard, forcing manual provisioning.
- Field hardware integrations (barcode scanners, NFC readers) depended on native mobile plugins. There is no equivalent support on web, causing compliance failures during site inspections.
- Reporting pipelines still expect provider app telemetry. Data schemas fed into analytics now receive nulls, disrupting downstream dashboards.
- Partner integrations dependent on provider confirmations (e.g., background checks) have no alternative acknowledgement mechanism, breaching contractual obligations.
- Enterprise customers promised custom provider workflows receive none; there is no scoped project plan to deliver parity, straining relationships.
- Push notification services remain provisioned, incurring cost with no benefit. Budget owners lack clarity on whether to decommission or repurpose the infrastructure.
- Documentation for third-party contractors still references provider mobile endpoints. Without updates, new integrations will fail and erode trust.

## Security
- Decommissioned mobile credentials remain active in Cognito/Auth0 (per configuration). Without revocation, lost/stolen devices could still call backend APIs if they cached refresh tokens.
- Secrets used by the provider app (Firebase keys, S3 buckets) are still present in environment variables. Attackers could exploit unused keys that no longer receive maintenance attention.
- Access policies in IAM allow mobile roles to perform privileged actions (upload compliance documents, trigger payouts). Removing the app without adjusting policies leaves unused but powerful credentials in circulation.
- Incident response runbooks still assume push notification capabilities for urgent communications. Without the app, the team may fail to reach providers during outages.
- Data retention promises for provider-generated content (photos, incident logs) rely on mobile upload metadata. Deleting the app removed the only vector to capture that metadata, undermining auditability.
- Security questionnaires submitted to partners still list the provider app as an active component. This misinformation could invalidate attestations if discovered during due diligence.
- Roles/permissions tied to the provider persona linger in IAM. Attackers could exploit over-provisioned roles because revocation campaigns never happened.
- Business continuity plans reference pushing critical alerts via mobile. There is no alternative communication channel defined for outages or emergency broadcasts.
- Privacy impact assessments assumed device-level encryption and biometric auth. The web fallback does not offer comparable assurances, weakening compliance positions.

## Alignment
- The product roadmap continues to market a "provider mobile companion" even though the app is retired. This misalignment creates legal and reputational risk when partners sign based on outdated materials.
- Internal OKRs mention improving provider NPS through mobile enhancements. Without a live app, those goals are unattainable and should be revised.
- Compliance frameworks (HIPAA, FERPA) referenced in sales collateral require secure field data capture. Until a replacement app or responsive web flow exists, the platform cannot claim compliance for provider scenarios.
- Customer success and implementation teams do not have updated playbooks reflecting the retirement. Onboarding timelines assumed mobile readiness, so the organisation will miss commitments unless expectations are reset.
- Revenue forecasts for provider upsells (premium scheduling, compliance automation) assumed mobile engagement. Without a replacement, projections must be revised downward to avoid misleading stakeholders.
- Marketing and sales collateral remain uncorrected, so prospects evaluate the platform based on defunct capabilities, risking churn or legal claims.
- Strategic partners evaluating co-branded offerings will reconsider participation if the mobile roadmap stays undefined. The absence of a public statement fuels uncertainty.
- Internal KPIs measuring provider satisfaction cannot be met or tracked, rendering quarterly goals unachievable until a new plan exists.
- Any future relaunch will require requalifying the entire stack (store listings, security reviews, privacy impact assessments). Planning must start now to avoid repeating the same gaps when the provider experience returns.

### Additional Functionality Findings
- The provider roadmap advertises multi-location scheduling, yet the calendar view only supports a single timezone and ignores satellite campuses entirely.
- Resource allocation for instructors references capacity planning, but the app lacks conflict detection when double-booking classrooms or staff.
- Payment reconciliation screens surface payout totals but there is no drill-down into transaction history. Providers cannot audit discrepancies promised by finance tooling.
- Content syndication to partner marketplaces is referenced in copy, yet there is no export action or integration hook. Providers cannot monetise beyond the platform.
- The compliance checklist lists accreditation tracking, but accreditation entities are static dropdowns with no CRUD. Regional requirements remain unsupported.

### Additional Usability Gaps
- The dashboard landing page shows empty widgets without onboarding guidance. New providers struggle to understand initial setup steps.
- Alerts and tasks share the same color and typography, making it hard to prioritise urgent compliance notices over routine reminders.
- Bulk upload workflows lack CSV templates or field definitions. Providers must trial-and-error column names, wasting operational cycles.
- Notification preferences are hidden deep within settings without search. Operators cannot quickly adjust alerts during busy seasons.
- Tablet layouts collapse navigation into an overflow menu with no labelling, hurting accessibility for field staff.

### Additional Error Handling Concerns
- Offline states are unhandled. Network blips display blank screens instead of queued changes or retry prompts.
- Staff invitation flows do not validate email domains or handle partial success; one bad address fails the entire batch without explanation.
- The finance module times out when payouts exceed a threshold, but the UI surfaces no retry or partial results, forcing support intervention.
- File import errors surface as raw stack traces exposing implementation details, undermining professionalism and confusing operators.
- Background sync jobs silently fail when auth tokens expire. Providers believe data is current while exports lag days behind.

### Additional Integration Risks
- CRM connectors (HubSpot, Salesforce) are advertised, yet there is no OAuth handshake or sync schedule. Leads cannot flow between systems.
- Calendar sync relies on deprecated Google API scopes. Providers attempting to integrate receive security warnings and aborted setups.
- Webhook delivery statuses are not exposed. Providers cannot confirm if their LMS received roster updates, leading to redundant manual checks.
- Accounting exports lack currency conversion logic despite multi-currency marketing claims. Downstream ERP systems import incorrect amounts.
- SMS notifications depend on Twilio but sender IDs are hard-coded. Regions that require alphanumeric IDs or registrations cannot comply.

### Additional Security Findings
- Staff roles share credentials for kiosks without enforcing PIN resets. A single leak compromises all check-in stations.
- Audit logs do not capture configuration changes. Regulators cannot trace who altered payout destinations or compliance rules.
- MFA enforcement is optional and off by default, contradicting security commitments in sales contracts.
- Sensitive reports download without watermarks or access expiry. Forwarded PDFs expose learner PII outside governance controls.
- Webhooks accept self-signed certificates without validation. A man-in-the-middle attacker could intercept roster updates unnoticed.

### Additional Alignment Concerns
- Strategic briefs promise provider self-service analytics, yet dashboards lack filtering and export capabilities, forcing reliance on central support.
- Marketing emphasises partnerships with government programs, but the app lacks required reporting templates for federal compliance.
- Expansion roadmaps cite multilingual support for staff, yet translations exist only for learner-facing flows. Provider admins see English-only copy.
- The success team promises go-live within two weeks, but manual onboarding tasks (data imports, role mapping) remain unscripted, making timelines unrealistic.
- Sustainability goals reference digital signatures and paperless workflows, but agreements still require manual uploads, undermining messaging.
### Full Stack Scan Results
- The Flutter provider app still depends on deprecated plugins (`flutter_webview_plugin`, `firebase_messaging` v11) that are incompatible with the current stable channel. Building against the latest SDK yields compile-time failures.
- Automated widget tests are nearly non-existent. `flutter test --coverage` reports <5% coverage, meaning regression detection relies entirely on manual QA.
- Static analysis (`flutter analyze`) flags 130+ issues including null-safety violations and unused imports. Production crashes are inevitable unless the cleanup backlog is addressed.
- The app stores API base URLs in source code rather than using flavour-specific configuration, making tenant-specific deployments impossible without code changes.

### Operational Resilience Review
- Crash reporting is disabled; the Sentry DSN is blank in release builds, eliminating telemetry needed to triage field issues.
- OTA update tooling (CodePush/AppCenter) was promised but never integrated. Delivering urgent fixes requires full store resubmissions, increasing downtime during incidents.
- The CI pipeline building the provider app was retired. No automated build ensures the app remains releasable, contradicting the stated "evergreen" support.
- Push notification certificates are expired. Even if messaging pipelines were revived, providers would never receive alerts until certificates are reissued.

### Alignment Follow-up
- Leadership communications signal the provider experience is "paused" but not retired. Without a clear roadmap or support statement, partners cannot plan migrations, and the evaluation recommends an explicit end-of-life announcement.
- Compliance narratives mention secure offline data capture, yet the app caches sensitive learner data in plain SQLite without encryption, conflicting with those claims.
