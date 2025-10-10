# Colours

## Core Palette
| Token | Hex | Usage |
| --- | --- | --- |
| `primary/500` | #2563EB | Primary actions, key links, focused gradients.
| `primary/600` | #1D4ED8 | Pressed state for primary buttons and chips.
| `secondary/500` | #7C3AED | Accent for analytics, highlights, and premium upsells.
| `neutral/900` | #0F172A | Backgrounds for dark header and modals.
| `neutral/50` | #F8FAFC | Surface backgrounds and cards.
| `neutral/200` | #E2E8F0 | Dividers, outlines, skeleton loaders.
| `success/500` | #22C55E | Completion states, success toasts.
| `warning/500` | #F59E0B | Pending approvals, expiring tasks.
| `error/500` | #EF4444 | Critical alerts, failed conversions.
| `info/500` | #38BDF8 | Informational banners, tutorial prompts.

## Gradient System
- **Hero Gradient:** `linear(135deg, #2563EB 0%, #7C3AED 100%)` for splash, hero stats, and CTA backgrounds.
- **Background Wash:** `linear(160deg, #0B1120 0%, #1E293B 100%)` applied subtly with 60% opacity overlay for dashboards.
- **Progress Overlay:** `linear(90deg, #14B8A6 0%, #22C55E 100%)` for completion meters and health indicators.

## State Colours
- **Disabled:** Use `neutral/200` backgrounds with `neutral/500` text at 60% opacity.
- **Focus Ring:** 2px outline using `info/500` at 40% opacity for keyboard focus parity.
- **Pressed:** Darken base colour by 10% and reduce elevation to communicate activation.

## Theming Guidelines
- Provide light and dark mode tokens; ensure contrast ratios meet or exceed 4.5:1 for text and 3:1 for large display text.
- Support custom community accent colour while enforcing readability thresholds and fallback tokens.
- Document alias tokens per platform (Flutter, React Native) to guarantee consistency with shared design system.
