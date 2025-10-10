# Component Types for Web Application v1.00

Each component is described with physical dimensions, usage context, responsive behaviour, and asset dependencies. All measurements use the 8px base spacing scale unless noted.

## Structural Shell Components
- **Global Navigation Bar**
  - Height: 88px (desktop), 64px (compressed), 72px (tablet), 56px (mobile).
  - Layout: 12-column container with logo occupying columns 1–2 (max width 48px), segmented navigation 3–6, search overlay 7–9, utilities (notifications, create button, avatar) 10–12.
  - Background: `var(--surface-page)` with gradient edge `linear-gradient(180deg, rgba(76,125,255,0.12) 0%, rgba(11,17,32,0) 100%)`.
  - Assets: Logo from `/assets/brand/logomark_light.svg`, icons from `/assets/icons/24/`.
- **Contextual Sidebar**
  - Width: 256px expanded, 80px collapsed icon rail.
  - Structure: Section headers 14px uppercase, list items 18px/28px with 16px icon leading; pinned area with drag handles from `icons/16/grip.svg`.
  - Behaviour: Slide transition 240ms ease, remembers last state per user.
- **Workspace Canvas**
  - Max width 1320px, uses auto layout spacing `32px` horizontal, `48px` vertical.
  - Supports content modules, cards, charts with top padding 24px when sidebar present.
- **Action Drawers & Modals**
  - Drawers: 420px width from right, 64px header, 24px corner radius.
  - Modals: 640px default width, 720px max, content padding 32px, button bar 20px top border.

## Data Display Components
- **Insight Cards**
  - Dimensions: 320px width × 220px height (desktop), responsive to 100% width on mobile.
  - Sections: Header (20px label + badge), metric (48px numeral), sparkline (auto height 40px), CTA row.
  - Data Binding: Connects to analytics endpoint `GET /api/insights/:metric` with refresh interval 300s.
- **Collection Lists & Tables**
  - Tables: Row height 56px, header 48px with sticky top, zebra striping using `rgba(148,163,184,0.08)`.
  - Lists: Card list items 280px width, support thumbnail 96×96 from CDN.
- **Timelines & Activity Feeds**
  - Vertical timeline with 4px line, events spaced 48px, icons 32px circular with status colour ring 2px.
- **Charts & Visualisations**
  - Chart area 640×320 desktop, 100% width mobile. Use chart tokens defined in `colours.md`.
  - Include accessible descriptions via `<figcaption>` styled at 16px/24px.

## Interactive Components
- **Filter Chips & Segmented Controls**
  - Chip height 36px, padding `12px 16px`, border radius 999px. Selected state gradient `linear-gradient(90deg, #4C7DFF 0%, #A78BFA 100%)`.
- **Tabs & Accordions**
  - Tab height 48px, indicator 3px, 24px inset. Accordions use 1px border and 24px padding.
- **Buttons & Icon Toggles**
  - Buttons defined in `buttons.md`; toggles 40px square, icons centre 24px.
- **Form Inputs & Steppers**
  - Inputs 48px height, label 14px/20px. Steppers show stage circle 32px with 2px progress ring.

## Communication Components
- **Announcements Rail**
  - Width 320px (sidebar) or full width banner 100% × 64px. Rotates slides with 8s interval.
- **Toast Notifications**
  - 320px width, 56px min height, appear 24px from top-right. Include icon, title, action link.
- **Chat Dock**
  - Dock width 360px, min height 480px, resizable to 640px height. Contains tabbed header (Conversations/Channels) and message composer 104px with attachments.
- **Guided Coach Marks**
  - 280px width popovers with arrow, 20px radius, overlay blur 4px.

## Utility Components
- **Skeleton Loaders** sized to match host component with shimmer `background-size: 400% 100%`.
- **Search Overlay** full-screen `rgba(11,17,32,0.88)` backdrop, central panel 720px width, 32px radius, results list items 64px height.
- **Analytics Exporter** status panel 480px width with timeline of export steps, check icons from `/assets/icons/20/check-circle.svg`.
