#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"

log() {
  printf '\n[%s] %s\n' "$(date -u +'%Y-%m-%dT%H:%M:%SZ')" "$*"
}

log "Running frontend test workflow"

cd "${REPO_ROOT}/frontend-reactjs"

if [ ! -d node_modules ]; then
  log "Installing dependencies"
  npm ci
fi

log "Executing lint checks"
npm run lint

log "Running unit tests"
npm test -- --watch=false --runInBand

log "Building production bundle"
npm run build

log "Running accessibility smoke tests"
npx axe-linter --no-exit-on-warn src

log "Frontend workflow complete"
