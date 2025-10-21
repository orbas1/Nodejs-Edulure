#!/usr/bin/env bash
set -euo pipefail

log() {
  printf '[bootstrap] %s\n' "$1"
}

fail() {
  printf '\n[bootstrap:ERROR] %s\n' "$1" >&2
  exit 1
}

require_command() {
  local binary="$1"
  command -v "$binary" >/dev/null 2>&1 || fail "Required command '$binary' is not available on PATH."
}

resolve_compose_command() {
  if docker compose version >/dev/null 2>&1; then
    DOCKER_COMPOSE=(docker compose)
  elif command -v docker-compose >/dev/null 2>&1; then
    DOCKER_COMPOSE=(docker-compose)
  else
    fail "Docker Compose v2 plugin or docker-compose binary is required."
  fi
}

compose() {
  "${DOCKER_COMPOSE[@]}" "$@"
}

compose_run() {
  compose run --rm "$@"
}

require_command docker
resolve_compose_command

STACK=${1:-local}

case "$STACK" in
  local)
    log "Building containers..."
    compose build --pull
    log "Starting services..."
    compose up -d postgres
    log "Waiting for Postgres health..."
    compose_run backend node ./scripts/wait-for-db.js
    log "Running migrations..."
    compose_run backend npm run migrate
    log "Seeding data..."
    compose_run backend npm run seed
    log "Launching application tier..."
    compose up -d backend frontend
    compose ps
    ;;
  dev|staging|prod)
    require_command terraform
    log "Validating Terraform for $STACK"
    pushd "infrastructure/terraform/envs/$STACK" >/dev/null
    trap 'popd >/dev/null' EXIT
    terraform init -backend-config="bucket=${TERRAFORM_STATE_BUCKET?}" \
      -backend-config="key=$STACK/infra.tfstate" \
      -backend-config="region=${TERRAFORM_STATE_REGION?}" \
      -backend-config="dynamodb_table=${TERRAFORM_STATE_LOCK_TABLE?}"
    terraform fmt -recursive
    terraform validate
    terraform workspace select "$STACK" >/dev/null 2>&1 || terraform workspace new "$STACK"
    terraform plan \
      -var="project=${PROJECT_NAME:-edulure}" \
      -var="container_image=${CONTAINER_IMAGE?}" \
      -var="database_username=${DATABASE_USERNAME?}" \
      -var="database_password=${DATABASE_PASSWORD?}" \
      -out="plan.tfplan"
    log "Terraform plan stored at infrastructure/terraform/envs/$STACK/plan.tfplan"
    trap - EXIT
    popd >/dev/null
    ;;
  *)
    fail "Unknown stack: $STACK"
    ;;
esac
