# Dashboard Organisation & Information Hierarchy – v1.00

## Section Ordering
1. KPI snapshot row
2. Revenue & payout trends
3. Learner funnel and course performance
4. Tasks and workflow management
5. Announcements & system health

## Role-Based Variants
- **Providers:** Show revenue, enrolments, completion, payout schedule.
- **Learners:** Replace revenue modules with progress summary, upcoming sessions, recommended actions.
- **Admins:** Add compliance alerts and system uptime metrics.

## Filter Architecture
- Global date range + segmentation (All courses, Cohorts, Self-paced).
- Secondary filters for region, cohort, instructor accessible via sidebar.
- Saved views accessible from sidebar pinned list (max 5) with share option.

## Widget Placement Rules
- High priority metrics remain above fold (KPI row + revenue chart).
- Tasks list anchored to right column to allow quick action.
- Announcements positioned adjacent to tasks for context.
- Additional widgets (e.g., referral leaderboard) load below fold to maintain clarity.

## Interaction Flow
- Users adjust date range → charts update with skeleton placeholders.
- Clicking KPI opens drawer with deep-dive view.
- Drag-and-drop reordering available in "customise" mode triggered by settings icon.

## Notifications & Alerts
- Inline alerts appear below header when thresholds exceeded (e.g., churn > target). Use yellow background.
- Provide dismissal with reason capture.

## Accessibility
- Tab order follows reading order left-to-right, top-to-bottom.
- Provide keyboard instructions for drag-and-drop via ARIA live region.
