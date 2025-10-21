# Edulure Flutter App

Companion mobile experience for the Edulure platform. Implements home, login, registration, live feed, and profile screens styled to match the core brand palette.

## Getting started

```bash
flutter pub get
flutter run
```

Routes available:

- `/` home marketing view
- `/login` secure login form
- `/register` Learnspace onboarding
- `/feed` live community feed mock
- `/profile` member profile overview
- `/provider-transition` provider migration announcements with RBAC-guarded actions

The app uses the Inter font via `google_fonts` and Material 3 design system.

## Provider transition hub

- Provider acknowledgements and status updates now validate the active Edulure role before
  sending any API calls. Administrators and provider operators can record updates while other
  roles see contextual messaging when actions are blocked.
- When the device is offline the hub automatically falls back to the cached announcement bundle
  and temporarily disables write actions so users do not lose context.

## Push notifications

The mobile client now configures Firebase Cloud Messaging and surfaces incoming
push alerts with `flutter_local_notifications`. Provide your Firebase project
configuration files (`google-services.json` / `GoogleService-Info.plist`) before
running the app to ensure tokens register correctly and background handlers fire
as expected.
