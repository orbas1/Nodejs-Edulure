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

## Screen Coverage Matrix
- **SCR-00 Home:** Provide hero copy variations per audience (learner/provider/enterprise) and testimonial list with `quote`, `author`, `role`, `company`, `avatar`.
- **SCR-01 Onboarding:** Goals library (12 items) with categories, skill tags. Schedule presets (5 options) with weekly hour ranges.
- **SCR-02 Dashboard:** Insight feed data for announcements and recommendations (courses, communities) to populate cards.
- **SCR-03 Learn Library:** Filter metadata lists (levels, durations, formats) and saved playlist order arrays.
- **SCR-04 Course Detail:** Syllabus data nested modules/lessons, reviews dataset (rating, body, user role, date) with pagination.
- **SCR-05 Lesson Player:** Transcript data with timestamped paragraphs, resource downloads (file names, sizes, types).
- **SCR-06/07 Communities:** Feed posts mixture (text-only, image, poll) and event listings (date/time, location, RSVP state).
- **SCR-08 Profile:** Skills matrix (skill name, category, level 1–5) and timeline events (type, description, timestamp).
- **SCR-09 Settings:** Notification matrix with event keys (course-updated, payment-due), integration list (Slack, Teams) with status.
- **SCR-10 Support:** FAQ entries with categories, contact channels (chat, email, phone) and ticket history items (status, severity).
- **SCR-11 Admin Analytics:** Cohort dataset arrays (name, size, completion rate), revenue breakdown by product line.
- **SCR-12 Admin Content:** Course metadata including compliance flags, owner info, audit history entries.

## Data Volume Guidelines
- Provide enough records to render pagination/infinite scroll (min 30 courses, 40 community posts in extended fixtures used for perf testing).
- Ensure dataset includes at least one example of each widget state (loading, empty, error) by providing toggles in fixtures metadata.
