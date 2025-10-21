# iOS Release Notes – v1.4.0

## Highlights
- Delivered **Learning Streak Analytics** with SwiftUI charts, offline caching using Core Data, and background refresh tasks scheduled via `BGAppRefreshTask`.
- Added **SharePlay study sessions** allowing up to 8 learners to synchronise practice modules during FaceTime calls.
- Implemented **RBAC-aware instructor console** that hides payout and roster tabs unless JWT contains authorised scopes.

## Platform compatibility
- Minimum iOS 15.0, optimised for iOS 17.4.
- Validated on iPhone 11, iPhone 13, iPhone 15 Pro, iPhone SE (3rd gen), iPad Mini (6th gen), iPad Pro 12.9".
- Supports Dynamic Island for streak progress notifications, providing quick access to recovery actions.

## Performance & stability
- Cold start reduced by 15% via lazy loading of analytics stores and on-demand resources.
- Memory usage trimmed by 18% on iPad by pooling chart data models and enabling instrumented leak detection.
- Crash-free sessions at 99.6% in TestFlight; resolved concurrency crash in downloads manager by serialising writes.

## Security & privacy
- Utilises Keychain with biometry policy for refresh token storage; triggers re-authentication on device compromise detection.
- App Transport Security pinned to TLS 1.2+ with certificate pinning aligned to backend rotation.
- Privacy nutrition label updated to list analytics, diagnostics, and contact info usage; telemetry toggles propagate instantly.

## QA coverage
- 142 XCTest + XCUITest cases covering streak charts, SharePlay flows, purchases, and offline downloads.
- VoiceOver walkthrough ensures all controls have meaningful labels; rotor navigation works on streak charts.
- Manual regression executed for in-app purchases, push notification opt-in, deep links, and offline login grace period.

## Distribution
- Build 1.4.0 (104000) signed with production certificate; provisioning profiles renewed (expiry 2026-05-18).
- TestFlight 25-member beta approved; release targeted for phased rollout (1%, 10%, 50%, 100%).
- Store metadata refreshed with 6.7" and 12.9" screenshots, updated keywords, and promotional text for streak analytics.

## Known issues & mitigations
- SharePlay participants may observe delayed progress sync if host switches networks; fallback prompts manual refresh.
- iPad split-screen occasionally truncates tooltip popovers; UI fix planned for 1.4.1 with size class detection tweak.
