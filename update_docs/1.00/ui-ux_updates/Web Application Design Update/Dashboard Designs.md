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

## Module Dimensions & Data Mapping
- **Grid Placement:** KPI row spans columns 1–12 with internal 24px gaps; revenue trend occupies columns 1–8 (min height 320px), tasks list columns 9–12 (min height 360px). Learner funnel sits below KPI row, columns 1–8, with 48px top margin aligning with design rhythm. Announcements rail uses sticky positioning with `top: 120px` to remain visible alongside scrolled analytics.
- **Data Endpoints:**
  - KPI cards: `GET /api/analytics/kpi?range={7|30|90}` returning `value`, `delta`, `trend[]` (float array), `benchmark`.
  - Revenue trend: `GET /api/analytics/revenue?granularity=day` delivering arrays for `gross`, `payouts`, `net` plus `annotations` with `label`, `timestamp`, `type`.
  - Learner funnel: `GET /api/analytics/funnel` with ordered stages and conversion percentages; results drive both stacked bar width and detail tooltips.
  - Course performance table: GraphQL query `coursePerformance` returning pagination, enabling virtualization beyond 100 rows.
  - Tasks list: `GET /api/tasks?status=all` with nested `checklist[]` items and `dueAt` timestamps.
- **State Variants:** Provide loading skeletons (grey blocks with shimmer), empty states (illustration `ILL-TASK-CHECK`), and error banners linking to retry action. Documented visuals in `Screens_update_images_and _vectors.md`.

## Interactions
- Modules can be reordered using drag handles in edit mode.
- Provide "View full report" link on charts leading to detailed analytics page.
- Tooltips show 7-day change when hovering chart points.

## Motion & Feedback
- KPI cards animate into view with 80ms stagger using `motionTokens.card.enter`. Hover triggers `transform: translateY(-4px)` plus gradient overlay intensifying by 12%.
- Charts use D3 transitions (400ms) when datasets change; axis labels fade in/out to avoid flicker. Interaction states honour `prefers-reduced-motion` by switching to instant updates.
- Tasks drag-and-drop uses `react-beautiful-dnd` with drop shadow accent `0 18px 44px rgba(11,17,32,0.36)` and snap-back animation when dropped invalidly.
- Toast notifications appear bottom-left (width 320px) with success (`#34D399`) and error (`#F87171`) accent bars, auto-dismiss after 5s.

## Responsiveness
- At tablet width, stack modules vertically, KPI row becomes horizontal scroll.
- Charts maintain 320px minimum height to retain readability.

## Accessibility & Data Integrity
- Provide textual summary below each chart describing key trend for screen readers.
- Ensure table rows accessible via keyboard with focus highlight.
- Use consistent number formatting (e.g., 12.4k) with tooltip showing exact value.

## Implementation Notes
- Define layout using CSS Grid with named areas to allow reordering while preserving accessibility order. Use `grid-template-areas` for desktop, fallback to stacked flex layout on tablet/mobile.
- Persist module arrangement per user by storing grid configuration in `/api/user/preferences`. Provide reset option to revert to default blueprint documented above.
- Logging: Each filter interaction triggers analytics event `dashboard.filter_applied` with payload `{range, filterIds, userRole}` for conversion tracking.
