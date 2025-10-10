# Screens Update — Overview & Rationale

## Summary
Version 1.00 introduces a cohesive, modular screen system for both learner and provider mobile apps. Each primary flow now has:
- Clear hierarchy with prominent "next best action" modules.
- Dedicated support for offline usage, accessibility toggles, and analytics insights.
- Harmonised component usage so engineering can share code between platforms.

## Key Improvements by Flow
- **Onboarding:** Streamlined 3-panel carousel emphasising value proposition, followed by progressive profile setup. Includes optional video background (muted) with fallback illustration.
- **Home Dashboards:** Rebuilt into sections (Hero, Focus Tiles, Recommendations, Community Snapshot) with sticky streak banner. Provider dashboard adds timeline and compliance widgets.
- **Learning Path:** Course detail and lesson player share universal top bar, progress header, and action tray. Quizzes adopt card-based question layout with inline validation.
- **Community:** Feed reorganised with pinned posts, filters, and accessible composer. Thread view uses nested replies with indentation and subtle connectors.
- **Library & Downloads:** Introduced offline manager with storage meter, conflict resolution modals, and multi-select for deletion.
- **Settings & Profile:** Collapsible sections, clear destructive zones, and quick access to support resources.

## Screen Interaction Principles
- Preserve scroll context when returning from detail screens using shared element transitions.
- Use motion to communicate hierarchy (hero collapse, cards fading in sequentially 40 ms apart).
- Provide gesture support: pull-to-refresh on feed, swipe on notifications, long-press for context menus.

## Accessibility Enhancements
- Focus order mapped for every screen with testing on TalkBack and VoiceOver.
- Dynamic type handling ensures layout reflows gracefully; cards stack vertically once font scaling exceeds 150%.
- Colour contrast verified with automated tooling; high-contrast theme available.

## Offline & Error Handling
- Offline banner appears at top with actions to retry or manage downloads.
- Error states provide actionable copy and "Contact support" link.
- Data fetch skeletons mimic final layout to reduce shift.

## Next Steps
- Validate prototypes with 8 learners and 5 providers; capture metrics on comprehension and task completion.
- Update `Screens_Update_Logic_Flow.md` with any findings.
- Prepare engineering handoff with Zeplin frames and JSON data contracts.
