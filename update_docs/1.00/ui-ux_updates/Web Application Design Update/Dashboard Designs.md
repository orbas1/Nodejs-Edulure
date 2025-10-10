# Dashboard Design Specification – Web Application v1.00

## Layout Overview
- Three-tier layout: header utility (filters), primary analytics grid, secondary tasks/announcements rail.
- Grid spans 12 columns; analytics modules primarily occupy 8 columns, support modules 4 columns.
- Persistent sidebar provides quick filters and saved views.

## Header & Filters
- Header height 52px with breadcrumb, date range selector, and quick filter chips (7d, 30d, 90d, Custom).
- Include export button (secondary) and `+ Create` quick action.

## Modules
1. **KPI Row**
   - Four cards 276×140px displaying revenue, enrolments, retention, referrals.
   - Each card includes sparkline, delta badge, comparison tooltip.
2. **Revenue Trend Chart**
   - Area chart with gradient fill, annotations for major releases.
   - Tabs for `Revenue`, `Payouts`, `Net Growth`.
3. **Learner Funnel**
   - Horizontal stacked bar representing stages (View, Enrol, Engage, Complete).
   - Clicking stage filters table below.
4. **Course Performance Table**
   - Columns: Course, Learners, Completion %, Satisfaction, Actions.
   - Sticky header with inline search.
5. **Tasks List**
   - Kanban-style list with categories (To-do, In progress, Review). Drag-and-drop reordering.
6. **Announcements Rail**
   - Rotating cards with update highlights, release notes, and upcoming events.
7. **Storage & Health Widget**
   - Circular progress indicator showing storage usage, system health status.

## Interactions
- Modules can be reordered using drag handles in edit mode.
- Provide "View full report" link on charts leading to detailed analytics page.
- Tooltips show 7-day change when hovering chart points.

## Responsiveness
- At tablet width, stack modules vertically, KPI row becomes horizontal scroll.
- Charts maintain 320px minimum height to retain readability.

## Accessibility & Data Integrity
- Provide textual summary below each chart describing key trend for screen readers.
- Ensure table rows accessible via keyboard with focus highlight.
- Use consistent number formatting (e.g., 12.4k) with tooltip showing exact value.
