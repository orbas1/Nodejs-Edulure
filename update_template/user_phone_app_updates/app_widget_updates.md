# Widget & Extension Updates – Mobile v1.4.0

## Android Widgets
- **Learning Streak Widget** redesigned with Material You theming, dynamic colour extraction, and compact/expanded states.
- Added quick actions for `Start Practice`, `View Streak`, and `Download Lesson` linking directly to in-app deep links with authentication guard.
- Refresh cadence optimised via `Glance` APIs, falling back to manual refresh when background restrictions detected.
- Ensured data encryption at rest by storing widget cache in `EncryptedSharedPreferences` with biometric fallback for manual refresh.

## iOS Widgets
- Introduced **Medium Streak Summary** widget built with WidgetKit, supporting ActivityKit Live Activity when learner is in an ongoing streak challenge.
- Added lock screen widget for quick streak glance; respects Focus modes and only surfaces notifications when allowed.
- Widget timeline provider caches data in App Group container with background refresh limited to once per hour to conserve battery.
- Deep link routing updated to require authenticated session; unauthenticated states redirect to login with preserved target context.

## Notification extensions
- Android notification channel `streak_recovery` configured with high importance, custom sound, and Do Not Disturb exemption request for opt-in users.
- iOS Notification Service Extension formats streak nudges with inline charts using `UNNotificationContentExtension` while stripping PII from payloads.
- Added analytics events `widget_tap` and `widget_refresh` capturing widget variant, context, and success/failure for telemetry dashboards.

## Testing & validation
- Automated UI snapshot tests covering light/dark themes and large/small widget configurations.
- Manual tests executed on Pixel 6a, Samsung Tab S8, iPhone 13, iPhone 15 Pro Max, and iPad Mini.
- Battery usage observed over 24 hours remained <1% delta across monitored devices.
