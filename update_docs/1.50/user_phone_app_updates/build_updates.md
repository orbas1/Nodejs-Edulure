# Build & Dependency Updates

- Added `dio`, `hive_flutter`, `path_provider`, and `open_filex` to `pubspec.yaml` to support secure sessions, network access, file storage, and offline viewing.
- Requires `flutter pub get` before builds; tooling not available in-container so lockfile regeneration must occur in CI/local environments.
