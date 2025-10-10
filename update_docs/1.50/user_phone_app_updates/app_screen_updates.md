# Screen Updates

## HomeScreen
- Displays cached asset count from Hive to hint at offline availability and provides quick navigation to the new content library.

## LoginScreen
- Implements real authentication with email/password controllers, error handling, and success snackbars before redirecting to `/content`.

## ContentLibraryScreen
- Lists R2-hosted assets with status chips, download/open buttons, and DRM-compliant "Mark complete" actions for ebooks.
- Integrates pull-to-refresh, offline cache hydration, and snackbar feedback for downloads/progress updates.
