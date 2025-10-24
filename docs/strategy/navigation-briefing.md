# Navigation stakeholder briefing (Annex A56)

Strategy narratives and metrics are stored in `navigation_annex_strategy_narratives` and
`navigation_annex_strategy_metrics`. The seed file (`backend-nodejs/seeds/004_navigation_annex.js`) keeps the
API, handbook, and notification panel aligned—run `npm --workspace backend-nodejs run seed` after editing it.

## Retention
- **Feed** – reduce average click depth from **3.2 → 2.1** by centralising the navigation registry and breadcrumbs. Track
  `nav-click-depth` and `return-visit-rate` in analytics dashboards when the annex API exposes the updated payload.

## Activation
- **Course discovery** – improve the median time to locate a course after sign-in from **4m 20s → 2m 30s** and raise filter usage
  from **18% → 32%** by aligning skeleton loaders and ingest monitoring.

## Efficiency
- **Course upload readiness** – lift first-pass upload readiness from **61% → 85%** and reduce evidence archive latency from
  **3d → 1d** by embedding readiness indicators and snapshot tasks in the instructor builder.

Use the Annex API to pull these metrics into dashboards or briefings:

```bash
curl "http://localhost:4000/api/v1/navigation/annex" | jq '.strategyNarratives'
```

When adding a new narrative ensure it references a measurable metric, includes the pillar, and is seeded alongside the associated
operations and backlog entries.
