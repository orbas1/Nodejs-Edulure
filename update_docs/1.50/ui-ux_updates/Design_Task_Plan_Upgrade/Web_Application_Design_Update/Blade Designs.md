# Blade Template Design Notes – Web Application Design Update v1.50

## Objectives
- Align Laravel Blade templates with new layout structures, component tokens, and responsive behavior.
- Simplify partials structure to promote reuse across marketing pages, dashboards, and settings.

## Template Structure
- `layouts/main.blade.php` updated to include new global header, footer, and command palette overlay.
- `partials/navigation.blade.php` restructured for two-tier navigation with dynamic active state classes.
- `partials/hero.blade.php` handles hero content with optional video embed or illustration.
- `components/card.blade.php`, `components/button.blade.php`, `components/modal.blade.php` updated with design tokens and variant support.

## Blade Components Enhancements
- Introduce slot-based API for cards allowing header, body, footer slots.
- Buttons component accepts props for variant, icon position, loading state.
- Modals support size variants (sm, md, lg) and accessible aria attributes by default.

## Layout Changes
- Marketing pages use `layouts/marketing.blade.php` with additional sections for testimonial carousels and callout bands.
- Dashboard pages extend `layouts/dashboard.blade.php` with sidebar slots and breadcrumb injection.

## Performance & Maintainability
- Reduce inline styles; rely on CSS variables defined in `app.css`.
- Defer loading of heavy scripts using Blade stacks (`@push('scripts')`).
- Cache partials where possible (navigation, footer) to improve performance.

## Accessibility Considerations
- Ensure Blade templates include semantic markup (landmarks, headings hierarchy).
- Include skip links and aria attributes in header partial.
- Provide partial for screen-reader only text to accompany icon-only buttons.

## Testing & QA
- Update Laravel Dusk/Playwright tests to reference new component structure.
- Validate server-side rendering of dynamic states (active nav, CTA text) matches design specs.
