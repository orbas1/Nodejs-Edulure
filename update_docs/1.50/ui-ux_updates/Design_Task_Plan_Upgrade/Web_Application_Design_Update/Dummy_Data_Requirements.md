# Dummy Data Requirements – Web Application Design Update v1.50

## Marketing Pages
- Testimonials: 12 quotes with name, role, company, avatar, rating.
- Metrics: Values for hero counters (learners served, mentors, cohorts completed).
- Cohort catalog entries: 24 cohort listings with subject, duration, price, mentor info, start date.
- Resource highlights: 10 featured articles/videos with summary, tags, author.

## Dashboard Data
- KPI metrics: attendance %, completion %, revenue figures with weekly deltas for 8 cohorts.
- Activity feed items: 30 events (announcements, assignments, feedback) with timestamps and associated users.
- Task list: 15 tasks with priority levels, due dates, completion status.
- Analytics data: engagement metrics across 12 weeks, revenue over time, conversion funnel counts.
- Resource library: 40 assets with file type, module tags, preview text.

## User Profiles
- Provider accounts: 5 sample providers with team sizes, plan tiers, billing statuses.
- Learner profiles: 20 sample learners with progress stats for use in member tables.

## Support & Settings
- Support tickets: 8 example tickets with status (open, pending, resolved), category, assigned agent.
- Billing invoices: 12 invoice records with date, amount, status, download link.

## Localization & Formatting
- Provide multi-currency examples (USD, EUR, GBP) for pricing and billing sections.
- Include date formats for en-US, en-GB, fr-FR to test locale switching.

## Delivery Format
- JSON fixtures for dynamic sections (`cohorts.json`, `analytics.json`, `testimonials.json`).
- CSV for analytics data to feed charts.
- Media assets (avatars, thumbnails) stored under `/update_docs/1.50/assets/web/dummy/`.

## Maintenance
- Refresh data quarterly; document script for generating synthetic data (Node.js script referencing faker library).
- Provide README describing how to import data into Storybook and staging environments.
