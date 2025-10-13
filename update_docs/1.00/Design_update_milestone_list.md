# Version 1.00 Design Update Milestones

## Milestone 1 – Token & Theme System Finalisation (Target: Week 2, Status: 70% complete)
- **Objectives:** Finalise cross-platform colour, typography, spacing, and motion tokens; document emo/seasonal overlays and partial page theme logic.
- **Entry Criteria:** Brand steering approval, accessibility baseline, and engineering agreement on token ingestion format.
- **Exit Criteria:** Token exports (CSS/JSON/Flutter) published, automated contrast checks executed, seasonal asset guardrails signed off, documentation refreshed in `Design_Plan.md`.
- **Dependencies:** Access to design libraries, colour/typography artefacts (`Colours.md`, `Fonts.md`), QA automation scripts.
- **Responsible Roles:** Principal Product Designer, Design Systems Engineer.

## Milestone 2 – Navigation & Layout Blueprint (Target: Week 4, Status: 45% complete)
- **Objectives:** Approve role-based navigation schema, IA labels, and responsive layout matrices across home, dashboard, and settings templates.
- **Entry Criteria:** Milestone 1 complete, updated journey maps, analytics and research insights.
- **Exit Criteria:** Interaction specs for menus, breadcrumbs, quick actions, and steppers published; breakpoint matrix validated; logic flow diagrams updated.
- **Dependencies:** IA research, logic flow artefacts (`Logic_Flow_map.md`, `Screens_Update_Logic_Flow_map.md`).
- **Responsible Roles:** UX Architect, Frontend Lead, Flutter Lead.

## Milestone 3 – Template & Component Delivery (Target: Week 6, Status: 100% complete)
- **Objectives:** Produce annotated high-fidelity templates for home, dashboards, explorer, media viewers, profiles, and settings across web and Flutter.
- **Entry Criteria:** Milestones 1–2 delivered; component inventory baselined.
- **Exit Criteria:** Templates annotated with states and analytics IDs, asset manifests produced, copy decks approved, usability validation recorded. _Update:_ Live classroom lobbies, tutor storefronts, booking calendars, moderator consoles, checkout, coupon, refund, finance dashboards, and the refreshed community hub/resource library are now redlined with analytics IDs, motion notes, webhook fallbacks, membership guardrails, and SCA states referencing `dashboard_drawings.md`, `App_screens_drawings.md`, `website_drawings.md`, `menu_drawings.md`, and `web_application_logic_flow_changes.md`.
- **Latest Progress:** Community paywall dashboards, subscription plan cards, entitlement badges, affiliate payout flows, engagement leaderboards/streak/event reminder overlays, the end-to-end messaging suite (community chat docks, DM inbox/thread compositions, moderation trays, unread/presence states), the new follower/following management trays with recommendation carousels, and the explorer discovery stack (mixed-entity grids, facet drawers, topojson-driven map markers, saved search modals, promoted ads rail, zero-result education, ingestion telemetry consoles) now mirror backend APIs with interaction specs referencing `menu_drawings.md`, `dashboard_drawings.md`, `App_screens_drawings.md`, `website_drawings.md`, `Admin_panel_drawings.md`, and `Design_Task_Plan_Upgrade/Web_Application_Design_Update/Web Application Design Update.md`.
- **Latest Progress Update:** Ads compliance dashboards now surface spend alerts, auto-pause toasts, review queues, and insight drill-down charts aligned with `dashboard_drawings.md`, `website_drawings.md`, `Admin_panel_drawings.md`, and `App_screens_drawings.md`, while the explorer intelligence dashboard frames (SCR-11) deliver KPI tiles, range toggles, refresh cues, forecast panels, query spotlights, and alert treatments referencing `Dashboard Designs.md`, `Screen_update_Screen_colours.md`, `dashboard_drawings.md`, and `menus.md` so the `/analytics` implementation lands with production-ready guidance. Learner profile overview modules (hero metrics, verification badges, insight tiles, programme shelves, quick action ribbons, timeline events) now include responsiveness, analytics IDs, cache-refresh cues, and localisation copy mapped to `Profile Look.md`, `Profile Styling.md`, `dashboard_drawings.md`, `App_screens_drawings.md`, and `Admin_panel_drawings.md`, matching the new React implementation.
- **Dependencies:** Token library, imagery guidance (`images_and_vectors.md`), microcopy drafts (`Screen_text.md`).
- **Responsible Roles:** Product Designers, Content Strategist, QA Design Lead.

