# Dummy Data Requirements

## Data Sets Needed
- **Users:** Providers, learners, admins with varied roles and activity levels.
- **Courses:** Mix of live, on-demand, draft, archived states with categories.
- **Communities:** Tiered communities (free, premium, affiliate-enabled) with events and moderators.
- **Assets:** PowerPoint decks, ebooks, video assets with conversion status.
- **Events:** Upcoming and past events, RSVP statuses.
- **Notifications:** Sample alerts covering successes, warnings, errors.

## Data Attributes
- Include timestamps for analytics (created_at, last_active).
- Provide metrics for dashboards (revenue, engagement, completion rates).
- Include relationships (followers, community memberships, course enrolments).

## Usage
- Power prototypes, usability tests, and stakeholder reviews.
- Ensure data reflects change log scenarios (communities 2.0, affiliate payouts).

## Source & Maintenance
- Generate via seeded scripts in staging environment.
- Document dataset updates in `Assets.md`.
