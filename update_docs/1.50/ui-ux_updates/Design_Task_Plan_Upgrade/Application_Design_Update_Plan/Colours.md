# Colour Strategy – Application Design Update v1.50

## Palette Overview
- **Primary:** Indigo 600 `#4C3FE3`, Indigo 500 `#6366F1`, Indigo 400 `#818CF8` – used for CTAs, highlights, focus.
- **Secondary:** Sapphire 500 `#1D4ED8`, Teal 400 `#2DD4BF` – used for secondary buttons, data visualizations.
- **Neutral Dark Theme:** Base 950 `#020617`, Surface 900 `#0F172A`, Surface 800 `#111C2D`, Stroke 700 `#1F2937`, Muted 600 `#334155`.
- **Neutral Light Theme (Provider optional):** Base 50 `#F8FAFC`, Surface 100 `#F1F5F9`, Surface 200 `#E2E8F0`, Text 900 `#0F172A`.
- **Feedback:** Success `#10B981`, Warning `#F59E0B`, Error `#DC2626`, Info `#0EA5E9`.

## Usage Guidelines
- Maintain minimum contrast 4.5:1 for text vs background; use `Indigo 400` or darker for text on light surfaces.
- Limit simultaneous accent colors to two per screen to avoid overwhelm; prefer neutral backgrounds with accent highlights.
- Reserve `Coral #FF7A70` for alerts requiring immediate attention to maintain urgency.
- Charts must use 8-color palette (Indigo, Sapphire, Emerald, Amber, Coral, Violet, Teal, Slate) with accessible combinations for dark backgrounds.

## Gradients & Backgrounds
- Hero gradients: `linear-gradient(135deg, #312E81 0%, #4338CA 50%, #7C3AED 100%)`.
- Achievement glow: `radial-gradient(circle at 50% 50%, rgba(124,58,237,0.35) 0%, rgba(12,10,35,0) 65%)`.
- Empty states use desaturated backgrounds (#1E293B) with accent highlights.

## States & Interaction Colors
| Component | Default | Hover | Pressed | Disabled |
| --- | --- | --- | --- | --- |
| Primary Button | #4C3FE3 | #4338CA | #312E81 | rgba(76,63,227,0.4) |
| Secondary Button | transparent border #6366F1 | rgba(99,102,241,0.08) | rgba(99,102,241,0.12) | rgba(148,163,184,0.32) |
| Text Link | #818CF8 | #6366F1 underline | #4338CA | rgba(129,140,248,0.5) |
| Focus Outline | #A5B4FC | n/a | n/a | n/a |

## Dark vs Light Mode Adjustments
- Provider app defaults to dark palette; ensure icons and illustrations include light variants.
- For learners, dark mode optional: backgrounds shift to `#0F172A`, text to `#F8FAFC`. Gradients adjusted to maintain vibrancy (increase saturation by 10%).
- Shadows on dark surfaces use lighter tints (e.g., `0 10px 30px rgba(15,23,42,0.45)`), while light surfaces use darker shadows.

## Accessibility Considerations
- Provide alternative color tokens for high-contrast mode: Primary HC `#312E81`, Secondary HC `#134E4A`, Background HC `#020617`, Text HC `#F8FAFC`.
- Ensure status colors supplemented with icons/patterns for color-blind users (e.g., success check icon, error exclamation).
- Validate color usage across states using automated tooling (Contrast plugin, Stark) and manual spot checks.

## Implementation Notes
- Update design tokens JSON to include `color.brand.indigo600`, etc., with dark/light variants.
- Provide Figma library swatches and ensure developers use token names rather than hex values.
- Document fallback colors for Android/older devices lacking gradient support.
