# Observability Operations Playbook

This playbook catalogues the runtime telemetry surfaces that back Annex A48. Use it to
bootstrap local dashboards, understand what each metric represents, and confirm alert
coverage before a release cut.

## Local stack quick start

1. Ensure Docker Desktop (or Docker Engine + Compose v2) is running.
2. Run `npm run dev:observability` from the repository root.
   - The helper script validates Docker availability, starts Prometheus and Grafana via
     `docker compose --profile observability up -d`, and waits until both services report
     healthy states.
3. Navigate to:
   - **Prometheus:** http://localhost:9090
   - **Grafana:** http://localhost:3001 (default credentials `admin` / `admin`)
4. Import additional dashboards by dropping JSON exports into
   `infrastructure/observability/grafana/dashboards/` and re-running the script.

The Prometheus job scrapes both the Docker Compose web service (`backend:8080`) and the
local development server (`host.docker.internal:4000`). Metrics are collected using basic
authentication with the credentials defined in `docker-compose.yml` and
`backend-nodejs/.env.example` (`metrics` / `metrics-pass-123`).

## Exported telemetry surfaces

### HTTP service level objectives

- Definitions live in `backend-nodejs/src/config/env.js` (see `DEFAULT_SLO_DEFINITIONS`).
- Requests are evaluated in-process by `backend-nodejs/src/observability/metrics.js`, which
  records latency, success/error counts, and feeds `recordHttpSloObservation` for SLO
  aggregation.
- SLO snapshots are exposed via `GET /api/v1/observability/slos` and power the Grafana
  **Environment Runtime Health** dashboard.

### Metrics registry

The Prometheus registry at `/metrics` includes:

| Metric | Purpose |
| --- | --- |
| `edulure_http_requests_total`, `edulure_http_request_duration_seconds` | Request volume and latency histograms labelled by method, route, and status code. |
| `edulure_http_active_requests` | In-flight HTTP requests, useful for saturation monitoring. |
| `edulure_http_request_errors_total` | Server-side errors (5xx) surfaced for alerting thresholds. |
| `edulure_feature_flag_gate_decisions_total` | Feature-flag evaluation counts tagged by flag key, result, and audience. |
| `edulure_telemetry_*` | Pipeline ingestion/export counters plus lag gauges backing warehouse freshness SLOs. |
| `edulure_background_job_*` | Execution counts, durations, and processed item totals for queue workers. |
| `edulure_search_*` | Meilisearch health probes, ingestion durations, error counts, and readiness states. |
| `edulure_monetization_*` | Payment volume, revenue recognition, and refund gauges for finance reviews. |

Additional metrics cover antivirus scans, storage uploads, governance communications, release
readiness gates, and consent ledger mutations. Review `backend-nodejs/src/observability/metrics.js`
for the full catalogue and label cardinality guidance.

### Dashboards

Grafana provisioning automatically loads the JSON dashboards shipped with the repository:

- `environment-runtime.json` – correlates ECS utilisation, ALB throughput, SLO burn rates,
  and the active blueprint parameter registered in SSM.
- `consent-ledger.json` – spotlights consent mutation throughput, error rates, and ledger
  freshness windows for compliance partners.

Dashboards live under the "Edulure" folder. Provisioning manifests in
`infrastructure/observability/grafana/provisioning/` ensure new dashboards or data sources are
picked up without manual clicks.

### Alert hooks

- CloudWatch alarms declared in `infrastructure/terraform/modules/backend_service` mirror the
  Grafana panels for CPU, memory, and request saturation.
- SLO burn rate annotations emitted by `sloRegistry.js` are surfaced in Grafana and available
  via the `/observability/slos` API for integration with incident bots.
- `scripts/observability-stack.mjs` keeps local telemetry parity so playbooks and runbooks can
  be rehearsed against the same dashboards used in production.

## Operational checklist

- [ ] Run `npm run dev:observability` and verify Prometheus + Grafana readiness.
- [ ] Confirm `/metrics` returns a 200 response with `metrics/metrics-pass-123` credentials.
- [ ] Load the "Environment Runtime Health" dashboard and check the active blueprint matches
      `infrastructure/environment-manifest.json`.
- [ ] Exercise an API route (e.g., `GET /api/v1/catalogue/filters`) and confirm the request is
      visible in Prometheus using the `edulure_http_requests_total` metric.
- [ ] Review `GET /api/v1/observability/slos` to ensure SLO snapshots include availability,
      burn rate, and annotations.

Record findings in the release readiness runbook and attach screenshots for Annex A48 when
telemetry thresholds change.
