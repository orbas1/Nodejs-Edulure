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
