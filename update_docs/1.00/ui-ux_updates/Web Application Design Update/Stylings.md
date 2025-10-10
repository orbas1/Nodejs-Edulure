# Styling Principles & Tokens

## Layout & Spacing
- **Grid:** 12-column layout with 16px gutters desktop, 12px tablet, 8px mobile; maximum content width 1280px.
- **Spacing Scale:** 4px base spacing increments (4, 8, 12, 16, 24, 32, 40, 56, 72) applied via CSS custom properties (`--space-xx`).
- **Elevation:** Three elevation levels using box-shadow tokens (`--shadow-low`, `--shadow-mid`, `--shadow-high`) aligned with component hierarchy.

## Colour Application
- **Surface Tokens:** Light theme uses `--surface-base (#0F172A)`, `--surface-card (#111C3B)`, dark surfaces lighten to maintain contrast; dark theme inverts with tinted overlays.
- **Accent Usage:** Primary accent `--accent-electric (#4C7DFF)` for CTAs, secondary accent `--accent-lilac (#A78BFA)` for highlights, tertiary `--accent-sun (#F59E0B)` for warning emphasis.
- **State Colours:** Success `#10B981`, Warning `#FBBF24`, Danger `#F87171`, Info `#38BDF8`. Paired with accessible 4.5:1 text contrast.

## Typography
- **Primary Font:** "Inter" for UI, `font-feature-settings: 'cv05', 'cv09'` for clarity; fallback `system-ui`.
- **Display Font:** "Clash Display" for hero and marketing headings; fallback `"Poppins", sans-serif`.
- **Type Scale:** `--font-size` tokens map to 14, 16, 18, 20, 24, 32, 40, 56 with consistent line-height (1.4 for body, 1.25 for headings).

## Iconography & Imagery
- **Icon Style:** 24px rounded outline icons; use consistent stroke weight (1.5px). Provide filled variants for active states.
- **Illustrations:** Soft gradients using brand palette; maintain consistent corner radius (16px) and drop shadow for hero imagery.
- **Avatars:** Circular, 40px default, 64px for profile headers; integrate status badges (online, verified) using accent tokens.

## Motion & Interaction
- **Duration:** Standard transition 150ms ease-out for hover, 250ms ease-in-out for modals/drawers.
- **Easing:** Use cubic-bezier(0.4, 0, 0.2, 1) to maintain material-inspired feel.
- **Micro-interactions:** Buttons include scale(0.98) on active; cards elevate by `--shadow-mid` on hover; skeletons shimmer via linear gradient animation.

## Accessibility
- Maintain minimum text size 14px for body, 12px only for secondary labels.
- Provide focus states using 2px outline with `--accent-electric` or high-contrast white on dark background.
- Support high-contrast mode by swapping surfaces to `#FFFFFF`/`#0B1120` and accent to `#2563EB`.

## Theme Tokens
```
:root {
  --surface-page: #0B1120;
  --surface-card: #111C3B;
  --surface-alt: rgba(15, 23, 42, 0.75);
  --accent-electric: #4C7DFF;
  --accent-lilac: #A78BFA;
  --accent-sun: #F59E0B;
  --text-primary: #F8FAFC;
  --text-secondary: #CBD5F5;
  --border-soft: rgba(148, 163, 184, 0.24);
}
```
