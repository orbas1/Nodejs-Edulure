# Component Placement Guidelines – Web Application v1.00

## Home Page
- Hero occupies full width, top padding 120px to accommodate sticky header. Copy column spans grid columns 1–6, illustration spans 7–12.
- Value pillars arranged in three-column grid (columns 1–4, 5–8, 9–12) with 32px gap.
- Testimonials slider centered within columns 2–11.
- Conversion band extends full width with 64px padding and background gradient.

## Dashboard
- KPI row across columns 1–12, each card width 276px with 24px gap.
- Revenue chart positioned columns 1–8, height 360px. Learner funnel columns 9–12, height 360px.
- Tasks list columns 1–4, announcements columns 5–8, storage usage widget columns 9–12 in lower section.

## Learn Library
- Filter panel fixed to left columns 1–3 with sticky top offset 112px. Content grid columns 4–12 with 24px gutter.
- Search bar spans columns 1–12, margin-bottom 24px.

## Course Detail
- Media hero spans columns 1–8 with 24px right margin; course summary card columns 9–12.
- Curriculum list columns 1–8 below hero; instructor card columns 9–12 sticky with offset 112px.

## Community Hub
- Filters column 1–3, feed columns 4–9, sidebar (events + leaderboard) columns 10–12.
- Chat dock anchored bottom-right, 24px margin from edges.

## Settings Dashboard
- Overview metrics columns 1–12 (4 cards). Quick toggles columns 1–6, audit log columns 7–12.
- Tab content uses two-column layout with 40px gutter for forms.

## Profile Page
- Cover image full width, content card overlaps by -64px using `transform`.
- Left column columns 1–4 (profile summary), middle columns 5–8 (timeline), right columns 9–12 (widgets).

## Responsive Adjustments
- At <1024px, convert multi-column layouts to single column stacked in the following order: primary content, secondary content, tertiary.
- At <768px, hero copy centred; forms stretch to 100% width with 24px horizontal padding.
- Maintain minimum 16px margin from viewport edges on mobile.
