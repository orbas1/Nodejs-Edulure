# Build & Dependency Updates

- Added `flutter_markdown` to render provider transition briefs and milestone notes with production typography; flutter tooling must run `flutter pub get` to install the dependency before building.
- Documented the new optional Hive box (`provider_transition_announcements`) to ensure QA scripts include cache clearance and platform reviewers approve storage usage updates in release notes.
