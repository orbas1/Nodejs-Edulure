# Screens Update Widget Types

## Widget Catalogue

| Widget ID | Category | Description | Core Props | States | Associated Screens |
| --- | --- | --- | --- | --- | --- |
| W-ANA-001 (Hero KPI Card) | Analytics | Displays metric value, delta arrow, and timeframe chip. | `value`, `delta`, `trendDirection`, `timeframe`, `icon` | default, loading (skeleton), warning (delta < 0), success (delta > target) | PD-01 |
| W-ANA-002 (Revenue Spark-line) | Analytics | 7-day area chart with hover tooltip and threshold marker. | `series[]`, `currency`, `threshold` | default, compare (dual series overlay), offline (grayed) | PD-01 |
| W-ANA-003 (Completion Gauge) | Analytics | Circular gauge with badge overlay for goal attainment. | `percentage`, `goal`, `label` | default, goal-met (burst animation), warning (<50%) | PD-01, LR-01 |
| W-ACT-010 (Quick Action Pill) | Action | Rounded pill button with icon, label, and progress ring. | `icon`, `label`, `targetFlow`, `progress` | idle, pressed, loading, disabled | PD-01 |
| W-ACT-011 (Bulk Actions Bar) | Action | Sticky toolbar showing selection count and CTA buttons. | `selectionCount`, `actions[]` | hidden, docked, stacked (overflow) | PD-02 |
| W-ACT-012 (Task Checklist Item) | Action | Row with checkbox, due date chip, assignee avatar. | `title`, `dueDate`, `assignee`, `status` | pending, completed, overdue | PD-01 |
| W-MED-020 (Media Card) | Media | Tile with thumbnail, status chip, progress ring, actions menu. | `thumbnail`, `title`, `status`, `progress`, `badges[]` | idle, selected, converting, error | PD-02 |
| W-MED-021 (Resume Carousel Card) | Media | Wide card with cover art, progress bar, "Resume" CTA. | `cover`, `title`, `progress`, `ctaLabel` | default, focus (raised), completed (badge), offline (cached icon) | LR-01 |
| W-MED-022 (Media Canvas) | Media | Adaptive viewport for slides, ebooks, or audio waveform. | `mediaType`, `source`, `currentPosition`, `annotations[]` | loading, playing, paused, buffering | LR-02 |
| W-SOC-030 (Community Pulse Chip) | Social | Compact alert chip with icon, count, severity band. | `label`, `count`, `severity`, `targetFilter` | default, pressed, muted | PD-01 |
| W-SOC-031 (Event Strip Card) | Social | Horizontal card with date badge, title, RSVP button. | `eventId`, `startTime`, `location`, `ctaLabel` | default, RSVP'd, full, offline (grey) | LR-01 |
| W-SOC-032 (Discussion Drawer) | Social | Slide-over panel listing threaded comments and reactions. | `threadId`, `sort`, `unreadCount` | collapsed, open, reply-active | LR-02 |
| W-SYS-040 (Navigation Header) | System | Top app bar with title, breadcrumbs, actions. | `title`, `breadcrumb[]`, `actions[]`, `density` | expanded, condensed, scrolled, offline (banner) | PD-01, PD-02, LR-01 |
| W-SYS-041 (Support Assistant Button) | System | Floating icon button exposing contextual tips. | `unreadCount`, `context`, `assistantsAvailable` | idle, attention (pulse), disabled (maintenance) | All |
| W-SYS-042 (Offline Queue List) | System | List of pending uploads/messages with retry controls. | `items[]`, `retryAllTarget` | hidden, attention (badge), expanded | Shared Utility |

## Composition Guidelines
- Every screen blueprint references widget IDs to ensure one-to-one mapping with coded components.
- Each widget requires documented props, event outputs, and analytics hooks; include JSON schema in handoff package.
- Variant definitions must cover light/dark themes and high-contrast adjustments; supply token overrides alongside primary spec.
