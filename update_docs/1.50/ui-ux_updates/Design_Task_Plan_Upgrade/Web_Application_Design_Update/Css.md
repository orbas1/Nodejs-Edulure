# CSS Strategy – Web Application Design Update v1.50

## Objectives
- Centralize design tokens (colors, typography, spacing, shadows) within CSS variables for consistency.
- Reduce specificity conflicts by adopting utility-first layering approach combined with component classes.
- Improve maintainability and performance by purging unused styles and modularizing code.

## Structure
- `app.css` imports base variables, resets, typography, utilities, component modules.
- Define CSS variables under `:root` and `[data-theme="dark"]` for theming.
- Use BEM-inspired naming for components: `.card--metric`, `.button--primary`, `.nav__item`.

## Utilities
- Create utility classes for spacing (`.u-mt-24`, `.u-px-16`), layout (`.u-flex`, `.u-grid-3`), text alignment, and display.
- Provide `visually-hidden` utility for accessible text.
- Use CSS custom properties for gradient backgrounds to allow runtime theme adjustments.

## Responsive Breakpoints
- Define mixins for breakpoints: `--bp-sm: 600px`, `--bp-md: 768px`, `--bp-lg: 1024px`, `--bp-xl: 1280px`, `--bp-xxl: 1440px`.
- Use `@media` queries referencing variables for maintainability.

## Performance Optimizations
- Enable PurgeCSS or equivalent to remove unused classes in production builds.
- Split CSS bundles by route (marketing vs dashboard) to reduce initial load.
- Use `prefers-reduced-motion` media query to disable animations when requested.

## Accessibility
- Ensure focus styles defined globally (`:focus-visible`) to maintain consistency.
- Provide high-contrast theme via `[data-theme="high-contrast"]` modifiers.

## Documentation
- Maintain style guide in Storybook demonstrating CSS usage.
- Document code standards (ordering, nesting) in contribution guidelines.
