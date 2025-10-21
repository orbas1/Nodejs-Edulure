#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"

log() {
  printf '\n[%s] %s\n' "$(date -u +'%Y-%m-%dT%H:%M:%SZ')" "$*"
}

log "Starting build verification from ${REPO_ROOT}"

cd "${REPO_ROOT}"

log "Verifying backend build and tests"
(
  cd backend-nodejs
  if [ ! -d node_modules ]; then
    log "Installing backend dependencies"
    npm ci
  fi
  npm run lint
  npm test
)

log "Verifying frontend build"
(
  cd frontend-reactjs
  if [ ! -d node_modules ]; then
    log "Installing frontend dependencies"
    npm ci
  fi
  npm run lint
  npm run build
)

log "Verifying SDK build"
(
  cd sdk-typescript
  if [ ! -d node_modules ]; then
    log "Installing SDK dependencies"
    npm ci
  fi
  npm run lint
  npm run build
)

log "Build verification complete"
