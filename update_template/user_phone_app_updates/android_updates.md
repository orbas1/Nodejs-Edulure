# Android Release Notes – v1.4.0

## Highlights
- Introduced **Learning Streak Analytics** dashboard with weekly progress charts, leveraging on-device caching for offline reads and syncing via background workers when connectivity resumes.
- Added **instructor verification badges** and RBAC-aware menus that hide roster management unless the signed-in user has the `instructor.manage_roster` scope.
- Shipped **contextual push notifications** for streak recovery nudges with rate limiting and quiet-hour adherence.

## Platform compatibility
- Min SDK 24, Target SDK 34.
- Verified on Pixel 5 (Android 14), Pixel 6a (Android 15 beta 1), Samsung A54 (Android 14), OnePlus Nord 2 (Android 13).
- Performs gracefully under Doze/App Standby modes; background sync uses `WorkManager` with expedited jobs gated by battery level.

## Performance & stability
- App startup reduced by 12% by deferring analytics initialisation to splash-to-home transition.
- Crash-free sessions improved to 99.4% across beta cohort after resolving null pointer in offline downloads worker.
- Enabled StrictMode in debug builds to surface main-thread disk IO regressions before release.

## Security & privacy
- Hardened JWT refresh handling with automatic key rotation awareness and secure storage invalidation on 401 cascades.
- Updated TLS pin set to align with backend certificate rotation (May 2025 issuance).
- Telemetry consent recorded per profile and mirrored to backend preferences endpoint; honours user opt-out instantly.

## QA coverage
- 128 automated Espresso tests covering streak widgets, purchase flows, and offline download states.
- Manual smoke scripts validated payment recovery, MFA setup, password reset, and moderated community posts.
- Accessibility review confirms TalkBack labels, dynamic font scaling up to 200%, and contrast ratios ≥ 4.5:1.

## Rollout strategy
- Staged rollout: 20% (Day 1), 50% (Day 3), 100% (Day 7) contingent on maintaining crash threshold (≤ 1.5%) and ANR ≤ 0.05%.
- Play Console pre-launch report tracked; all device catalog warnings resolved (no unsupported ABI, camera, or location feature mismatches).

## Known issues & mitigations
- Rare double toast on offline comment retry (<0.2% of sessions); fix queued for 1.4.1.
- Background downloads paused while device is on metered networks; user messaging in settings explains limitation and offers override toggle.