## Milestone 4 – Engineering Handoff & QA (Target: Week 8, Status: 45% complete)
- **Objectives:** Package design specifications, motion references, analytics matrices, and QA scripts; oversee accessibility, localisation, and compliance verification.
- **Entry Criteria:** Milestone 3 assets complete; engineering squads aligned on development sprints.
- **Exit Criteria:** Handoff checklist signed, accessibility/localisation scripts executed, design QA sign-off recorded, open issues logged in `Design_Change_log.md`.
- **Notes:** JWT key rotation hardening reviewed with engineering; no component updates required but documentation cross-check added to QA checklist. Workspace runtime enforcement was reviewed to guarantee Storybook exports run on the approved Node/npm versions before handoff. Verification and lockout copy now mirrors backend enforcement ahead of handoff.
  - Prometheus/trace telemetry overlays signed off with engineering to feed design QA dashboards and align runtime observability with component health reviews.
  - Session/device management overlays for the settings dashboard (active devices list, revoke-all confirmation, logout copy) reviewed with engineering using `Settings Dashboard.md`, `Settings.md`, `menu_drawings.md`, and `Screen_text.md` to match the new backend session tooling.
  - Retention audit banners and administrator prompts defined for policy compliance consoles so data hygiene automation has corresponding UI guidance; references captured in `dashboard_drawings.md` and `menu_drawings.md`.
  - Scheduler health indicators (next run, paused/backoff badges, dry-run toggles) mapped for the compliance console using `dashboard_drawings.md` and `App_screens_drawings.md` so operators have parity with the new backend job behaviour.
  - Antivirus alerts, quarantine review queues, and storage governance dashboards annotated for admin consoles with localisation and escalation guidance referencing `dashboard_drawings.md`, `App_screens_drawings.md`, and `web_app_wireframe_changes.md`.
  - Live classroom QA packs now include join token smoke tests, moderation handoff checklists, recording consent receipts, chat escalation flows, DM retention/export scripts, and presence refresh drills referencing `Admin_panel_drawings.md`, `menu_drawings.md`, and `App_screens_drawings.md`.
  - Checkout, refund, coupon, finance dashboards, and messaging consoles now include PCI copy reviews, webhook failure contingencies, payout readiness handoffs, support escalation scripts, chat moderation runbooks, and DM safety audits referencing `web_application_logic_flow_changes.md`, `Design_Task_Plan_Upgrade/Web_Application_Design_Update/Function Design.md`, `Application_Design_Update_Plan/Application Design Update.md`, `dashboard_drawings.md`, and `Admin_panel_drawings.md`.
- **Dependencies:** Engineering schedules, QA tooling, localisation resources, compliance checklists.
- **Responsible Roles:** Design Producer, Engineering Managers, Accessibility Specialist.

### Design Milestone Addendum
| Design Milestone | Target Week | Current Status | Key Deliverables |
| --- | --- | --- | --- |
| Token & Theme System Finalisation | Week 2 | 70% complete | Cross-platform token exports, emo/seasonal theme guardrails, automated contrast reports. |
| Navigation & Layout Blueprint | Week 4 | 45% complete | Role-based IA schema, breakpoint matrices, breadcrumb/stepper interaction specs. |
| Template & Component Delivery | Week 6 | 100% complete | Annotated templates for home/dashboards/explorer/messaging/ads compliance/profile overview, asset manifests, copy decks. |
| Engineering Handoff & QA | Week 8 | 45% complete | Handoff kits, accessibility/localisation scripts, messaging QA packs, design QA sign-offs. |
