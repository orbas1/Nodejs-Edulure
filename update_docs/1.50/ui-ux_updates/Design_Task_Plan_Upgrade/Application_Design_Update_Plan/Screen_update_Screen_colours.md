# Screen Colour Updates

## Dashboard & Home
- Adopt unified gradient background (`#0B1120 → #1E293B`) with subtle animated aurora for hero metrics, limited to 10% opacity to avoid distraction.
- Light surfaces (`#F8FAFC`) for card content ensure readability; maintain 12% opacity overlays for hover and pressed states.
- Introduce depth layering by applying shadow tokens: `shadow/lg` for hero metrics, `shadow/md` for cards, `shadow/sm` for chips.

## Media Viewer
- Dark mode-first viewer with `#020617` background and `#CBD5F5` progress bars; fallback to light mode with `#F8FAFC` background.
- Highlight annotation tools using `info/500` and comment markers with `secondary/500`.
- Provide comfort tint for night mode, allowing users to shift to warmer palette to reduce eye strain.

## Community & Chat
- Channel headers use accent gradients derived from community colour token; ensure contrast with text by dynamically adjusting luminance.
- Message bubbles follow `neutral/900` for sent and `neutral/100` for received with 80% opacity backgrounds.
- Reaction chips adopt semantic colours with 60% opacity backgrounds to differentiate tone without overwhelming interface.

## Alerts & Notifications
- Success toasts: `#22C55E` background, `#052E16` text.
- Warning banners: `#F59E0B` background with dark text `#713F12`, include icon outlines for quick scanning.
- Critical alerts: `#B91C1C` gradient overlay and `#FEE2E2` text container for readability.

## Accessibility Compliance
- All interactive surfaces pass WCAG 2.2 AA contrast; audit with automated tooling before final handoff.
- Provide high-contrast theme variant toggled from accessibility settings, adjusting backgrounds to `#0B1120` and text to `#FFFFFF`.
