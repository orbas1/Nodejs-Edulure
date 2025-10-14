# Responsive Breakpoint Adjustments – Web Application v1.50

## Breakpoints
- `≤480px` Mobile Portrait
- `481–767px` Mobile Landscape / Small Tablet
- `768–1023px` Tablet
- `1024–1279px` Small Desktop
- `1280–1439px` Desktop
- `≥1440px` Large Desktop

## Layout Adjustments
- Navigation: header condenses, hamburger menu appears ≤1023px. Sidebar collapses into overlay.
- Grid layouts: marketing sections shift from 3→2→1 columns; dashboard cards stack vertically on tablet/mobile.
- Tables: switch to card list view on ≤768px with key information surfaced.
- Charts: simplified versions (sparklines) on mobile; full tooltips on desktop.

## Typography
- Scale headings down by one level on mobile to maintain readability. Increase line height for dense content.

## Images & Media
- Use `<picture>` sources for hero imagery to serve appropriate sizes. Lazy-load offscreen media.

## Interaction Patterns
- Replace hover-only interactions with tap-friendly alternatives. Ensure menus accessible via touch.

## Testing
- Validate across modern browsers (Chrome, Safari, Firefox, Edge) and key devices (iPad, Surface, common smartphones).
