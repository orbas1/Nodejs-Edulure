# SCSS Workflow

## Project Setup
- Maintain SCSS entry `app.scss` compiling into global CSS bundle.
- Structure partials under `/styles/scss` with categories: `abstracts`, `base`, `components`, `layout`, `utilities`.

## Partials
- `_variables.scss`: Mirror design tokens; export CSS variables via `:root` mixin.
- `_mixins.scss`: Include responsive mixins (`respond($breakpoint)`), gradient generators, and accessible focus utilities.
- `_functions.scss`: Provide colour manipulation (lighten/darken) while respecting contrast constraints.
- `_typography.scss`: Define font stacks, heading mixins, text truncation utilities.

## Usage Pattern
```
@use 'abstracts/variables' as *;
@use 'abstracts/mixins';

.dashboard {
  padding: space(24);
  @include respond(md) {
    padding: space(32);
  }
}
```

- `space()` helper returns rem values derived from token scale.
- `respond()` handles breakpoints: `sm (640px)`, `md (900px)`, `lg (1200px)`.

## Theming
- Use CSS variable output for runtime theming; SCSS handles structure but avoids compiling separate themes.
- Provide mixin `theme-props($map)` to iterate token map and assign custom properties under `[data-theme="dark"]` etc.

## Maintenance
- Enforce linting with Stylelint + SCSS plugin; align with update pipeline in `frontend-reactjs`.
- Document each mixin/function using SassDoc comments to aid cross-team adoption.
