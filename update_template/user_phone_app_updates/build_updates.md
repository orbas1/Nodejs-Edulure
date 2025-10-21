# Build & Distribution Updates – Mobile v1.4.0

## Toolchain
- Upgraded Flutter to 3.22.1 (Dart 3.4) with reproducible builds via `fvm` pinning and CI cache busting.
- Android Gradle Plugin bumped to 8.4.1; Gradle wrapper 8.7 with configuration cache enabled.
- Xcode 15.4 baseline; Swift tools 5.10; Cocoapods 1.15.2 with deterministic `Podfile.lock` committed.

## CI/CD pipeline
- GitHub Actions workflow `mobile_release.yml` updated to run on macOS 14 runners with parallel Android/iOS jobs.
- Integrated **slsa-framework** provenance attestations for generated artifacts.
- Added security scanning stage using `mobsfscan` and `trivy` containers; build fails on HIGH severity findings.
- Implemented signing step segregation: service account for Android, App Store Connect API key stored in OIDC-backed secret manager.

## Artifact management
- Release candidate builds uploaded to Firebase App Distribution for QA sign-off before store submission.
- Metadata (release notes, screenshots, changelog) versioned in `mobile/metadata` directory with PR review gate.
- Symbol files (Android `mapping.txt`, iOS dSYM) automatically shipped to Sentry and Firebase Crashlytics for crash symbolication.

## Testing gates
- CI enforces unit, widget, and integration test suites with coverage threshold 80% lines, 70% branches.
- Play Console pre-launch report triggered via API; failing checks block promotion to production track.
- TestFlight build auto-submitted to 25-member beta group; acceptance required before App Store submission job unlocks.

## Release governance
- Four-eyes review on version bump PRs; release manager + security sign-off required.
- Rollback automation retains previous store listings and binary artifacts; script `mobile/scripts/rollback.sh` prepared with environment toggles.
- Store listing translations reviewed for en-US, en-GB, es-ES; legal disclaimers validated by compliance.
