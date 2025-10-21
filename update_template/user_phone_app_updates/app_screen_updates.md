# Screen & UX Updates – Mobile v1.4.0

## Global
- Adopted refreshed 2025 brand palette and typography (Inter variable font) with accessible contrast for both light and dark themes.
- Implemented adaptive layout breakpoints ensuring tablets display dual-pane experiences for community and streak dashboards.
- Added contextual tooltips for new features with dismissible cards stored in local preferences.

## Home dashboard
- New **Streak Spotlight** component summarises daily goal status, weekly trend sparkline, and recovery suggestions with CTA to practice modules.
- Enhanced announcement carousel with server-driven content; supports deeplinks to campaigns and learning paths.

## Learning streak analytics screen
- Introduced stacked charts showing current streak, longest streak, and mastery segments; accessible summary text for screen readers.
- Added filter chips (7, 14, 30 days) with server pagination and offline fallback cache.
- Implemented share sheet button generating templated message and deep link to encourage accountability partners.

## Instructor tools
- Instructor roster now enforces RBAC—only verified instructors view roster tab; others see educational upsell card.
- Added bulk message composer with template previews and send-later scheduling.
- Inline analytics for attendance and learner feedback aggregated per cohort.

## Community feed
- Presence indicators upgraded to show active instructors; long-press reveals moderation shortcuts for authorised roles.
- Comment composer supports draft persistence and offline queueing; users alerted when moderation hold is active.

## Profile & settings
- Introduced `Privacy & Security` section highlighting telemetry opt-out, MFA status, and login device history.
- Added download management UI displaying storage usage, expiration timers, and ability to purge cached lessons.
- Updated notification preferences with quiet hours slider and push category toggles (streaks, community, announcements).

## Accessibility
- Dynamic type tested up to 200%; responsive line heights ensure readability.
- VoiceOver/TalkBack hints reviewed for new components; complex charts include descriptive summaries via `Semantics` widgets.
- Colourblind-safe palette verified using Deuteranopia and Protanopia simulators.
