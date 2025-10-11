# Screen Update Plan – Version 1.00

## Delivery Milestones
| Phase | Dates | Deliverables | Stakeholders |
| --- | --- | --- | --- |
| Discovery & Audit | Week 1 | Review existing wireframes, map gaps against SCR-00–SCR-12 inventory, confirm personas | Product, UX, Research |
| Low-Fidelity Alignment | Week 2 | Update wireframes in Figma (`Frame: Web v1.00 / Lo-Fi`) for all screens with revised IA | UX, Product |
| Visual Design | Weeks 3–4 | Apply tokenised styles, produce dark/light variants, export redlines | UX, Brand, Engineering |
| Interaction & Prototype | Week 5 | Build interactive prototype covering primary flows (home → onboarding → dashboard → course → lesson → community → settings) | UX, Engineering |
| Handoff & QA Prep | Week 6 | Annotated documentation (this folder), Storybook references, Zeplin export packs | UX, Engineering, QA |

## Activity Breakdown
1. **Grid & Template Finalisation** – Lock base templates for marketing, content, data-heavy, and form screens. Approvals required before component detailing.
2. **Component Slotting** – Map each widget (see `Screens__Update_widget_types.md`) to screen positions with column spans, heights, and responsive rules.
3. **Content & Copywriting** – Define hero copy, value propositions, empty state messaging, tooltips (see `Screen_text.md`). Work with marketing for tone validation.
4. **Asset Production** – Commission/prepare hero renders, iconography, and illustration packages listed in `Screens_update_images_and _vectors.md`.
5. **Interaction Definition** – Document hover, focus, pressed, loading, and error states. Record motion specs per screen in `Screens_Update_Logic_Flow.md`.
6. **Accessibility Review** – Run Stark and axe DevTools audits on prototypes; log adjustments in `design_change_log.md`.
7. **Engineering Sync** – Weekly playback to frontend and backend squads ensuring data contracts align with dummy data requirements.

## Tools & Resources
- **Design:** Figma (components in `Edulure DS / Web v1.00` library), FigJam for flow mapping.
- **Documentation:** Notion for tasks (synced with Jira), this repo for version-controlled specs.
- **Collaboration:** Loom walkthrough for each milestone, Slack #edulure-design for async feedback.

## Approval Gates
- Gate 1: Templates sign-off (end of Week 2).
- Gate 2: Visual design sign-off with accessibility check (end of Week 4).
- Gate 3: Prototype acceptance with instrumentation plan (end of Week 5).
- Gate 4: Engineering readiness review confirming tokens, assets, and dummy data (Week 6).

## Risk Mitigation
- Maintain change log per screen to avoid regressions.
- Use design tokens exclusively; avoid local overrides.
- Validate performance by limiting hero media to <350KB (compressed SVG) and lazy-loading charts.
- Provide fallback imagery for offline mode and placeholders for slow networks.
