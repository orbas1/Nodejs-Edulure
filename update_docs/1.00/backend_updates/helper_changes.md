# Helper Changes

- Added `src/utils/httpResponse.js` to provide success and pagination helpers, ensuring all controllers return the same `{ success, message, data, meta }` envelope.
- Completed `DashboardService.buildInstructorDashboard` to transform instructor course, lesson, assignment, tutor, live classroom, asset, community, subscription, ads, and ebook records into production-ready dashboard widgets (metrics, analytics, schedules, pricing, search index entries) reused by `getDashboardForUser` and covered by new Vitest suites.
