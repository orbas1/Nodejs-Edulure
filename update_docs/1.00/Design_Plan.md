# Version 1.00 Design Plan

## Experience Vision
1. **Unified Multi-Channel Identity:** Ensure responsive web, Flutter learner, and provider apps are visually and behaviourally consistent by sharing tokens, layout primitives, and interaction states.
2. **Themeable Foundations with Emo/Seasonal Packs:** Deliver a token architecture that can swap between core, emo, and seasonal palettes without breaking contrast ratios or layout integrity.
3. **Task-Centred Journeys:** Collapse navigation depth, surface contextually relevant actions, and maintain visible progress on critical flows (onboarding, commerce, learning, community management).
4. **Accessibility, Compliance & Security by Design:** Embed WCAG 2.2 AA standards, localisation/RTL readiness, and security messaging into every component specification.
5. **Data-Informed & Modular:** Instrument templates with analytics IDs, ensure components can be rearranged for new landing pages, and keep assets governed for marketing and compliance.

## Design Pillars & Detailed Interventions
### 1. Theming & Token Architecture
- Consolidate colours, typography, spacing, shadows, and motion tokens using `Colours.md`, `Screen_update_Screen_colours.md`, `Fonts.md`, and `Scss.md`.
- Define emo/seasonal theme overlays with guardrails for partial deployments (homepage hero takeovers, community microsites) referencing `pages.md` and `component_types.md`.
- Produce JSON/CSS/Flutter token exports and author migration notes for engineering, including validation scripts and regression reports.

### 2. Navigation & Layout System
- Align menu structures across user roles using `Menus.md`, `Organisation_and_positions.md`, and `Dashboard Organisation.md`.
- Create breadcrumb, quick-action, and stepper patterns to support deep flows informed by `Logic_Flow_map.md`, `Screens_Update_Logic_Flow.md`, and `Screens_Update_Logic_Flow_map.md`.
- Deliver responsive grid matrices and breakpoint behaviours from `Placement.md` and `Screen Size Changes.md`, covering desktop, tablet, phone, and large-format displays.

### 3. Homepage, Dashboard & Page Templates
- Assemble modular hero, progress, recommendation, and campaign blocks using `Home page components.md`, `Screens_Update.md`, and `Dashboard Designs.md`.
- Prepare persona-specific dashboards (learner, provider, admin) referencing `Dashboard Organisation.md`, `Settings Dashboard.md`, and `Profile Styling.md`.
- Add new page shells for explorer, communities, and monetisation scenarios using `Pages_list.md`, `Screens_list.md`, and `Organisation_and_positions.md`.
- Deliver tutor storefront and live classroom landing templates mapped to `website_drawings.md`, `menu_drawings.md`, and `dashboard_drawings.md`, including availability calendars, countdown tiles, roster drawers, and moderator toolbars for engineering handoff.
- Extend commerce funnels and finance dashboards using `web_application_logic_flow_changes.md`, `web_app_wireframe_changes.md`, `Design_Task_Plan_Upgrade/Web_Application_Design_Update/Web Application Design Update.md`, and `Design_Task_Plan_Upgrade/Application_Design_Update_Plan/Application Design Update.md`, covering payment method selection, coupon validation, tax summaries, receipt emails, refunds, and payout reconciliation states.

### 4. Component Library & Interaction Specs
- Refresh cards, forms, modals, drawers, widgets, and buttons per `Cards.md`, `Forms.md`, `component_functions.md`, `Screens__Update_widget_types.md`, and `Screen_buttons.md`.
- Document state diagrams (idle, hover, focused, disabled, offline, rights-restricted) with analytics instrumentation guided by `Screens_Updates_widget_functions.md` and `component_functions.md`.
- Rewrite microcopy and localisation placeholders using `Screen_text.md`, `Dummy_Data_Requirements.md`, and `text.md.md`.
- Extend interaction specs for tutor availability pills, booking conflict resolutions, live classroom countdowns, chat escalations, and Agora join/recording prompts referencing `web_application_logic_flow_changes.md`, `App_screens_drawings.md`, and `Admin_panel_drawings.md`.
- Document payment forms, coupon chips, finance alerts, and ledger tables with idle/loading/error/success states referencing `web_application_styling_changes.md`, `user_application_styling_changes.md`, `provider_application_styling_changes.md`, and `component_functions.md`, ensuring parity across learner/provider/support consoles.

### 5. Imagery, Motion & Asset Governance
- Set imagery ratios, safe areas, animation tiers, and reduced-motion treatments referencing `images_and_vectors.md`, `Screens_update_images_and _vectors.md`, and `Logic_Flow_update.md`.
- Publish asset intake workflows and seasonal asset manifest requirements using `Assets.md`, `Home page images.md`, and `Resources.md`.
- Partner with marketing to version emo/festive asset packs while preserving legal metadata and CDN policies.

