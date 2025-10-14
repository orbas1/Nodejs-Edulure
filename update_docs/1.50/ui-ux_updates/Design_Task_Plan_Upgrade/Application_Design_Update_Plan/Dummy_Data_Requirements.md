# Dummy Data Requirements – Application Design Update v1.50

## Purpose
Provide realistic seed data for prototyping, usability testing, and development to simulate end-to-end learner and provider scenarios across new layouts.

## Learner Data Sets
- **Profiles:** 40 learner personas covering varying progress levels, geographies, and subscription tiers. Fields: name, avatar, pronouns, location, streak, badges, skills, goals.
- **Cohort Enrollments:** Assign each learner to 1–3 cohorts with roles, start dates, progression status (ahead, on track, needs support).
- **Timeline Events:** Generate sessions, assignments, announcements per cohort with due dates, statuses, and associated mentors.
- **Assignments:** Include submission states (not started, in progress, submitted, graded), rubric scores, feedback notes, attachments (PDF, image, audio).
- **Messages:** Simulate conversation threads with mentors and peers; include timestamps, reactions, attachments.
- **Notifications:** Build backlog of 25 notifications per persona spanning progress, billing, community, system updates.

## Provider Data Sets
- **Cohorts:** 15 cohorts with metadata (subject, duration, enrollment, pricing, next session). Include status variations (upcoming, active, at risk, archived).
- **Lessons:** Library of 120 lessons across modules with types (video, reading, quiz, project). Include durations, prerequisites, completion stats.
- **Schedule:** Calendar events for upcoming two months covering live sessions, office hours, workshops with statuses (scheduled, needs confirmation, completed).
- **Analytics:** Sample metrics (attendance %, completion %, revenue projections) with historical trend data for charts.
- **Support Tickets:** 10 open tickets with severity levels, assigned agents, and resolution steps.
- **Automations:** Example workflows with triggers (missed session), actions (send reminder), status (active, draft).

## Content Assets
- Placeholder thumbnails (16:9, 4:3), icons, and hero illustrations aligned with brand palette.
- Transcript snippets and resource summaries for lesson previews.
- Badge imagery representing achievements and streaks.

## Localization & Formatting
- Provide data in en-US primary, include sample translations for es-ES and fr-FR to test text expansion.
- Dates formatted ISO 8601 plus localized display strings (e.g., "Mon, 18 Mar").
- Currency values in USD, GBP, INR for billing screens to validate formatting.

## Delivery Format
- JSON files for app seeding (`learners.json`, `cohorts.json`, `assignments.json`, `notifications.json`).
- CSV exports for analytics charts and QA validation.
- Media assets organized by type (avatars, thumbnails, illustrations) with naming conventions `type_context_variant@2x.png`.

## Maintenance Plan
- Document generation scripts to refresh data quarterly.
- Store data sets in repository under `/update_docs/fixtures/v1.50` with README explaining usage.
- Provide guidance for anonymizing real data if used for demos.
