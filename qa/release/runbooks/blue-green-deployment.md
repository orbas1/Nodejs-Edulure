# OPS-2198 – Blue/Green Deployment Runbook

**Owner:** Priya Nayar (Release Engineering)

**Last Reviewed:** 2024-05-07

**Next Review Due:** 2024-11-07

---

## 1. Purpose
This runbook provides deployment engineers with the exact sequence for executing and, if required, rolling back a blue/green production release. It highlights the LaunchDarkly feature flag toggles introduced in 2024 Q2 and the coordinated CDN cache purge process to keep operators aligned during cutovers.

## 2. Scope
- Applies to production web, API, and edge workloads fronted by CloudFront and Fastly.
- Covers releases initiated via the `scripts/release/run-readiness.mjs` workflow.
- Excludes mobile app store submissions and database-only hotfixes.

## 3. Pre-flight Checklist (T-minus 60 minutes)
1. ✅ Confirm change window with Network Ops and Support bridge (Slack `#ops-bridge`).
2. ✅ Verify LaunchDarkly environment is green and flag ownership is assigned to the on-call release engineer.
3. ✅ Ensure blue environment build passed `npm run audit:ci` and full release readiness suites.
4. ✅ Export baseline telemetry dashboard JSON snapshots (`observability/kpis/`).
5. ✅ Confirm rollback artefacts are staged (AMI snapshot `bluegreen-<release>-precutover`).

## 4. Timeline Overview
| Phase | Window | Activities | Owner |
| --- | --- | --- | --- |
| Stabilisation | T-60 to T-30 | Pre-flight checklist, smoke tests on green | Release Eng |
| Flag Prep | T-30 to T-10 | Stage LaunchDarkly flag patches | Feature Ops |
| Cutover | T-10 to T+10 | Traffic switch, cache purge, verification | Release Eng |
| Observation | T+10 to T+45 | Deep-dive telemetry, error budget watch | SRE |
| Rollback (if triggered) | T+45 to T+60 | Execute rollback sequence below | Release Eng |

## 5. LaunchDarkly Feature Flag Playbook
All toggles use the LaunchDarkly CLI (`ld`). Authenticate with `LD_ACCESS_TOKEN` scoped to production.

### 5.1 Flags to Stage at T-30
Run in dry-run mode first:
```bash
ld flag status list --proj edulure --env production \
  --tag blue-green --out ./logs/ld-flag-status-$(date +%Y%m%d%H%M).json
```

Prepare pending patches without committing:
```bash
ld flag update edulure production service.edgeFallback \
  --variation on --comment "OPS-2198 pre-stage" --dry-run
ld flag update edulure production frontend.cdnBypass \
  --variation off --comment "OPS-2198 pre-stage" --dry-run
```

### 5.2 Commit toggles during cutover (T-5)
```bash
ld flag update edulure production service.edgeFallback \
  --variation on --comment "OPS-2198 cutover enable"
ld flag update edulure production frontend.cdnBypass \
  --variation off --comment "OPS-2198 cutover disable bypass"
ld flag update edulure production api.rateLimiterRelaxed \
  --variation on --comment "OPS-2198 cutover"
```

Confirm propagation:
```bash
ld flag status get edulure production service.edgeFallback --json | jq '.environments.production.on'
```

### 5.3 Post-cutover sanity (T+5)
- Validate that no automated change requests remain in LaunchDarkly review queue.
- Update `ops/feature-flag-ledger.yaml` with timestamp, release tag, and operator initials.

## 6. CDN Cache Purge Procedure
Perform sequentially to avoid simultaneous edge invalidations.

1. **CloudFront**
   ```bash
   aws cloudfront create-invalidation \
     --distribution-id ${CLOUDFRONT_DIST_ID} \
     --paths "/app/*" "/static/*" "/api/config.json"
   ```
   Monitor with:
   ```bash
   aws cloudfront get-invalidation --distribution-id ${CLOUDFRONT_DIST_ID} --id <InvalidationId>
   ```

2. **Fastly**
   ```bash
   fastly service purge --service-id ${FASTLY_SERVICE_ID} --surrogate-key bluegreen-cutover
   ```
   Confirm purge completion in Fastly UI (Events → Latest Activity) and note timestamp in release channel.

3. **Regional Edge Caches**
   - Trigger `scripts/release/edge-cache-ping.sh` to repopulate hot paths.
   - Watch Grafana dashboard `Edge > Blue/Green Cutover` for 5-minute cache hit recovery.

## 7. Cutover Execution Steps
1. Announce “Starting cutover” in `#ops-bridge` with change ticket link.
2. Drain blue environment from the load balancer (AWS ALB target group weight → 0). Leave health checks running.
3. Run LaunchDarkly cutover commands (Section 5.2).
4. Shift traffic weight to green environment to 100% via ALB weighted target groups.
5. Execute CDN purge sequence (Section 6).
6. Run smoke tests:
   ```bash
   npm --workspace frontend-reactjs run test:smoke:prod
   npm --workspace backend-nodejs run test:smoke:prod
   ```
7. Confirm telemetry: error rate < 1%, p95 latency within 10% of baseline.
8. Update status page component “Platform APIs” to **Operational**.

## 8. Rollback Decision Gates & Timeline
| Time | Signal | Action |
| --- | --- | --- |
| T+10 | Error rate > 2% sustained for 3 minutes | Initiate rollback bridge with SRE lead |
| T+20 | Feature flag rollback insufficient (still degraded) | Re-enable blue environment at 30% traffic, disable problematic flags |
| T+35 | Customer-impacting incident open > SEV2 | Shift 100% traffic back to blue, purge caches again |
| T+45 | Issue unresolved or unknown | Execute infrastructure rollback below and open postmortem ticket |

### 8.1 Rollback Steps
1. Revert LaunchDarkly toggles:
   ```bash
   ld flag update edulure production service.edgeFallback --variation off --comment "OPS-2198 rollback"
   ld flag update edulure production frontend.cdnBypass --variation on --comment "OPS-2198 rollback"
   ld flag update edulure production api.rateLimiterRelaxed --variation off --comment "OPS-2198 rollback"
   ```
2. Restore ALB weighting to blue environment 100% and green 0%.
3. Execute CDN purge commands (Section 6) to flush green artefacts.
4. Redeploy previous stable artefact (`deployctl release promote --env production --tag ${LAST_STABLE_TAG}`).
5. Run smoke tests targeting blue environment endpoints.
6. Publish incident update and attach logs plus metrics to Opsgenie incident timeline.

## 9. Post-Deployment Actions
- Capture final status of feature flags and cache invalidation IDs in the change ticket.
- Schedule follow-up review with Feature Ops to prune temporary flags.
- Update `qa/release/core_release_checklist.json` evidence path with the cutover report stored in `runbooks/reports/OPS-2198-<date>.md`.
- File problem record if rollback triggered.

## 10. References
- LaunchDarkly CLI docs: <https://docs.launchdarkly.com/integrations/cli>
- AWS CloudFront invalidation guidance: <https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Invalidation.html>
- Fastly purge documentation: <https://docs.fastly.com/en/guides/cache-purging>
- Edulure telemetry dashboard: Grafana folder `Production / Blue-Green`
