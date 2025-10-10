# Web Application Design Update – Version 1.00

## Executive Overview
Version 1.00 delivers the first production-ready design system for the Edulure web application. The update codifies the global shell, a modular home experience, analytics-driven dashboards, and role-aware workflows so the marketing, learner, and provider audiences experience a unified brand. Every visual, content, and interaction guideline below is implementation-ready with dimensional, colour, and asset sourcing detail to inform engineering, copywriting, and QA teams.

## Core Experience Pillars
1. **Clarity at a Glance** – Prioritise above-the-fold storytelling, explicit next-step prompts, and contextual metadata for courses, providers, and communities.
2. **Scalable System** – All modules consume the shared 12-column responsive grid with spacing tokens (8px base scale) for effortless recomposition.
3. **Human-Led Tone** – Typography, colour, and motion reinforce a supportive, aspirational brand suitable for enterprise partnerships and learner trust.
4. **Accessible by Default** – WCAG 2.1 AA compliance is maintained across colour ratios, focus management, and keyboard navigation.

## Layout Grid & Breakpoints
| Breakpoint | Width Range | Columns | Gutter | Margins | Notes |
| --- | --- | --- | --- | --- | --- |
| XS | 0–479px | 4 | 16px | 16px | Components stack vertically with full-bleed hero media and sticky utility bar. |
| SM | 480–767px | 6 | 20px | 20px | Drawer navigation replaces sidebar; hero copy reduces to two lines; cards centre aligned. |
| MD | 768–1023px | 8 | 24px | 32px | Sidebar collapsible; two-column dashboards; home hero retains 60/40 split. |
| LG | 1024–1439px | 12 | 24px | 48px | Primary experience, persistent sidebar, maximum 1200px content width. |
| XL | ≥1440px | 12 | 32px | 72px | Introduce third analytics column, hero background animates parallax, maintain max readability width of 1320px. |

Spacing tokens follow an 8px scale (`4, 8, 12, 16, 24, 32, 40, 48, 64, 80, 96`). Vertical rhythm uses `24px` baseline increments, aligning typography line heights to the grid.

## Navigation Shell & Global Patterns
- **Header Height:** 88px default, compresses to 64px on scroll after 120px threshold. Contains logo (48px wide), segmented navigation (Prospective Learners, Providers, Enterprises), global search (320px max width), notification bell, quick-create (`+ Create` button), and avatar stack (40px). Header uses background `#0B1120` with 16px bottom border gradient overlay.
- **Sidebar:** 256px fixed width at ≥1024px, 80px icon rail when collapsed. Houses primary section list, pinned shortcuts, and KPI mini-widget (96px height) showing weekly progress.
- **Footer:** 280px height multi-column layout: product links (4 columns of 12 items), trust badges (sourced from `assets/brand/trust/` at 120x40px), and newsletter form.
- **Utility Bars:** Sticky sub-header (52px) for page-level filters and breadcrumb.

## Hero & Content Modules
- **Hero Composition:** 60/40 split between copy and illustration. Copy container width 560px, includes eyebrow (14px uppercase), H1 (Clamp 40–56px, line-height 1.1), supporting paragraph (18px/28px), primary CTA (Primary button 56px height) and secondary text link. Hero background uses layered gradient with radial overlay anchored at 20% x / 30% y. Illustration uses 3D render from `resources/figma/hero_orbit_v1.fig`, exported as optimized SVG with 0.8 opacity glow.
- **Content Sections:** Each section has 80px top and bottom padding, anchored to grid. Alternating background tokens `--surface-page` and `--surface-alt` for contrast. Section headers include H2 (32px) with accent underline (4px height, 48px width, `#4C7DFF`).
- **Card Rows:** Display 3 cards at ≥1280px (Card width 320px, min height 280px), 2 cards at MD, 1 card at SM. Cards have 20px border radius, 1px border `rgba(148,163,184,0.16)`, 24px padding, drop shadow `0 24px 64px rgba(8, 18, 36, 0.42)`.

## Motion & Micro-Interactions
- **Timing:** Use `120ms` ease-out for hover states, `240ms` ease-in-out for modals/drawers, `320ms` for hero background parallax transitions.
- **Easing Curves:** `cubic-bezier(0.33, 1, 0.68, 1)` for entering animations, `cubic-bezier(0.32, 0, 0.67, 0)` for exits.
- **Scroll Effects:** Sticky modules lock after 16px offset. Hero background shifts 8deg rotation on mouse move with 12px translation depth.

## Accessibility & Internationalisation
- Minimum colour contrast ratio of 4.5:1 for text, 3:1 for graphical objects.
- Focus outlines use `2px` solid `#38BDF8` with `4px` offset to avoid clipping shadows.
- All interactive elements require `44px` touch targets at SM and below, `40px` at MD+.
- Language toggle in footer supports English, Spanish, and French; copy length adjustments validated for 30% expansion.

## Implementation Guidelines
- **Design Tokens:** Centralised in `Css.md` & `Scss.md` with CSS custom properties and SCSS maps for themes.
- **Component Library:** Documented in `component_types.md`, `component_functions.md`, `buttons.md`, `Forms.md`, and `Cards.md` with variations, states, and iconography.
- **Asset Delivery:** Refer to `Assets.md` and `images_and_vectors.md` for naming conventions, compression pipelines, and repository sources.
- **Logic Alignment:** Navigation flows, state transitions, and dashboard routing codified in `Logic_Flow_update.md` and `Logic_Flow_map.md` to guarantee design-to-dev parity.

## QA & Rollout Checklist
1. Verify each page uses the correct breakpoint rules and spacing tokens.
2. Run contrast tests for primary and secondary surfaces using Stark/Figma plugin and automated Lighthouse audits.
3. Validate microcopy per `text.md.md` and `Home page text.md` for tone and localisation readiness.
4. Confirm components render with design system assets using Storybook visual regression suite.
5. Capture baseline screenshots at 1280px, 1024px, and 768px for regression archives stored under `/update_docs/1.00/ui-ux_updates/screenshots/v1.00/`.

## Dependencies & Next Steps
- Collaboration with backend for analytics endpoints (dashboard KPIs, community stats) as outlined in `Function Design.md`.
- Update data mocks per `Dummy_Data_Requirements.md` for design QA.
- Align provider and user apps using `provider_app_wireframe_changes.md` and `user_app_wireframe_changes.md` to maintain cross-platform parity.
- Schedule design system handoff workshop prior to sprint 3 to review tokens, components, and responsive behaviours with engineering.
