# Responsive & Screen Size Adjustments

## Breakpoints
- **XS (≤480px):** Mobile portrait. Bottom navigation bar, collapsible hero, stacked sections.
- **SM (481–768px):** Mobile landscape/tablet portrait. Navigation collapses to hamburger, carousels become horizontal scroll.
- **MD (769–1024px):** Tablet landscape/small desktop. Sidebar collapsible, two-column layouts introduced.
- **LG (1025–1440px):** Standard desktop. Full navigation, 12-column grid, card gutters 24px.
- **XL (≥1441px):** Wide desktop. Increase max width to 1440px; hero expands, apply max width wrappers to text blocks.

## Adaptive Behaviour
- Auto-detect device orientation to adjust hero height.
- Chart tooltips reposition to avoid clipping on smaller screens.
- Buttons expand to full width on mobile; icon labels hidden when width limited.

## Performance Considerations
- Lazy load below-the-fold modules on mobile.
- Use responsive images with `srcset` to deliver appropriate resolution.
- Defer non-critical animations when `prefers-reduced-motion` true.
