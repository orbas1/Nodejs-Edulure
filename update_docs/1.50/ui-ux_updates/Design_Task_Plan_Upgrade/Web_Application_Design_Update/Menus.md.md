# Navigation & Menu Strategy – Web Application v1.50

## Global Header
- Left: logo linking to home. Center: top-level navigation (Learn, Teach, Community, Pricing). Right: Search, Notifications, Account menu.
- Sticky with shrink-on-scroll behavior. Includes skip-to-content link.

## Contextual Sidebar
- Appears on authenticated pages. Contains sections: Overview, Cohorts, Analytics, Resources, Settings.
- Supports collapsing to icons; tooltips appear on hover/focus. Active item highlighted with gradient bar.

## Mega Menu (Marketing)
- Under "Learn" displays featured cohorts, categories, quick links. Two-column layout with imagery.
- Accessible via keyboard; closes on escape or outside click.

## Account Menu
- Dropdown triggered by avatar. Includes profile, settings, switch role, support, logout.
- Provide badges for pending notifications or billing issues.

## Footer Navigation
- Multi-column links with legal, company, resources, social. Include language selector.

## Mobile Navigation
- Hamburger menu slides from left; contains primary links and CTA button. Bottom sticky CTA for "Browse Cohorts".
- Command palette accessible via icon and keyboard (when supported).

## Accessibility
- All menus focus-trap when open. Provide ARIA roles (`menu`, `menuitem`).
- Ensure menu items reachable via keyboard and screen reader announcements include context.

## Analytics
- Track navigation interactions (`nav_top_click`, `nav_sidebar_toggle`, `nav_account_select`).
