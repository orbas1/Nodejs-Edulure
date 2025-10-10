# Version 1.50 Design Change Log

## Overview
Version 1.50 introduces a comprehensive refresh across the learner and provider experiences. Updates focus on aligning the mobile-first application shell with the web application experience, harmonising the component library, and embedding the new feature workstreams (asset pipelines, Communities 2.0, social graph, and explorer search). The log below summarises the notable deltas captured during the latest design review cycles.

## Application Experience (Flutter Shell)
| Area | Change Summary | Rationale | Upstream Reference |
| --- | --- | --- | --- |
| Navigation Shell | Consolidated primary navigation into a five-tab bottom bar with contextual overflow menus; added quick actions drawer for uploads, community posts, and explorer filters. | Reduce taps-to-task and keep critical provider and learner workflows within two interactions. | `Design_Task_Plan_Upgrade/Application_Design_Update_Plan/Screens_Update.md` |
| Home Surfaces | Rebuilt learner home with continue-learning carousel, community spotlight, and explorer recommendations; provider home now surfaces asset conversion status and affiliate insights. | Drive engagement with new R2-enabled media and Communities 2.0 incentives while giving providers operational transparency. | `Screens_Update_Plan.md`, `Screens_list.md` |
| Media Viewers | Unified ebook and deck viewers with persistent playback controls, offline indicators, and annotation entry points. | Support Cloudflare R2 delivery and consistent interaction expectations across asset types. | `Screens_update_images_and_vectors.md`, `Screens_Update_Logic_Flow.md` |
| Content Library | Designed instructor dashboard cards, offline download drawers, and analytics callouts to align with the new R2 pipeline. | Give instructors immediate insight into conversion status, DRM limits, and engagement signals. | `Screens_Update.md`, `Screens_update_images_and_vectors.md` |
| Community Hub | Introduced hero banner, tier ladder, event calendar, and chat dock with moderation drawer accessible from FAB. | Prepare for gamified Communities 2.0 rollout and ensure moderation tooling is discoverable. | `Screens_Updates_widget_functions.md`, `Screens_Update_Logic_Flow_map.md` |
| Profile System | Componentised headers, stats cards, affiliate widgets, and achievements carousels with conditional layouts for learners vs. instructors. | Enable modular reuse and parity across platforms with shared tokens. | `Organisation_and_positions.md`, `Screens__Update_widget_types.md` |
| Settings & Notifications | Added granular notification toggles, monetisation options, and privacy controls with inline previews and audit history links. | Provide compliance support for follow graph, affiliate payouts, and moderation policies. | `Settings.md`, `Settings Screen.md` |

### Mobile Design Considerations
- 12-column responsive grid reflowing to 4 columns on small screens ensures parity with the web design system.
- Accessibility toggles (contrast, dyslexia-friendly fonts, reduced motion) surfaced in the quick settings drawer per `Screen_text.md` guidance.
- Skeleton loaders and toast alerts introduced to communicate media conversion progress and offline sync state.
- Offline download drawers and DRM limit banners aligned to the new content workflows, ensuring parity between Flutter and React implementations.

## Web Application Experience
| Area | Change Summary | Rationale | Upstream Reference |
| --- | --- | --- | --- |
| Global Navigation | Updated top navigation with explorer-first search entry, workspace switcher, and notification hub linked to Communities 2.0. | Keep discovery and community updates within reach for learners and providers. | `Organisation_and_positions.md`, `Menus.md.md` |
| Homepage | Hero redesign with thematic imagery, continue-learning carousel, and curated community tiles. | Highlight R2-powered content and community engagement opportunities. | `Home page images.md`, `Home Page Organisations.md` |
| Explorer | Faceted filters, inline CTAs, saved search chips, and empty-state guidance added to the results grid. | Support Meilisearch integration and reduce bounce rate for zero-result scenarios. | `Logic_Flow_update.md`, `component_functions.md` |
| Community Hub | Modular layout with announcement rail, event calendar, affiliate marketplace, and moderation drawer anchored on the right column. | Enable Communities 2.0 monetisation flows and reinforce governance responsibilities. | `Dashboard Organisation.md`, `Placement.md` |
| Content Library | Built responsive asset tables, analytics sidebars, and embedded viewer overlays supporting DRM messaging. | Mirror instructor workflows from mobile/web while surfacing telemetry for decision making. | `Screens_Update.md`, `component_functions.md` |
| Profile Pages | Shared component library for profile headers, achievements, affiliate stats, and media showcases with dark-mode parity. | Ensure consistent storytelling across learner and provider personas and prepare mobile parity. | `Profile Styling.md`, `Profile Look.md` |
| Settings | Restructured settings with tabs for notifications, privacy, monetisation, accessibility, and audit logs featuring inline education. | Improve discoverability of compliance features and reduce support burden. | `Settings.md`, `Settings Dashboard.md` |

### Web Design Considerations
- Dark-mode-first palette validated across tokens in `colours.md` and `Scss.md` with contrast ratios recorded for WCAG 2.1 AA.
- Responsive breakpoints aligned with tablet/desktop states; cards and hero components recalibrated for 1440px wide viewports.
- Component library connected to analytics IDs to support telemetry instrumentation referenced in `Dummy_Data_Requirements.md`.

## Cross-Platform Decisions
- **Design Tokens:** Typography, spacing, colour, and elevation tokens unified across Figma libraries for handoff to React and Flutter teams.
- **Microcopy:** Shared content style guide drafted with Content & Community team to keep notifications, moderation prompts, and monetisation copy consistent.
- **Design QA:** Introduced checklist covering motion, error states, offline fallbacks, and localisation readiness before handoff to engineering squads.
- **Security States:** Documented hardened auth flows (rate-limit warnings, CORS failures, password strength feedback) with copy and component tokens to align with the new backend security baseline.

## Outstanding Follow-Ups
1. Validate whether ebook watermark previews require separate mobile-safe flows or can leverage the shared viewer assets.
2. Confirm policy copy for affiliate withdrawals and moderation escalations before finalising settings strings.
3. Align with DevOps on progressive enhancement strategies for real-time community leaderboards to prevent layout shifts during hydration.
4. Schedule visual regression baselines for the redesigned component library to protect token changes during implementation.
