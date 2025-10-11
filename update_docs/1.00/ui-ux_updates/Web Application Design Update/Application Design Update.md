# Application Design Update – Web v1.00

## Strategic Goals
1. **Unify experiences** across marketing, learner, provider, and admin views with a single design language.
2. **Increase conversion and engagement** by modernising key flows (home hero, onboarding, dashboard tasks, course playback).
3. **Improve scalability** via documented tokens, reusable widgets, and data requirements enabling rapid engineering implementation.
4. **Ensure accessibility and compliance** with WCAG 2.1 AA and enterprise security expectations.

## Deliverables Overview
- Complete screen specs for SCR-00 to SCR-12 (layouts, copy, colours, assets, widgets).
- Updated logic flows and maps aligning navigation, data fetching, and cross-screen dependencies.
- Refined component documentation (buttons, cards, forms, menus) tied to screen usage.
- Dummy data requirements enabling Storybook, QA, and integration testing.
- Asset sourcing plans (imagery, vectors, animation) with optimisation directives.

## Key Screen Highlights
- **Home (SCR-00):** 60/40 hero split with parallax orbit, targeted testimonials, CTA focus.
- **Dashboard (SCR-02):** Personalised KPI grid, tasks rail, announcement surfaces with real-time updates.
- **Learn & Course Experience (SCR-03/04/05):** Cohesive flow from discovery to playback with autosave, transcript sync, and notes drawer.
- **Communities (SCR-06/07):** Rich social feed, events integration, chat dock, and admin controls.
- **Settings (SCR-09):** Tabbed experience with sticky summary rail and robust billing/security coverage.
- **Admin Analytics & Content (SCR-11/12):** Data-heavy dashboards and catalogue management with bulk actions and detail drawers.

## Implementation Guidance
- Responsive behaviour defined for each breakpoint; engineering to reference `Screens_list.md` and `Organisation_and_positions.md` for column spans.
- Motion design uses shared easing tokens; Framer Motion recommended for React implementation.
- Accessibility hooks (focus management, ARIA attributes) enumerated per widget in `Screens_Updates_widget_functions.md`.
- Dummy data fixtures to be generated via `yarn fixtures:generate --preset web-v1` before Storybook review.

## Collaboration & Handoff
- Figma library `Edulure DS / Web v1.00` contains component variants linked to documentation.
- Zeplin exports deliver pixel values and redlines; stored under `handoff/zeplin/web_v1.00`.
- QA checklists and test cases referenced in `update_docs/1.00/update_tests` to ensure parity with design.

## Next Steps
- Validate prototypes with internal stakeholders (Product, Sales, Customer Success) for narrative consistency.
- Conduct accessibility audit (Axe + manual keyboard walkthrough) prior to engineering handoff.
- Monitor analytics post-launch to evaluate CTA conversions, course completion, and community engagement.
