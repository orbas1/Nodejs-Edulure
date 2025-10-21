# User App Change Log – v1.4.0 (May 2025)

## New features
- **Learning Streak Analytics:** Track daily goals, longest streaks, and recovery tips with offline access and cross-device sync.
- **Instructor verification badges:** Trusted instructors display verified status in feeds, messaging, and rosters.
- **SharePlay study rooms (iOS):** Collaborate with peers in real time during FaceTime sessions.
- **Material You & Dynamic Island enhancements:** Widgets and notifications now reflect personalised theming and provide faster actions.

## Improvements
- Streamlined login with faster biometric fallback and clearer MFA prompts.
- Enhanced offline downloads manager with storage insights and expiring content reminders.
- Community feed upgraded with richer presence indicators and moderation shortcuts for authorised roles.
- Push notifications observe quiet hours and provide smarter streak recovery nudges.

## Fixes
- Resolved rare crash when retrying downloads after network loss.
- Fixed duplicate toast message when posting offline comments (Android).
- Eliminated SharePlay desync when host device received phone call mid-session.
- Corrected timezone handling for streak calculations across daylight saving transitions.

## Security
- Updated TLS certificate pins and reinforced JWT refresh handling across both platforms.
- Added background device attestation for push token registration.
- Hardened RBAC enforcement—restricted menus hidden unless authorised scopes present.

## Known issues
- iPad split-screen may truncate tooltip popovers; temporarily recommend full-screen for analytics deep dives.
- Metered-network downloads paused by default; users can override in Settings > Downloads.

## Support
For assistance, contact support@edulure.com or view the support centre articles under “Streak Analytics” and “Instructor Tools”.
