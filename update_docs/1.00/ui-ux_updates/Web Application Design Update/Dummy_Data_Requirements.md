# Dummy Data Requirements – Web Application v1.00

## Purpose
Provide realistic datasets for design QA, Storybook, and usability testing across home, dashboard, community, and settings modules.

## Data Sets
1. **Courses**
   - 18 records representing categories (Technology, Creative, Business, Wellness).
   - Fields: `id`, `title`, `subtitle`, `instructor`, `duration`, `modules`, `progress`, `rating`, `thumbnail`, `tags`.
   - Include at least 3 partially completed courses (progress 25–60%), 2 newly added (<7 days) flagged.
2. **Communities**
   - 12 entries with metrics `members`, `activeLastWeek`, `eventsUpcoming`, `tier` (Open, Premium, Enterprise).
   - Provide sample posts with `id`, `author`, `timestamp`, `content`, `reactions`, `attachments`.
3. **Dashboards KPI**
   - Weekly metrics covering `revenue`, `enrolments`, `retention`, `referrals`. Provide historical arrays for 12 weeks to populate charts.
   - Include anomalies (spike, dip) for annotation testing.
4. **Tasks & Notifications**
   - 10 tasks with statuses (Open, In Progress, Blocked, Completed). Provide due dates and linked entity IDs.
   - Notification feed with mix of success, warning, info types.
5. **Settings**
   - Preferences object with toggles for email, push, SMS, in-app notifications. Provide default combinations to test toggling UI.
6. **Profiles**
   - Sample follower/following lists (counts 250–12k), achievements array with `badgeId`, `earnedOn`, `description`.

## Data Format
- Use JSON fixtures stored under `update_docs/1.00/ui-ux_updates/fixtures/`.
- Provide TypeScript interfaces for each dataset to ensure type safety in Storybook.
- Example file `courses.json` with 18 entries sorted by `updatedAt`.

## Localisation Considerations
- Include sample translations for hero copy (Spanish, French) to validate layout.
- Provide currency variations (USD, EUR, GBP) for pricing modules.

## Accessibility Testing
- Ensure textual data includes long names (>40 characters) to test truncation.
- Provide alt text for attachments in community posts.
- Include data with zero states (no tasks, empty community) for empty state validation.

## Maintenance
- Update fixtures after major release and log version in `design_change_log.md`.
- Run script `yarn fixtures:validate` to ensure schema compliance before merging.
