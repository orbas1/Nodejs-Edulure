# Mobile Release Upload Brief

## Objective
Prepare the Edulure mobile applications (Android v1.4.0, iOS v1.4.0) for store submission with full parity to the May 2025 backend and frontend feature set. This upload synchronises new learning streak analytics, enhanced RBAC enforcement for instructor tools, refreshed branding, and stability fixes surfaced by the canary cohort.

## Scope
- **Platforms:** Google Play (internal, closed, production tracks) and Apple App Store (TestFlight, phased release).
- **Bundles:**
  - Android: `com.edulure.app` bundle version code 104000, minSdk 24, targetSdk 34.
  - iOS: `com.edulure.app` build 1.4.0 (104000), iOS 15+ universal binary.
- **Backend dependencies:** Requires deployment of Node.js API v1.21.0 and telemetry warehouse schema v5 applied before submitting binaries.
- **Data migrations:** No destructive migrations; feature flags default to off until post-approval toggle.

## Release timeline
| Milestone | Owner | Target date |
| --- | --- | --- |
| Binary freeze | Mobile lead | 2025-05-27 |
| Compliance audit & penetration retest | Security | 2025-05-28 |
| Store metadata update | Marketing | 2025-05-29 |
| Store submission | Mobile lead | 2025-05-29 |
| Staged rollout (20%) | Mobile lead | 2025-06-03 |
| Full rollout | Mobile lead | 2025-06-06 |

## Store deliverables
- Updated descriptions emphasising streak analytics, verified instructor badges, and offline downloads.
- Screenshots regenerated in dark and light modes across phone and tablet breakpoints.
- Privacy questionnaire refreshed to cover background location opt-in (Android) and push notification rationale (iOS).
- New marketing icon aligned with React web refresh (2025 palette).

## Compliance and security
- RBAC: Instructor roster, payout configuration, and moderation panels hardened with policy checks mapped to backend scopes `instructor.manage_roster`, `finance.manage_payouts`, `community.review_flags`.
- CORS: Mobile web views rely on backend whitelist `app.edulure.com`, `cdn.edulure.com`, and `accounts.edulure.com`; verified preflight behaviour via automated API smoke tests.
- Data handling: Crash reports redacted (user PII hashed), telemetry opt-out stored per device in encrypted shared preferences / Keychain.
- Legal artefacts: Third-party SDK disclosures appended to privacy policy (Amplitude, RevenueCat, Firebase Cloud Messaging).

## Testing summary
- Automated UI suite (Flutter integration tests) green on Android emulator API 34 and iOS 17.4 simulators.
- Manual exploratory checklist executed on Pixel 6a, Samsung A54, iPhone 13, iPad Mini; no blocking regressions.
- Regression verified for login, multi-factor enrolment, purchases, downloads, and background sync with throttled network profiles.

## Rollback plan
- Maintain previous binaries (v1.3.2) in both stores with staged rollout paused if crash-free sessions dip below 97%.
- Backend feature flags allow disabling streak analytics, new widgets, and community presence streaming without re-uploading clients.

## Communications
- Status updates posted in `#launch-mobile` Slack channel at each milestone.
- Customer success briefed with support macros for new features and known limitations.
