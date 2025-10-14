# SCSS Architecture – Web Application v1.50

## Structure
- Use modular SCSS with folder hierarchy: `abstracts/` (variables, mixins, functions), `base/` (reset, typography), `components/`, `layouts/`, `pages/`, `utilities/`.
- Import order: abstracts → base → components → layouts → utilities → pages.

## Variables & Mixins
- Store design tokens in `_variables.scss` referencing CSS variables to maintain theme support.
- Mixins for media queries (`@include respond('md')`), gradient backgrounds, flex/grid utilities, focus states.
- Functions for color manipulation (lighten/darken) using CSS variables.

## Theming
- Define theme maps for light, dark, high-contrast. Use mixins to apply theming to components.
- Provide `data-theme` attribute handling for runtime theme switching.

## Component Styling
- Each component receives dedicated SCSS partial (e.g., `_card.scss`, `_button.scss`) using BEM naming.
- Avoid deep nesting beyond three levels to maintain readability.

## Build & Optimization
- Compile SCSS via webpack/build pipeline; enable source maps in development.
- Use autoprefixer for cross-browser compatibility.
- Integrate stylelint to enforce conventions.

## Documentation
- Document SCSS conventions in README; include examples for adding new components.
- Link SCSS partials to Storybook stories for visual regression tests.