### 6. Profile, Settings & Compliance Surfaces
- Redesign profile and verification experiences via `Profile Look.md`, `Profile Styling.md`, and `Organisation_and_positions.md`.
- Restructure settings dashboards, privacy notifications, and consent flows referencing `Settings Dashboard.md`, `Settings Screen.md`, `Settings.md`, and `Function Design.md`.
- Align verification prompts, lockout states, and security education with backend enforcement referencing `Screen_text.md`, `Dummy_Data_Requirements.md`, and `provider_application_logic_flow_changes.md`.
- Add inline security messaging and audit surfaces with guidance from `provider_application_logic_flow_changes.md` and `web_application_logic_flow_changes.md`.
- Design antivirus/quarantine alerts, review queues, and admin escalation paths for content uploads referencing `web_app_wireframe_changes.md`, `dashboard_drawings.md`, and `App_screens_drawings.md`, ensuring learners, instructors, and operators see consistent outcomes.
- Layer tutor onboarding, compliance readiness, payout verification, recording consent, and seat limit governance prompts into provider/admin consoles referencing `provider_app_wireframe_changes.md`, `Admin_panel_drawings.md`, and `dashboard_drawings.md` so live learning operations meet policy requirements.
- Add finance reconciliation, refund approval, and coupon governance flows into admin/provider consoles referencing `provider_application_logic_flow_changes.md`, `Design_Task_Plan_Upgrade/Web_Application_Design_Update/Function Design.md`, and `web_application_logic_flow_changes.md`, ensuring support teams can act on the new `/api/payments` endpoints with clear audit traces.
- Introduce session/device management states (active session list, revoke-all confirmation, logout banners) referencing `Settings Dashboard.md`, `Settings.md`, `Screen_text.md`, `menu_drawings.md`, and `dashboard_drawings.md` so design mirrors new governance tooling.
- Layer retention/audit disclosures into admin dashboards referencing `dashboard_drawings.md`, `menu_drawings.md`, and `Screen_text.md` so operators understand automation outcomes, cron schedule status, and recovery options tied to backend hygiene policies.

## Deliverables & Outputs
- **Design System Tokens:** JSON/CSS/Flutter exports, documentation, and regression testing scripts.
- **Template & Component Specs:** Annotated Figma frames, redlines, interaction diagrams, and state tables for all priority experiences.
- **Logic Flow Narratives:** Journey maps, service blueprints, and scenario walkthroughs aligned with `Logic_Flow_map.md` artefacts.
- **Accessibility & Compliance Packet:** WCAG audit results, localisation scripts, security overlays, and compliance checklists.
- **Engineering Handoff Toolkit:** Asset manifests, motion references, analytics tag map, and implementation QA checklist.
- **Telemetry Overlay Specs:** Map Prometheus metrics, trace IDs, and client analytics events to design dashboards so product teams can correlate UI state with backend observability data.

## Governance & Collaboration
- **Design Steering:** Bi-weekly review with design leads, product, and engineering to approve token or layout adjustments.
- **Change Control:** All deltas logged in `Design_Change_log.md` and linked to Jira design tickets.
- **Cross-Discipline Sync:** Weekly design-engineering syncs to align implementation priorities and unblock dependencies.
- **Security Alignment:** Included backend security rotations (JWT/key lifecycle) as a standing agenda item so design copy and user education remain accurate.
- **Toolchain Governance:** Workspace-wide Node/npm enforcement is now mirrored in design tooling handoffs, ensuring Storybook exports, token pipelines, and asset generation run on the same runtime versions validated by engineering.
- **QA Readiness:** Dedicated design QA sprints with accessibility, localisation, and compliance sign-off before engineering lock.

## Risk Management
| Risk | Impact | Mitigation |
| --- | --- | --- |
| Emo/seasonal themes reduce contrast or break layouts | Accessibility regressions and inconsistent branding | Automated contrast diffing, partial theme staging, and fallback tokens validated against `Screen_update_Screen_colours.md`. |
| Navigation refactor confuses existing users | Increased support volume, churn | Progressive rollouts, in-product tours, and analytics-based monitoring of drop-off points. |
| Asset pipeline cannot sustain seasonal packs | Delayed campaign launches, stale imagery | Shared marketing backlog, predefined asset specs, and fortnightly check-ins referencing `Assets.md`. |
| Security/compliance copy lags behind flows | Launch blocker, regulatory risk | Weekly legal/security reviews, placeholder copy with redlines, Jira tracking for unresolved text. |
| Engineering bandwidth for motion/interaction specs | Delivery delays or inconsistent implementations | Prioritised motion tiers, code-ready examples, and phased rollout of advanced animations. |
