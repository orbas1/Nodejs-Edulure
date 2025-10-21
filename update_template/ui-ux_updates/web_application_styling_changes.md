# Web Application Styling Changes

## Design System Tokens
- Adopted shared **Aurora Web** token palette to align with mobile, ensuring cross-platform consistency.
- Typography stack updated to `"Inter", "Segoe UI", sans-serif` with responsive sizes using clamp() to support fluid scaling.
- Spacing tokens normalized to multiples of 8px, with micro spacing increments (4px) reserved for compact components.

## Layout & Grid
- Global layout uses CSS Grid with `minmax(320px, 1fr)` columns for flexible card arrangements.
- Introduced container queries for analytics widgets to adapt layout within dashboard sections.
- Section headers include accent underline using gradient border to highlight active areas.

## Color & Contrast
- Light theme background set to `#F8FAFF`; dark theme to `#0F172A`.
- Text and icon contrast validated with automated axe-core checks; color tokens updated to maintain AA minimums.
- Added `--color-surface-warning` and `--color-surface-danger` tokens for alert banners with subtle tinted backgrounds.

## Components
- **Navigation Bar:** Transparent by default, gains blurred background (`backdrop-filter`) on scroll for readability.
- **Buttons:** Primary buttons use gradient fill (`linear-gradient(135deg, #5C6BFF 0%, #7C3AED 100%)`) with accessible hover states.
- **Tables:** Zebra striping, sticky headers, and inline filter chips for better scannability.
- **Modals:** Max width capped at 720px, drop shadow softened, close button repositioned for better reach.

## Motion & Transitions
- Reduced motion mode disables non-essential animations; respects user preference media query.
- Standard easing curve `cubic-bezier(0.33, 1, 0.68, 1)` applied to navigation and dialog transitions.
- Skeleton loaders added for data-heavy sections, replacing spinners to reduce perceived latency.

## Accessibility Improvements
- Focus outlines use 3px `#2563EB` glow with 2px offset for high visibility.
- Form errors display inline with icon and ARIA attributes linking error to input.
- Table headers announced by screen readers thanks to explicit `scope="col"` attributes and captions.

## Branding & Imagery
- Updated hero illustrations to new brand style, exported as optimized SVG with accessible titles and descriptions.
- Added support for custom organization logos with automatic background removal and size constraints.

## Responsive Behavior
- Breakpoints adjusted: `sm=640px`, `md=900px`, `lg=1200px`, `xl=1440px`.
- Mobile navigation transforms into bottom dock with icon-only buttons and text tooltips on long press.
- Chart legends collapse into dropdown on screens <768px to maintain clarity.
