#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
FLUTTER_PROJECT="${REPO_ROOT}/Edulure-Flutter"

log() {
  printf '\n[%s] %s\n' "$(date -u +'%Y-%m-%dT%H:%M:%SZ')" "$*"
}

ensure_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    log "ERROR: Required command '$1' not found in PATH"
    exit 1
  fi
}

log "Validating prerequisites"
ensure_command flutter
ensure_command dart

log "Switching to Flutter project at ${FLUTTER_PROJECT}"
cd "${FLUTTER_PROJECT}"

log "Fetching Flutter dependencies"
flutter pub get

log "Running static analysis"
flutter analyze

log "Executing unit tests"
flutter test

log "Running integration tests (profiled)"
flutter test integration_test --flavor staging --dart-define=API_ENV=staging

log "Generating golden images"
flutter test --update-goldens test/golden

log "User application test workflow complete"
