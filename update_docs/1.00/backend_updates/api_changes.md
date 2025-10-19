- Introduced `/api/v1/admin/feature-flags` endpoints for operators to sync the manifest, retrieve tenant snapshots, and apply or remove overrides. Responses include evaluation context and audit metadata so governance actions are transparent.
- Extended `/dashboard/me` to return an instructor `coursesWorkspace` object containing catalogue, cohort analytics, assignment
  queues, authoring drafts, and learner risk signals, enabling the new course management experience to render without additional
  round trips.
- Augmented `/dashboard/admin` compliance payloads with audit summaries, attestation analytics, framework snapshots, risk heatmaps, incident response queues, and evidence archive metadata so the operator console can render without follow-up requests.
