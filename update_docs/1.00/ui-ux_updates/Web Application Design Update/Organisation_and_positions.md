# Layout Organisation & Element Positioning – Version 1.00

## Grid Hierarchy
- Primary grid: 12 columns, 24px gutters, max width 1320px. Margins 48px desktop, 32px tablet, 16px mobile.
- Secondary grid for cards: 4 columns inside modules with 24px gap.
- Baseline grid: 4px increments, align typography line heights.

## Navigation
- Header anchored top with sticky behaviour, compressing after scroll. Search sits centre, actions right.
- Sidebar anchored left, sections grouped with 24px separation and labelled headers 14px uppercase.
- Breadcrumb placed below header in utility bar (52px height) aligning with content start.

## Content Hierarchy
1. **Primary Actions** – Always top-left within content area, using primary buttons or CTA cards.
2. **Secondary Insights** – Align to right column or within cards with accent backgrounds.
3. **Contextual Tools** – Place alongside modules they affect (filters above tables, toggles in right rail).

## Visual Balance
- Use negative space at 24px increments to avoid overcrowding.
- Pair gradients with solid surfaces to maintain contrast.
- Keep hero illustration anchored to top-right to balance heavy typography left.

## Component Placement Rules
- Buttons align to baseline of copy; if stacked, maintain 12px vertical spacing.
- Icons align optically with text (use `translateY(1px)` for 24px icons next to 16px text).
- Charts occupy at least 2 columns width; avoid single-column charts to prevent clutter.

## Responsive Reflow
- When collapsing to single column, maintain order: headline, description, primary action, secondary content, tertiary content.
- Sidebar content becomes accordion under header, with first section expanded by default.
- KPI cards convert to horizontal scroll with snap alignment on mobile.

## Accessibility Considerations
- Ensure focus order follows visual order. Use CSS logical properties for left/right to accommodate RTL languages.
- Provide skip link before header to jump to main content.

## Screen-specific Layout Blueprints
- **SCR-00 Home:** 12-column layout with hero occupying columns 1–7 (copy) and 8–12 (illustration). Testimonial carousel spans columns 1–12 at 440px height with 3-card carousel.
- **SCR-01 Onboarding:** Stepper anchored top across columns 1–12 at 64px. Form card spans columns 3–10; summary column appears on desktop columns 9–12.
- **SCR-02 Dashboard:** KPI row uses 4 cards spanning 3 columns each with 24px gutter; task rail fixed columns 10–12 with sticky 120px offset.
- **SCR-03 Learn Library:** Filter ribbon anchored below header, spans columns 1–12. Course grid uses 3-column layout (cols 1–4,5–8,9–12) with 32px row gap.
- **SCR-04 Course Detail:** Hero stats in columns 1–8, instructor meta columns 9–12. Syllabus accordion sits columns 1–8, reviews column 9–12 stacking on tablet.
- **SCR-05 Lesson Player:** Video player centred columns 2–11 with max width 960px, transcript pane column 11–12 (collapsible). Notes drawer overlays from right at 400px width.
- **SCR-06 Communities:** Feed occupies columns 4–10, topic nav column 1–3, events column 10–12; on tablet feed full width, events move under feed.
- **SCR-07 Community Detail:** Hero overlay full width, stats chips columns 3–10. Members list column 9–12 sticky with 80px offset.
- **SCR-08 Profile:** Hero height 360px with avatar overlapping content at column 2. Timeline uses 2-column grid (content columns 1–8, supporting cards 9–12).
- **SCR-09 Settings:** Tabs sticky columns 1–12 height 64px. Content uses 8/4 split: form columns 1–8, summary 9–12.
- **SCR-10 Support:** FAQ accordion columns 1–8, contact card stack 9–12. Ticket history appears below forms full width.
- **SCR-11 Admin Analytics:** Filters row columns 1–12 at 72px. Analytics board uses 4-column masonry; timeline panel column 9–12.
- **SCR-12 Admin Content:** Toolbar columns 1–12. Data table full width with inline filters column 1–3, table body 1–12. Drawer overlays from right at 520px.

## Responsive Adjustments
- At MD (768–1023px), collapse side panels to accordions appended below main content (task rail, events, summary columns).
- At SM (<768px), use stacked layout with consistent 24px vertical spacing; hero metrics convert to horizontal scroll chips.
- Maintain minimum touch padding 16px around interactive clusters.
