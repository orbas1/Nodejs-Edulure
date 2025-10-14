# Version 1.50 – Design Update Milestone Plan

All design milestones start at **0%** completion and must produce artefacts referenced in `Design_Plan.md` and `Design_Change_log.md` before moving to the next gate.

## Milestone D1 – Foundation Token Consolidation (Week 1, 0%)
- **Goal:** Finalise cross-platform design tokens (typography, color, spacing, elevation, iconography) and accessibility guardrails to establish a single source of truth for the learner, provider, and web experiences.【F:update_docs/1.50/Design_Plan.md†L19-L37】
- **Exit Criteria:**
  - Token JSON exports approved by design systems and engineering leads.
  - High-contrast variants and dual-mode palettes (dark/light, emo campaign overlays) documented with implementation notes.【F:update_docs/1.50/Design_Plan.md†L39-L47】
  - Accessibility checklist for foundational components signed off by accessibility guild.【F:update_docs/1.50/Design_Plan.md†L65-L74】

## Milestone D2 – Mobile Experience Architecture (Weeks 1–3, 0%)
- **Goal:** Produce annotated wireframes, logic flows, and content specifications for learner and provider applications, ensuring parity across portrait, landscape, and tablet layouts.【F:update_docs/1.50/Design_Plan.md†L49-L76】
- **Exit Criteria:**
  - Wireframes and flow diagrams covering onboarding, lesson consumption, assignments, messaging, scheduling, and analytics completed with stakeholder sign-off.【F:update_docs/1.50/Design_Plan.md†L55-L67】
  - Navigation partials (bottom tabs, drawers, overlays) approved for reuse and theme toggling.【F:update_docs/1.50/Design_Plan.md†L53-L62】
  - Content hierarchy, CTA labelling, and dynamic type scenarios reviewed with product and localisation teams.【F:update_docs/1.50/Design_Plan.md†L67-L74】
  - Provider RBAC overlays and incident escalation prompts documented alongside learner flows, ensuring parity wireframes for locked states and guardrail messaging.【F:update_docs/1.50/provider_phone_app_updates/rbac_contracts.md†L1-L51】【F:Edulure-Flutter/lib/provider/runtime/provider_capability_bridge.dart†L1-L182】

## Milestone D3 – Web Experience & Navigation Overhaul (Weeks 2–4, 0%)
- **Goal:** Redesign marketing pages and authenticated dashboards with modular partials, command palette navigation, and Storybook-ready component specifications.【F:update_docs/1.50/Design_Plan.md†L78-L117】
- **Exit Criteria:**
  - Responsive mockups for marketing funnels (home, catalog, cohort, pricing, resources) at 1280–768 breakpoints approved.【F:update_docs/1.50/Design_Plan.md†L82-L94】
  - Dashboard templates (overview, cohort management, analytics, resources, settings) annotated for command palette, breadcrumbs, and contextual sidebars.【F:update_docs/1.50/Design_Plan.md†L95-L105】
  - Component spec dossiers (cards, tables, charts, forms, modals) and interaction prototypes published to Storybook backlog.【F:update_docs/1.50/Design_Plan.md†L99-L105】
  - Operator dashboard mockups reference live service readiness telemetry delivered by the backend squad to ensure health banners and incident shortcuts reflect real-time status; both web and Flutter shells now consume the manifest feed to visualise outages consistently.【F:frontend-reactjs/src/components/status/ServiceHealthBanner.jsx†L1-L96】【F:Edulure-Flutter/lib/widgets/capability_status_banner.dart†L1-L218】

## Milestone D4 – Asset, Copy, and Compliance Delivery (Weeks 3–5, 0%)
- **Goal:** Finalise copy decks, imagery requirements, dummy data, and accessibility testing protocols to enable engineering readiness and performance governance.【F:update_docs/1.50/Design_Plan.md†L107-L126】
- **Exit Criteria:**
  - Marketing and dashboard copy decks approved with localisation mapping and support scripts.【F:update_docs/1.50/Design_Plan.md†L107-L114】
  - Asset manifests (illustrations, vectors, icons, dummy data sets) optimised for performance budgets and themed variations.【F:update_docs/1.50/Design_Plan.md†L45-L47】【F:update_docs/1.50/Design_Plan.md†L115-L123】
  - Accessibility test scripts covering keyboard navigation, screen readers, focus management, and contrast toggles baselined.【F:update_docs/1.50/Design_Plan.md†L71-L74】【F:update_docs/1.50/Design_Plan.md†L115-L123】
  - Compliance dashboard wireframes integrate audit, consent, and incident ledgers with encryption indicators, SLA countdown timers, and escalation ownership cues sourced from the new backend tables.【F:backend-nodejs/migrations/20250204100000_compliance_audit_consent_incidents.js†L1-L180】

## Milestone D5 – Handoff & Measurement Enablement (Weeks 4–6, 0%)
- **Goal:** Package artefacts for development and QA, conduct walkthroughs, and establish post-launch measurement dashboards and feedback loops.【F:update_docs/1.50/Design_Plan.md†L128-L153】
- **Exit Criteria:**
  - Zeplin/Storybook exports, QA scripts, and measurement guides distributed to engineering, QA, and product leads.【F:update_docs/1.50/Design_Plan.md†L128-L136】
  - Cross-platform walkthrough sessions held covering theming toggles, partial injection logic, and security considerations for new pages.【F:update_docs/1.50/Design_Plan.md†L134-L138】
  - Analytics dashboards and qualitative feedback cadences defined for post-launch monitoring, with backlog grooming workflow documented.【F:update_docs/1.50/Design_Plan.md†L140-L153】
