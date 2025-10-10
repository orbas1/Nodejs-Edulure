# Version 1.50 UI/UX Design Change Log

| Area | Change Summary | Rationale | Impacted Platforms |
| --- | --- | --- | --- |
| Provider Experience | Reframed dashboard into modular analytics widgets, streamlined course asset upload with R2-driven media staging, and embedded community + affiliate controls alongside explorer shortcuts. | Align provider workflows with new asset pipeline, Communities 2.0 tooling, and follow graph insights while minimising context switching. | Web, Provider Mobile, Admin Console |
| Learner Experience | Rebuilt home feed combining courses, communities, explorer recommendations, and PowerPoint/Ebook resumptions with adaptive theming and accessibility toggles. | Deliver unified learning journey and highlight new rich media with personalisation hooks. | Web, Learner Mobile |
| Communities 2.0 | Introduced hub layout featuring hero, announcement rail, tier ladders, event calendar, and chat docks; added moderation drawer and affiliate marketplace. | Support monetisation, role-based governance, and social incentives referenced in the feature brief. | Web, Mobile |
| Explorer & Search | Updated navigation shell, global search entry, entity tabs, faceted filters, card-based results with inline CTAs, and empty-state education. | Surface Meilisearch-driven discovery and encourage follow/enrol actions from anywhere. | Web, Mobile |
| Profile System | Componentised profile surfaces (headers, stats, carousels, affiliate widgets) with data-driven conditional layouts for students vs. instructors. | Ensure parity across platforms and prepare shared design tokens for mobile kits. | Web, Mobile |
| Settings & Notifications | Added granular notification, privacy, and monetisation settings with preview snippets and audit log access. | Provide transparency for new follow/affiliate systems and regulatory readiness. | Web, Mobile |

## Interaction Principles
- **Modular grids:** All surfaces use a 12-column responsive grid with 16px gutters, scaling to 4-column compact mode on phone portrait.
- **Tokenised theming:** Typography, colour, and spacing tokens map to the shared design system introduced with the component-based profile redesign.
- **Task orchestration:** Screens prioritise top provider/student jobs (upload, publish, join, resume) with inline guidance, skeleton loaders, and offline states.
- **Accessibility:** High-contrast mode toggle, text scaling up to 200%, and focus-visible states ensured across clickable regions; key flows tested against WCAG 2.1 AA.
- **Telemetry-ready:** UI components expose analytics IDs for measuring engagement with explorer filters, community actions, and media playback controls.

## Outstanding Questions & Follow-Ups
1. Validate if ebook watermark previews require separate download screens on mobile or can reuse the shared asset viewer.
2. Confirm policy copy for affiliate withdrawals and moderation escalation to ensure consistent tone across settings panels.
3. Coordinate with DevOps on progressive enhancement for large community leaderboards to avoid layout shift during data hydration.
