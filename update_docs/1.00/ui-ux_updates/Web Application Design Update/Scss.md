# SCSS Architecture – Web Application v1.00

## Folder Structure
```
styles/
  _variables.scss
  _mixins.scss
  _functions.scss
  base/
    _reset.scss
    _typography.scss
    _layout.scss
  components/
    _buttons.scss
    _cards.scss
    _forms.scss
    _navigation.scss
  pages/
    _home.scss
    _dashboard.scss
    _profile.scss
  themes/
    _dark.scss
    _light.scss
  main.scss
```
`main.scss` imports variables → mixins → base → components → pages → themes to preserve specificity layering.

## Variables & Maps
- `$_spacing-scale: (xs: 4px, sm: 8px, md: 16px, lg: 24px, xl: 32px, xxl: 48px, xxxl: 64px);`
- `$colors: (
    surface-page: #0B1120,
    surface-card: #111C3B,
    surface-alt: rgba(15,23,42,0.75),
    border-soft: rgba(148,163,184,0.24),
    accent-electric: #4C7DFF,
    accent-lilac: #A78BFA,
    accent-sun: #F59E0B,
    accent-mint: #34D399,
    accent-crimson: #F87171,
    text-primary: #F8FAFC,
    text-secondary: #CBD5F5
  );`
- Theme map merges base with overrides from `_light.scss` using `map-merge`.

## Mixins
- `@mixin respond($breakpoint)` – Accepts `xs`, `sm`, `md`, `lg`, `xl` to output media queries consistent with `Screen Size Changes.md`.
- `@mixin focus-ring` – Applies accessible outline.
- `@mixin gradient-button($from, $to)` – Generates gradient backgrounds with hover adjustments.
- `@mixin elevation($level)` – Accepts `1–5` to output box-shadow tokens.

## Functions
- `@function color($token)` – Returns colour from `$colors`, throws error if undefined to enforce token usage.
- `@function spacing($size)` – Returns spacing scale value for consistent measurement.
- `@function font($size)` – Interfaces with typography scale defined in `_typography.scss`.

## Component Guidelines
- Buttons use `@include gradient-button(color(accent-electric), color(accent-lilac));` with modifiers `.btn--primary`, `.btn--secondary`, `.btn--ghost`.
- Cards set `border-radius: spacing(lg);` and `box-shadow: @include elevation(4);`.
- Forms leverage shared mixins for labels, help text, and validation states.

## Theme Switching
- Use `:root` variables generated from SCSS maps via loop:
```
:root {
  @each $token, $value in $colors {
    --#{$token}: #{$value};
  }
}
[data-theme="light"] {
  @each $token, $value in $light-theme {
    --#{$token}: #{$value};
  }
}
```
- Keep parity with CSS custom properties to allow runtime theme toggling without recompilation.

## Build Process
- Compile SCSS with `dart-sass` (minimum version 1.63) enabling source maps for dev builds.
- Use autoprefixer targeting `>0.5%, last 2 versions, not dead`.
- Enforce linting via `stylelint` config referencing `scss/selector-no-qualifying-type` rule to prevent over-specific selectors.

## Documentation & Testing
- Document mixins and functions in Storybook docs.
- Snapshot test compiled CSS for regressions using `jest-styled-components` integration.
- Align tokens with `Design_update_progress_tracker.md` milestone checkboxes.
