# Dashboard Information Architecture – Web Application v1.50

## Page Hierarchy
- **Top-Level Tabs:** Overview, Cohorts, Analytics, Resources, Settings. Each accessible via sidebar navigation.
- **Overview Subsections:** Metrics, Activity Feed, Tasks, Calendar.
- **Cohorts Subsections:** List view, detail view, member management, messaging integration.
- **Analytics Subsections:** Engagement, Outcomes, Revenue, Automations.
- **Resources Subsections:** Library, Saved, Assignments, Uploads.

## Layout Grid
- Desktop: 12-column grid with 24px gutters. Main content spans 9 columns, right rail 3 columns.
- Tablet: 8-column grid; sections stack to maintain readability.
- Mobile: Single column with vertical stacking and collapsible sections.

## Navigation
- Sidebar includes icons + labels, collapsible groups, quick create button at bottom.
- Breadcrumbs appear at top of content area (e.g., Dashboard > Cohorts > Spring Design Lab).
- Command palette accessible via keyboard shortcut for quick navigation.

## Content Prioritization
- Above the fold: key metrics, urgent tasks, upcoming sessions.
- Secondary content (insights, resources) accessible via cards further down.
- Provide "View all" links for extended content.

## Responsiveness & Breakpoints
- Breakpoints: 768px, 1024px, 1280px, 1440px. Define component behavior per breakpoint (e.g., table transforms to card list on <768px).

## Accessibility
- Maintain heading hierarchy (H1 per page, H2 for sections). Provide ARIA landmarks for navigation, main, complementary.
- Ensure focus order logical when sidebar collapsed/expanded.

## Data Loading & Empty States
- Use skeleton loaders for metrics and tables. Provide informative empty states with CTAs ("No insights yet—collect more data.").

## Analytics & Telemetry
- Track navigation interactions, filter usage, and time spent per section to inform future optimization.
