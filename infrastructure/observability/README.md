# Observability Stack Blueprint (Annex A48)

This directory curates the packaged observability artefacts that support the Edulure runtime.
It documents how environment blueprints expose telemetry guardrails and how dashboards and
alerting primitives map to the Annex A48 controls.

## Components

| Component | Purpose |
| --- | --- |
| `grafana/dashboards/environment-runtime.json` | CloudWatch-backed dashboard that correlates ECS utilisation, Application Load Balancer throughput, and blueprint provenance. |
| `grafana/dashboards/consent-ledger.json` | Compliance-oriented Prometheus dashboard for consent mutation flows. |

### Runtime Dashboard

The **Environment Runtime Health** dashboard expects the following Grafana data sources:

- **CloudWatch** (UID `cloudwatch`) for ECS and ALB telemetry
- **Expr** (UID `grafana`) for inline blueprint references

Template variables let operators pin the ECS cluster, ECS service, ALB ARN suffix, and target
SSM parameter name. The stat widget renders the active blueprint parameter so on-call engineers
can confirm the environment manifest used for a release without leaving Grafana.

### Alarm and Blueprint Linkage

CloudWatch alarms and dashboards declared in `infrastructure/terraform/modules/backend_service`
automatically link the following constructs:

- `aws_cloudwatch_metric_alarm.cpu_high` and `aws_cloudwatch_metric_alarm.memory_high` publish to
  configurable SNS topics and surface the same metrics displayed in Grafana panels.
- The optional SSM parameter (`blueprint_parameter_name`) serialises the environment blueprint
  into JSON so dashboard viewers and CI jobs can query a single source of truth.

Use the new Terraform outputs (`cpu_alarm_name`, `memory_alarm_name`, `observability_dashboard_name`,
and `environment_blueprint_parameter_arn`) to export runtime references into downstream tooling
or pipeline notifications.

### Blueprint Registry Synchronisation

Environment blueprints are now catalogued in the backend database via the
`environment_blueprints` table (see migration `20250330140000_environment_blueprints_registry.js`).
The registry is hydrated by the `backend-nodejs/seeds/003_environment_blueprints.js` seed which
reads `infrastructure/environment-manifest.json`, computes the expected hashes for Terraform
modules, and upserts records for each environment. The registry retains the SSM parameter name,
runtime endpoint, observability dashboard hash, and alarm bindings used by Annex A46/A48 controls.

`EnvironmentParityService` ingests this registry when producing the `/api/v1/environment/health`
report. Any drift between the manifest and persisted registry (e.g. mismatched hashes, missing SSM
parameters, or unexpected environments) is surfaced as a parity mismatch so on-call responders can
spot configuration skew alongside infrastructure drift.
