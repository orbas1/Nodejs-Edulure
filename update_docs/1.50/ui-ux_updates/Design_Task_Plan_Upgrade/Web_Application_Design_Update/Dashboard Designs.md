# Dashboard Design Plan – Web Application v1.50

## Overview Dashboard
- **Hero Metrics Row:** Four KPI cards (Active Cohorts, Lessons Assigned, Upcoming Live Sessions, Satisfaction Score) with sparklines and quick actions.
- **Activity Feed:** Chronological list of announcements, assignments, feedback with filters (All, Cohorts, Messages).
- **Task List:** Checklist for provider actions (review submissions, schedule sessions) with due dates and priority chips.
- **Right Rail:** Calendar widget, quick create buttons, support resources.

## Cohort Management Dashboard
- Table view with sortable columns (Cohort, Status, Learners, Next Session, Health). Row expansion reveals quick stats, top learners needing attention, shortcuts to messaging.
- Bulk action toolbar (assign resource, send message, archive) appears when rows selected.

## Analytics Dashboard
- Filter strip (Cohort, Date Range, Metric focus). Widgets include multi-series line chart, stacked bar chart, funnel analysis, heatmap for engagement by day/time.
- Insight panel summarizing anomalies with CTA to take action.
- Export button for PDF/CSV with scheduling option.

## Responsiveness
- Desktop uses three-column layout; tablet collapses to two columns; mobile stacks sections vertically.
- Sidebar collapses into overlay on smaller screens.

## Interaction Notes
- Hover states reveal secondary actions (View cohort, Message mentor).
- Inline editing for notes/targets within KPI cards.
- Provide skeleton loaders during data fetch.

## Accessibility
- Ensure table rows accessible with keyboard navigation, proper `aria-sort` attributes.
- Charts include accessible descriptions and data tables toggles.

## Analytics Tracking
- Define events for dashboard interactions (`dashboard_kpi_click`, `dashboard_filter_change`, `dashboard_insight_accept`).
