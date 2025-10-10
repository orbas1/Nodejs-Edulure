# Blade Template Design Notes

## Layout Structure
- Extend base layout with global navigation partial, notifications drawer include, and footer.
- Use section yields for page-specific content (`@section('hero')`, `@section('content')`).
- Provide `@stack('modals')` for asynchronous modals triggered via Alpine/React hybrid.

## Components
- Build reusable Blade components for `x-card`, `x-metric`, `x-nav-item`, `x-announcement` aligning with React components.
- Ensure components accept theming props (light/dark) and icon slots.

## Data Binding
- Use server-side hydration to deliver initial dataset (hero stats, modules) and allow React to take over interactions.
- For notifications, preload unread count; drawer fetches details via API on open.

## Accessibility
- Provide skip links and ARIA roles in base layout.
- Ensure forms and modals render accessible markup even before React hydration.

## Performance
- Defer non-critical scripts, inline critical CSS for fold content.
- Cache Blade views with invalidation on release updates.
