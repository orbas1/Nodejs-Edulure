# Responsive Behaviour & Screen Size Adjustments – Web Application v1.00

## Breakpoints
- **XS:** 0–479px
- **SM:** 480–767px
- **MD:** 768–1023px
- **LG:** 1024–1439px
- **XL:** 1440px+

## Layout Adjustments
| Component | XS | SM | MD | LG | XL |
| --- | --- | --- | --- | --- | --- |
| Header | 56px height, hamburger menu | 64px height, compact search | 72px height, segmented nav collapsed | 88px height, full nav | 88px height + parallax background |
| Sidebar | Hidden, accessible via bottom nav | Hidden | Collapsible overlay | 256px persistent | 256px persistent |
| Hero | Stack vertical, centre text | Stack vertical, image below | 60/40 split | 60/40 split | 60/40 with parallax |
| Cards | Full width | 2 per row | 2 per row | 3 per row | 3 per row |
| Dashboard Modules | Single column stack | Single column stack | 2 columns (8/4) | 2 columns (8/4) | 3 columns when space allows |
| Footer | Accordion sections | 2 columns | 3 columns | 4 columns | 4 columns |

## Typography Scaling
- Use CSS clamp for hero (`clamp(32px, 5vw, 56px)`), headings reduce by 2px per breakpoint drop.
- Body text remains 16px to maintain readability.

## Interaction Changes
- Carousel navigation becomes swipe gestures on touch devices.
- Tooltips replaced with inline helper text on XS/SM.
- Tables convert to card layouts with labelled rows on XS/SM.

## Performance Considerations
- Lazy-load hero illustration on XS to reduce payload.
- Serve lower resolution images (768px) on SM.
- Disable heavy animations when `prefers-reduced-motion` or when device memory <2GB (via JS heuristics).
