# Terraform Infrastructure

This Terraform configuration standardises how Edulure deploys the backend API across development, staging, and production. The layout enforces environment parity by sharing composable modules for networking, compute, and persistence while allowing environment-specific scale and compliance controls.

## Layout

```text
infrastructure/terraform
├── modules
│   ├── backend_service   # ECS Fargate service, ALB, autoscaling, logging
│   ├── networking        # VPC, subnets, routing, NAT gateway
│   └── postgres          # Encrypted Postgres with subnet + SG hardening
└── envs
    ├── dev
    ├── staging
    └── prod
```

Each environment directory contains a `main.tf` that assembles the shared modules with environment-specific sizing, retention, logging, and deletion-protection rules. Variables define sensible defaults for each environment but can be overridden with `terraform.tfvars` files or pipeline-provided values.

## Remote state

The root modules configure an `s3` backend without static settings so that teams can inject environment-specific state parameters (`bucket`, `key`, `region`, `dynamodb_table`) through `terraform init -backend-config="..."` commands. This prevents hard-coding credentials while allowing a single codebase to manage every workspace.

## Usage

```bash
cd infrastructure/terraform/envs/dev
terraform init \
  -backend-config="bucket=edulure-terraform-state" \
  -backend-config="key=dev/infra.tfstate" \
  -backend-config="region=us-east-1" \
  -backend-config="dynamodb_table=terraform-locks"
terraform workspace select dev || terraform workspace new dev
terraform apply -var="project=edulure" \
  -var="container_image=123456789012.dkr.ecr.us-east-1.amazonaws.com/edulure-api:main" \
  -var="database_username=edulure" \
  -var="database_password=$(aws secretsmanager get-secret-value --secret-id edulure/dev/db | jq -r .SecretString)"
```

Provide `-var="certificate_arn=arn:aws:acm:..."` (and optionally override `https_listener_port` or `https_ssl_policy`) to terminate HTTPS directly on the load balancer. HTTP requests are redirected to HTTPS automatically when the certificate is present. To enable WAF protections or access logging on the load balancer, provide `waf_web_acl_arn`, set `enable_alb_access_logs=true`, and supply `alb_access_logs_bucket`/`alb_access_logs_prefix` values that point to an S3 bucket with the correct ACLs.

CI pipelines should run `terraform plan` for each environment with the same variables to guarantee parity before deployment.

## Security

- Networking stacks can enable VPC flow logs (encrypted with an optional KMS key) to emit connection metadata for SIEM ingestion while keeping subnets private.
- Postgres is deployed inside private subnets with encryption, IAM auth support, configurable backup/maintenance windows, and optional deletion protection.
- ECS tasks read secrets through IAM policies limited to explicitly enumerated ARNs, and the service can enable deployment circuit breakers for automatic rollbacks.
- When an ACM `certificate_arn` is supplied, the backend module provisions an HTTPS listener with a strict TLS policy, optional WAF association, ALB access logging, and HTTP-to-HTTPS redirects. Staging and production environments keep ALB deletion protection enabled by default.

## Observability

The backend module emits logs to CloudWatch and enables ECS Container Insights. Integration with the platform SLO registry occurs automatically via the standard container image, which mounts `/environment/health` for load balancer health checks.

## Extensibility

Teams can add new modules (Redis, background workers, batch jobs) and consume them from the same environment directories to keep scale adjustments consistent across workspaces.
