# Update Plan – Horizon Alignment Release

## Scope Summary
- **Web Application:** Consolidate dashboard navigation, introduce adaptive theming, and expand analytics widgets for instructors.
- **Mobile Application:** Modernize onboarding, simplify content discovery, and harmonize typography with the web experience.
- **Backend Services:** Harden RBAC policies, enforce scoped API keys, and normalize telemetry events for data warehouse ingestion.
- **Infrastructure & DevOps:** Expand CORS allowlists to include managed partner domains, add automated rollback validation, and tune observability alerts.

## Deliverables
1. **Feature Enhancements**
   - Contextual learning playlists with personalized recommendations.
   - Unified messaging inbox with read-state synchronization.
   - RBAC role pack update introducing `community_curator` and `learning_partner` roles with least-privilege permissions.
2. **Quality & Compliance**
   - SOC2-aligned audit logs for sign-in, privilege changes, and export actions.
   - Updated DPIA and privacy notices aligned with new data sharing agreements.
3. **Operational Tooling**
   - Build/test automation scripts in `update_tests/test_scripts` with reproducible execution steps.
   - Monitoring dashboards for API latency, websocket throughput, and Flutter crash-free sessions.

## Implementation Phases
1. **Planning (Week 1)**
   - Finalize acceptance criteria and success metrics (owner: Product Director).
   - Confirm data governance approvals and retention updates (owner: Security Lead).
2. **Development (Weeks 2-5)**
   - Execute backend stories in priority order, including database migrations with rollback plans.
   - Build responsive UI layouts, ensuring WCAG 2.1 AA compliance on key flows.
   - Update Flutter modules for real-time progress syncing and offline caching.
3. **Stabilization (Weeks 6-7)**
   - Run regression, accessibility, and performance testing using the provided scripts.
   - Conduct beta release with selected instructors; capture telemetry for conversion funnel.
4. **Launch & Hypercare (Weeks 8-9)**
   - Execute release readiness checklist, including RBAC verification and CORS smoke tests.
   - Monitor production telemetry; hold twice-daily triage meetings during hypercare.

## Dependencies & Risks
| Dependency | Owner | Risk | Mitigation |
| --- | --- | --- | --- |
| Partner SSO metadata updates | Security Lead | Delayed metadata blocks QA on enterprise login | Prepare fallback manual metadata import; maintain legacy metadata until cutover. |
| Stripe Connect regional rollout | Finance Engineering | New account statuses could block payouts | Sandbox regression suite, manual verification of payout jobs pre-launch. |
| Flutter 3.22 SDK availability | Mobile Lead | Potential upgrade delay or breaking changes | Lock toolchain to 3.22.2, document hotfix plan in user app test script. |
| Data warehouse schema evolution | Analytics Lead | Breaking change could block dashboards | Stage migrations in shadow schema, run nightly reconciliation tests. |

## Communication Plan
- **Status Reports:** Delivered every Friday to executive steering committee.
- **Issue Escalation:** Use PagerDuty for Sev-1/Sev-2; Slack channel `#release-horizon-incident` for coordination.
- **Documentation:** All updates recorded in this template with backlinks from Jira (project key: EDUHZN).

## Acceptance Criteria
- All progress tracker dimensions must reach ≥95% with documented evidence.
- No open P0/P1 bugs at release readiness review.
- RBAC audit confirms role coverage for 100% of user journeys outlined in `ui-ux_updates`.
- CORS configuration verified against partner domain inventory with automated tests.
- Mobile and web NPS baseline maintained or improved in pilot cohort feedback.

## Rollback Strategy
1. Maintain blue/green deployments for backend and web front-end with automated traffic switching.
2. Capture nightly database snapshots plus point-in-time recovery markers during launch week.
3. Feature flags guard all net-new capabilities; disable to revert to legacy flows without redeploy.
4. Flutter app updates staged with phased rollout (10% → 50% → 100%); ability to pause via store consoles.

## Compliance Checklist
- ✅ DPIA revalidated and archived in compliance drive.
- ✅ Updated ToS and Privacy Policy ready for publish alongside release notes.
- ✅ Penetration test scheduled for Week 7 with remediation window before launch.
- ✅ Export control review confirms no restricted data is exposed through new APIs.
