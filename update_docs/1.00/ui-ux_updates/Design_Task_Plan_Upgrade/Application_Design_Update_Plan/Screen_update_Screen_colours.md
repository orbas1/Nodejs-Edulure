# Screen Colour Updates

## Dashboard & Home
- Adopt unified gradient background (`#0B1120 → #1E293B`) with subtle animated aurora for hero metrics, limited to 10% opacity to avoid distraction.
- Light surfaces (`#F8FAFC`) for card content ensure readability; maintain 12% opacity overlays for hover and pressed states.
- Introduce depth layering by applying shadow tokens: `shadow/lg` for hero metrics, `shadow/md` for cards, `shadow/sm` for chips.
- Hero KPI cards (W-ANA-001) use semantic fills: success `#15803D`, warning `#B45309`, error `#B91C1C`; delta arrows adopt complementary tint at 80% opacity.
- Quick action pills (W-ACT-010) follow gradient `primary/500 → accent/500` with pressed overlay `primary/700` at 16% opacity.

## Media Viewer
- Dark mode-first viewer with `#020617` background and `#CBD5F5` progress bars; fallback to light mode with `#F8FAFC` background.
- Highlight annotation tools using `info/500` and comment markers with `secondary/500`.
- Provide comfort tint for night mode, allowing users to shift to warmer palette to reduce eye strain.
- Annotation rail icons toggle between default `#E2E8F0` and active `#38BDF8` with glow ring; disabled state dims to 40% opacity.
- Discussion drawer (W-SOC-032) header uses `neutral/900` with accent underline `accent/400`; message bubbles respect light/dark tokens `chat/sent` and `chat/received`.

## Community & Chat
- Channel headers use accent gradients derived from community colour token; ensure contrast with text by dynamically adjusting luminance.
- Message bubbles follow `neutral/900` for sent and `neutral/100` for received with 80% opacity backgrounds.
- Reaction chips adopt semantic colours with 60% opacity backgrounds to differentiate tone without overwhelming interface.
- Moderator badges use `#F97316` background with white text and 12px corner radius to contrast against message bubbles.
- Event strip cards (W-SOC-031) highlight countdown badge using `#0EA5E9`; RSVP button states: default `primary/500`, pressed `primary/600`, disabled `neutral/400`.

## Alerts & Notifications
- Success toasts: `#22C55E` background, `#052E16` text.
- Warning banners: `#F59E0B` background with dark text `#713F12`, include icon outlines for quick scanning.
- Critical alerts: `#B91C1C` gradient overlay and `#FEE2E2` text container for readability.
- Notification digest (W-ACT-011 variant) uses `neutral/900` with translucent `#1E293B` overlays in dark mode; ensure focus ring `info/400`.

## Accessibility Compliance
- All interactive surfaces pass WCAG 2.2 AA contrast; audit with automated tooling before final handoff.
- Provide high-contrast theme variant toggled from accessibility settings, adjusting backgrounds to `#0B1120` and text to `#FFFFFF`.
- Supply token overrides for high-contrast mode: hero cards `#111827` background, text `#F9FAFB`, link `#38BDF8`.
- Ensure focus indicators maintain 3:1 contrast against surrounding surfaces (e.g., focus ring `#FACC15` over dark backgrounds).
