#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
DB_CONTAINER_NAME="edulure-db-test"

log() {
  printf '\n[%s] %s\n' "$(date -u +'%Y-%m-%dT%H:%M:%SZ')" "$*"
}

cleanup() {
  if docker ps -a --format '{{.Names}}' | grep -q "^${DB_CONTAINER_NAME}$"; then
    log "Stopping and removing ${DB_CONTAINER_NAME}"
    docker rm -f "${DB_CONTAINER_NAME}" >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT

log "Launching ephemeral MySQL instance"
docker run \
  --rm \
  --name "${DB_CONTAINER_NAME}" \
  -e MYSQL_DATABASE=edulure \
  -e MYSQL_ROOT_PASSWORD=edulure \
  -p 33060:3306 \
  -d mysql:8.2

log "Waiting for database to be ready"
until docker exec "${DB_CONTAINER_NAME}" mysqladmin ping -h 127.0.0.1 -u root -pedulure --silent; do
  sleep 2
  log "Waiting..."
done

cd "${REPO_ROOT}/backend-nodejs"

log "Applying migrations and seeds"
export DATABASE_URL="mysql://root:edulure@127.0.0.1:33060/edulure"
npm ci
npm run migrate:latest
npm run seed

log "Running schema drift check"
npm run db:schema:check

log "Executing data retention dry run"
NODE_ENV=test npm run data:retention

log "Database verification complete"
