# Navigation operational readiness (Annex A54)

Operational tasks for navigation remediation now live in the `navigation_annex_operation_tasks` table created by
`backend-nodejs/migrations/20250115104500_navigation_annex.js`. The default workload is seeded in
`backend-nodejs/seeds/004_navigation_annex.js` and exposed through `GET /api/v1/navigation/annex`.

Update the seeder (or insert new rows) before a rollout so that the handbook, Annex API, and notification panel show the same
checklist.

## Shell unification validation {#navigation-registry-validation}
- Run `ops-feed-registry-audit` to confirm the navigation annex API returns the feed entries for user and instructor roles.
  Use the exported JSON to check that `/feed` and dashboard deep links are present.
- Execute `ops-feed-breadcrumb-capture` by collecting fresh breadcrumb screenshots and attaching them to the release evidence
  bundle. Store the files alongside the ticket referenced in the annex.
- Notify the incident commander once screenshots are archived and the annex task is marked complete.

## Course discovery verification {#course-discovery-verification}
- Use `ops-courses-skeleton-benchmark` to load `/courses` on staging, capturing performance timings. Record the render duration
  in the release notes and flag the task if the 400ms target is missed.
- Update the support macro that references course filters so operations teams see the new ordering.
- Confirm ingest monitoring dashboards include the `ops-upload-monitoring` stream before rolling out.

## Quick action validation {#quick-action-validation}
- Follow `ops-quick-action-verify-route` to ensure the quick action still routes to `/dashboard/instructor/courses/create`.
  Capture the console log that confirms the navigation annex API returns the matching quick action metadata.
- Run `ops-quick-compose-audit` to confirm the TopBar quick action opens the community composer with analytics context and
  role-scoped targeting. Capture a screenshot of the CTA and include the annex API payload in the release evidence.
- Execute `ops-quick-live-session-audit` to verify the scheduler opens with readiness flags when the live session quick action
  is used. Record the scheduler URL and attach the console trace that shows the annex payload powering the CTA.

## Course upload readiness {#course-upload-readiness}
- Execute `ops-upload-readiness-snapshot` to archive the upload readiness indicator from the instructor builder. Store the
  snapshot and checklist evidence with the release ticket.
- Brief the onboarding enablement team on any new readiness checks added during the release.

## Using the API

To inspect the current checklist in code or tooling run:

```bash
curl "http://localhost:4000/api/v1/navigation/annex?role=instructor" | jq '.operationsChecklist'
```

When the Annex API shows the expected tasks and the evidence above is captured, Annex A54 is complete for the release.
