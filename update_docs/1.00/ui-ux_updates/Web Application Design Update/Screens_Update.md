# Screen Update Summary – Version 1.00

## Objectives
- Deliver pixel-exact blueprints for each learner, provider, and admin screen that align with the global design tokens.
- Establish responsive behaviour with dimension references for XS–XL breakpoints.
- Document interactions, motion, and accessibility requirements so engineering can implement without additional redlines.

## Scope & Outcomes
| Workstream | Screens Included | Outcome |
| --- | --- | --- |
| Marketing & Home | SCR-00 | Hero orbit system, value pillar panels, testimonial carousel, CTA strip |
| Onboarding | SCR-01 | Four-step wizard with progress indicator and inline validation |
| Core App Shell | SCR-02 → SCR-12 | Role-aware dashboards, learn library, course & lesson experiences, communities, profile, settings, support, admin analytics & content suites |

## Key Enhancements
1. **Responsive Grid Harmonisation** – All screens share the 12-column responsive grid with defined collapse points (`LG: 1320px max`, `MD: 960px`, `SM: 640px`, `XS: 360px`). Widgets specify minimum/maximum column spans to avoid layout drift.
2. **Widget Library Alignment** – KPI, card, table, and form widgets reuse base components documented in `component_types.md`, guaranteeing consistent spacing, shadows, and state styling.
3. **Motion Blueprint** – Each screen specifies entry animations and micro-interaction timing to align with the system easing curves.
4. **Enterprise-ready Accessibility** – All flows include keyboard navigation order, focus traps for modals, and ARIA attributes for complex components (mega menus, carousels, charts).
5. **Data-driven Personalisation** – Onboarding, dashboard, and profile screens reference dummy datasets to ensure sample states cover edge cases (empty, loading, error, populated).

## Deliverables
- Screen-level specification docs (see `Screens_update_*` series) with annotated dimensions and asset sourcing.
- Updated logic flow diagrams capturing screen transitions and back-end dependencies.
- Colour, typography, and layout tokens mapped to each screen to enable theming toggles (light/dark, reduced motion).
- Button, text, and widget catalogues with copywriting guidance and state definitions.

## Dependencies & References
- Uses navigation shell updates defined in `Menus.md` and `Organisation_and_positions.md`.
- Relies on component specs in `Cards.md`, `Forms.md`, `buttons.md`, and `component_functions.md`.
- Dummy data definitions located in `Dummy_Data_Requirements.md` for Storybook fixtures and integration testing.

## Implementation Notes
- Engineering teams should import layout constants from `@edulure/design-tokens` package (exporting spacing scale, breakpoints, radii).
- Motion is implemented via Framer Motion with layoutId transitions for cross-screen navigation (dashboard ↔ learn library ↔ course detail).
- Provide QA with Zeplin exports capturing both dark and light theme variants plus `prefers-reduced-motion` states (animations replaced with fades).
