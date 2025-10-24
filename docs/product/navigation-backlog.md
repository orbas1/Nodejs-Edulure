# Navigation remediation backlog (Annex A53)

The Annex A53 product backlog is now stored in the relational tables introduced by
`backend-nodejs/migrations/20250115104500_navigation_annex.js`. Seed data lives in
`backend-nodejs/seeds/004_navigation_annex.js` (a Knex seeder that can be executed with
`npm --workspace backend-nodejs run seed`). Update that seeder whenever new navigation epics are
approved so the API and handbook stay in sync.

Each record is keyed by the navigation surface (`nav_item_id`), supports role scoping, and captures a canonical epic ID,
summary, backlog reference, and impacted files. The API exposed at `GET /api/v1/navigation/annex` powers the handbook and the
notification panel, so edits to the database flow straight into the UI once seeds are rerun.

## Seeded epics

| Epic | Summary | Surfaces | Backlog reference |
| --- | --- | --- | --- |
| **UX-401 Shell registry** | Centralise route metadata and breadcrumb helpers. | `frontend-reactjs/src/layouts/MainLayout.jsx`, `frontend-reactjs/src/navigation/routes.js`, `backend-nodejs/src/services/DashboardService.js` | `/handbook/navigation-annex#feed-registry` |
| **UX-402 Curriculum discovery** | Reduce time-to-discovery with skeleton loaders and metadata hydration. | `frontend-reactjs/src/pages/Courses.jsx`, `backend-nodejs/src/services/CatalogueService.js` | `/handbook/navigation-annex#courses-discovery` |
| **OPS-218 Quick upload entry** | Drive instructors into the readiness workflow when launching uploads from quick actions. | `frontend-reactjs/src/navigation/routes.js`, `frontend-reactjs/src/pages/dashboard/InstructorCourseCreate.jsx` | `/handbook/navigation-annex#quick-upload` |
| **OPS-219 Course upload readiness** | Surface audit evidence and readiness checks inside the instructor builder. | `frontend-reactjs/src/pages/dashboard/InstructorCourseCreate.jsx`, `backend-nodejs/src/services/CourseAuthoringService.js` | `/handbook/navigation-annex#course-upload-readiness` |

## Editing the backlog

1. Update `backend-nodejs/seeds/004_navigation_annex.js` with new `navigation_annex_backlog_items` rows. Provide a
   `nav_item_id`, epic ID, and keep `impacted_files` in sync with the code that will ship. (The legacy SQL script under
   `backend-nodejs/database/seeders/003_seed_navigation_annex.sql` remains for ops teams that need manual SQL execution, but
   the Knex seeder is the authoritative source.)
2. Run `npm --workspace backend-nodejs run migrate:latest` to ensure the tables exist, then
   `npm --workspace backend-nodejs run seed` to apply the changes.
3. Verify `GET /api/v1/navigation/annex` returns the new epic, and load `/handbook/navigation-annex` in the front-end to confirm
   the handbook reflects the update.

The Annex API returns the backlog sorted by `priority` and `display_order`, so adjust those columns when you need to reprioritise
work. For ad-hoc investigation you can inspect the table directly:

```sql
SELECT epic_id, summary, impacted_files
FROM navigation_annex_backlog_items
ORDER BY priority, display_order;
```

Keep the backlog authoritative—avoid storing navigation remediation work in multiple spreadsheets once it lands in the annex.
