# Edulure design system – responsive and accessible foundations

The design system tokens and utilities live alongside the marketing and dashboard
code so that performance and accessibility guardrails stay close to the
components that rely on them. The following conventions are now codified in
`frontend-reactjs/src/styles/tokens.css` and consumed throughout the React
application.

## Token scales

- **Colour** – Surface, border, text, and accent colours map to CSS custom
  properties that support both light and high-contrast contexts. Dark mode can
  opt in by toggling `data-theme="dark"` on the `body` element. High contrast is
  handled by `data-contrast` attributes, which receive updates from
  `observeHighContrast` watchers in `MainLayout` to respect forced colours and
  user toggles.
- **Spacing** – Consistent spacing primitives (`--space-2xs` through
  `--space-3xl`) back marketing and dashboard padding decisions. Component CSS
  can consume these tokens directly or through Tailwind utilities when
  responsive behaviour is not required.
- **Breakpoints** – Breakpoint values (`--breakpoint-sm`–`--breakpoint-2xl`)
  expose the layout thresholds used for responsive JS. Components should read
  values via `getBreakpointValue` or subscribe through `observeBreakpoint` to
  avoid duplicating media queries.
- **Motion** – Motion durations and easings adapt automatically when the
  `prefers-reduced-motion` media query changes. The `observePrefersReducedMotion`
  helper keeps the `data-motion` attribute on `body` in sync so CSS can reduce
  animation when users opt out.

## Responsive grid utilities

`styles.css` exposes a `.layout-grid` utility that powers card grids across the
marketing site. The grid sets a responsive minimum column size and allows each
section to request a maximum column count via the `data-max-columns`
attribute. This approach keeps layout logic declarative while allowing sections
such as `PerksGrid` to adapt seamlessly from single-column stacks to wide
three-column layouts. Designers can override the grid gutter or minimum column
width per component by redefining `--grid-gutter` or `--grid-column-min` on the
section wrapper.

## Accessibility helpers

The new `frontend-reactjs/src/utils/a11y.js` module centralises accessible
behaviour:

- `trapFocus` enforces keyboard focus within custom dialogs. `CalendarEventDialog`
  and `PricingTierDialog` both rely on it to provide predictable modal navigation.
- `observePrefersReducedMotion` and `observeHighContrast` synchronise body data
  attributes so CSS reduces motion and enhances contrast automatically.
- `prefersReducedMotion`, `getBreakpointValue`, and `observeBreakpoint`
  streamline runtime checks for motion and layout changes without duplicating
  constants across components.

## Personalised accessibility profiles

`frontend-reactjs/src/context/SystemPreferencesContext.jsx` loads the logged-in
learner’s saved preferences and mirrors them onto `body` attributes. This
provider coordinates with the `MainLayout` media-query observers so a user’s
`reducedMotion`, `highContrast`, and interface density settings always win over
system defaults while remaining responsive to OS changes. The provider now
rehydrates the latest preference snapshot from `localStorage` (keyed per user)
before the API call resolves, preventing perceptible flicker on sign-in or
refresh and honouring the “offline-friendly caching” goal in the experience
outline. The accompanying CSS in `frontend-reactjs/src/styles.css` reacts to
`data-density` to compress or expand spacing, letting compact dashboards and
spacious marketing pages share the same primitives.

Seed data in `backend-nodejs/seeds/001_bootstrap.js` provisions
`learner_system_preferences` and `learner_finance_purchases` rows so demo
tenants boot with realistic accessibility and billing records. The database
schema, models, and front-end state are therefore aligned end-to-end.

## Automated accessibility checks

A dedicated `npm run test:accessibility` script executes Vitest suites under
`frontend-reactjs/test/accessibility`. The baseline test exercises
`CalendarEventDialog` with `jest-axe` to guard against regressions in modal
markup and focus management. Additional surfaces can register their own tests by
placing files in the same directory.
