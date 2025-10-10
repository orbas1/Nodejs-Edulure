# Colours — Mobile Application System Tokens

## Core Palette
| Token | Hex | WCAG Contrast on #FFFFFF | Primary Usage |
| --- | --- | --- | --- |
| `primary/50` | #E8F1FF | 3.5:1 (text over) | Background wash for hero modules, onboarding cards.
| `primary/500` | #2563EB | 8.1:1 | Primary buttons, interactive icons, progress header.
| `primary/600` | #1D4ED8 | 10.5:1 | Pressed state, focus outline overlay (20% alpha).
| `accent/500` | #22D3EE | 5.6:1 | Highlight pills, timeline markers, accessibility toggles.
| `accent/600` | #0EA5E9 | 7.9:1 | Active chips, slider fill for analytics filters.
| `secondary/500` | #7C3AED | 6.3:1 | Premium upsells, event countdowns, FAB gradient start.
| `secondary/600` | #6D28D9 | 8.9:1 | Secondary button pressed/focus state.
| `neutral/25` | #F9FBFF | — | Canvas background (light theme).
| `neutral/100` | #E2E8F0 | — | Dividers, disabled strokes.
| `neutral/400` | #94A3B8 | 5.9:1 | Secondary text, metadata labels.
| `neutral/800` | #1E293B | 11.9:1 | Primary body text in light mode.
| `neutral/900` | #0F172A | — | Navigation background, dark mode surfaces.
| `success/500` | #16A34A | 7.8:1 | Completion badges, positive toasts.
| `warning/500` | #F59E0B | 6.4:1 | Pending approvals, upcoming deadlines.
| `error/500` | #EF4444 | 7.1:1 | Critical alerts, destructive actions.
| `info/500` | #3B82F6 | 8.6:1 | Informational banners, tooltip highlights.

## Gradients & Lighting
- **Hero Gradient:** `linear-gradient(135deg, #1D4ED8 0%, #7C3AED 60%, #22D3EE 100%)` applied to hero stats, with 8 dp rounded corners and overlay noise texture at 12% opacity for depth.
- **FAB Gradient:** `radial-gradient(circle at 30% 20%, #22D3EE 0%, #2563EB 55%, #1D4ED8 100%)` with 4 dp inner shadow (#0F172A @20%) to imply pressability.
- **Progress Gradient:** `linear-gradient(90deg, #16A34A 0%, #22D3EE 50%, #2563EB 100%)` for learning progress bars; animate 2 s shimmer on completion.
- **Dark Mode Overlay:** Multiply `rgba(15, 23, 42, 0.7)` across imagery when in dark theme to maintain readability.

## Elevation & Shadows
| Level | Offset | Blur | Color |
| --- | --- | --- | --- |
| 0 (Flat) | 0dp | 0dp | none |
| 1 (Cards, Tabs) | 0dp | 8dp | rgba(15, 23, 42, 0.06) |
| 2 (FAB, Modal) | 12dp | 24dp | rgba(15, 23, 42, 0.16) |
| 3 (Bottom Sheet) | -6dp | 16dp | rgba(15, 23, 42, 0.18) |

## Semantic Mappings by Screen
- **Home:** Primary gradient hero, neutral/25 background, accent/500 for streak counters.
- **Learn:** Neutral/25 body with accent/600 module tags; success/500 for completed lessons.
- **Community:** Secondary/500 thread headers, info/500 pinned posts, warning/500 moderation alerts.
- **Library:** Neutral/900 list background in dark mode, primary/500 folder icons.
- **Profile & Settings:** Neutral/25 surfaces, accent/500 toggles when active, error/500 for delete account zone.

## Dark Mode Tokens
| Token | Hex |
| --- | --- |
| `dark/background` | #050914 |
| `dark/surface` | #0D1524 |
| `dark/primary` | #60A5FA |
| `dark/accent` | #2DD4BF |
| `dark/text/primary` | #E2E8F0 |
| `dark/text/secondary` | #94A3B8 |

## Implementation Notes
- Provide token export for Flutter (`ColorScheme` extension) and React Native (`theme.ts`).
- Document automated contrast tests with plugin (Able for Figma) referencing tokens above.
- Gradients exported as 1024 px PNG with subtle noise (2% monochrome) for compatibility on low-end Android.
