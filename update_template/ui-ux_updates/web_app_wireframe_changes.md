# Web App Wireframe Changes

## Global Navigation
- Moved from side navigation to persistent top navigation bar with contextual sub-navigation.
- Added notification bell and quick-create button on the right, both tied to RBAC to hide for restricted roles.
- Search relocated to the center of the header with scoped filters (Courses, Communities, Members).

## Dashboard Layout
- Adopted 12-column responsive grid with 24px gutters on desktop, collapsing to 6 columns on tablet.
- Hero section now highlights progress summary, upcoming sessions, and active campaigns in a three-card layout.
- Introduced "Action Center" rail on the right with prioritized tasks, warnings, and compliance alerts.

## Course Management
- List view gains stacked row layout with inline status badges and quick actions (Publish, Archive, Duplicate).
- Detail page uses two-column layout: left for overview/content, right for analytics and RBAC visibility matrix.
- Added breadcrumb trail with contextual actions ("Add Module", "Preview", "Share") pinned at top.

## Community Hub
- Rebuilt timeline with segmented filters (Announcements, Discussions, Polls, Events).
- Conversation pane integrates thread view with inline moderation controls for curators.
- Right rail features member activity insights and trending topics, aligning with data from analytics API.

## Settings & Compliance
- Settings split into tabs (Account, Notifications, Privacy, Integrations).
- Privacy tab surfaces CORS allowlist preview and allows domain request submission for administrators.
- Integrations tab includes API key management with scoped roles and audit log viewer.

## Responsive Considerations
- Collapsible navigation on ≤1024px screens with accessible hamburger menu.
- Sticky bottom navigation bar introduced for ≤768px to prioritize dashboard, courses, community, and inbox.
- Charts switch to stacked layout on small screens with tooltip interactions optimized for touch.
