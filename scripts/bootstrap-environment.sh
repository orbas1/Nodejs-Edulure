#!/usr/bin/env bash
set -euo pipefail

if ! command -v docker &>/dev/null; then
  echo "Docker is required to bootstrap the Edulure stack" >&2
  exit 1
fi

STACK=${1:-local}

case "$STACK" in
  local)
    echo "[bootstrap] Building containers..."
    docker compose build --pull
    echo "[bootstrap] Starting services..."
    docker compose up -d postgres
    echo "[bootstrap] Waiting for Postgres health..."
    docker compose run --rm backend node ./scripts/wait-for-db.js
    echo "[bootstrap] Running migrations..."
    docker compose run --rm backend npm run migrate
    echo "[bootstrap] Seeding data..."
    docker compose run --rm backend npm run seed
    echo "[bootstrap] Launching application tier..."
    docker compose up -d backend frontend
    docker compose ps
    ;;
  dev|staging|prod)
    echo "[bootstrap] Validating Terraform for $STACK"
    pushd infrastructure/terraform/envs/$STACK >/dev/null
    terraform init -backend-config="bucket=${TERRAFORM_STATE_BUCKET?}" \
      -backend-config="key=$STACK/infra.tfstate" \
      -backend-config="region=${TERRAFORM_STATE_REGION?}" \
      -backend-config="dynamodb_table=${TERRAFORM_STATE_LOCK_TABLE?}"
    terraform fmt -recursive
    terraform validate
    terraform workspace select $STACK || terraform workspace new $STACK
    terraform plan \
      -var="project=${PROJECT_NAME:-edulure}" \
      -var="container_image=${CONTAINER_IMAGE?}" \
      -var="database_username=${DATABASE_USERNAME?}" \
      -var="database_password=${DATABASE_PASSWORD?}" \
      -out="plan.tfplan"
    echo "[bootstrap] Terraform plan stored at infrastructure/terraform/envs/$STACK/plan.tfplan"
    popd >/dev/null
    ;;
  *)
    echo "Unknown stack: $STACK" >&2
    exit 1
    ;;
 esac
