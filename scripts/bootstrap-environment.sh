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

require_env() {
  local name="$1"
  local value="${!name:-}"
  if [[ -z "$value" ]]; then
    fail "Environment variable $name must be set for this operation."
  fi
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

compose_supports_wait_flag() {
  if [[ "${COMPOSE_SUPPORTS_WAIT:-}" != "" ]]; then
    return 0
  fi

  if compose help up 2>&1 | grep -q -- '--wait'; then
    COMPOSE_SUPPORTS_WAIT=1
  else
    COMPOSE_SUPPORTS_WAIT=0
  fi
}

compose_up_detached() {
  compose_supports_wait_flag
  if [[ "${COMPOSE_SUPPORTS_WAIT}" -eq 1 ]]; then
    compose up -d --wait "$@"
  else
    compose up -d "$@"
  fi
}

require_command docker
resolve_compose_command
compose_supports_wait_flag > /dev/null

STACK=${1:-local}
log "Selected stack: ${STACK}"

case "$STACK" in
  local)
    log "Building containers with cached layers refreshed..."
    compose build --pull

    log "Starting database dependencies..."
    compose_up_detached postgres

    log "Waiting for Postgres availability check to complete..."
    compose_run backend node ./scripts/wait-for-db.js

    log "Running database migrations..."
    compose_run backend npm run migrate

    if [[ "${BOOTSTRAP_SKIP_DATA_SEED:-0}" == "1" ]]; then
      log "Skipping seed data as BOOTSTRAP_SKIP_DATA_SEED=1"
    else
      log "Seeding reference datasets..."
      compose_run backend npm run seed
    fi

    log "Launching service stack..."
    compose_up_detached backend frontend

    log "Runtime status summary:"
    compose ps
    ;;
  dev|staging|prod)
    for var in TERRAFORM_STATE_BUCKET TERRAFORM_STATE_REGION TERRAFORM_STATE_LOCK_TABLE CONTAINER_IMAGE DATABASE_USERNAME DATABASE_PASSWORD; do
      require_env "$var"
    done
    require_command terraform

    log "Initialising Terraform for ${STACK}"
    (
      cd "infrastructure/terraform/envs/$STACK"
      terraform init \
        -input=false \
        -backend-config="bucket=${TERRAFORM_STATE_BUCKET}" \
        -backend-config="key=$STACK/infra.tfstate" \
        -backend-config="region=${TERRAFORM_STATE_REGION}" \
        -backend-config="dynamodb_table=${TERRAFORM_STATE_LOCK_TABLE}" >/dev/null

      log "Validating Terraform formatting and configuration"
      terraform fmt -recursive >/dev/null
      terraform validate >/dev/null

      if ! terraform workspace select "$STACK" >/dev/null 2>&1; then
        terraform workspace new "$STACK" >/dev/null
      fi

      log "Creating Terraform plan for ${STACK}"
      terraform plan \
        -input=false \
        -var="project=${PROJECT_NAME:-edulure}" \
        -var="container_image=${CONTAINER_IMAGE}" \
        -var="database_username=${DATABASE_USERNAME}" \
        -var="database_password=${DATABASE_PASSWORD}" \
        -out="plan.tfplan"

      log "Terraform plan saved at infrastructure/terraform/envs/$STACK/plan.tfplan"
    )
    ;;
  *)
    fail "Unknown stack: $STACK"
    ;;
 esac
