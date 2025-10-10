# Web Application Styling Changes

## Design Tokens
- **Typography Scale:** Display (48/40px), Headline (32/28px), Title (24/20px), Body (18/16px), Caption (14px).
- **Spacing:** 8px base multiplier; container padding 32px on desktop, 24px on tablet, 16px on mobile.
- **Radius:** Cards 16px, buttons 12px, inputs 10px.

## Colour Palette
| Token | Hex | Usage |
| --- | --- | --- |
| `web.primary` | #2563EB | Primary CTA across web surfaces. |
| `web.secondary` | #7C3AED | Secondary CTAs and highlights. |
| `web.background` | #0B1120 (dark) transitioning to gradient with #1E293B. |
| `web.surface` | #111827 for cards with subtle border #1F2937. |
| `web.muted` | #334155 for supporting text. |
| `web.success` | #22C55E |
| `web.warning` | #F59E0B |
| `web.error` | #F87171 |

## Components
- **Navigation Bar:** Transparent gradient overlay on hero, solid background after scroll; drop shadow 0 12px 30px rgba(2,6,23,0.6).
- **Cards:** Multi-layered with frosted overlay (#FFFFFF 5%) to emphasise depth on dark surfaces.
- **Buttons:** Primary buttons with glow effect (box-shadow 0 0 24px rgba(37,99,235,0.45)); hover adds 4px upward translation.
- **Tables:** Stripe rows with `web.muted` backgrounds; header sticky with bottom border highlight (#2563EB).
- **Badges:** Outline style for tiers, filled style for statuses; align with component library tokens.

## Accessibility & Responsiveness
- Provide light theme override flipping background/surface tokens while maintaining primary/secondary contrast.
- All interactive elements have 2px focus ring (#38BDF8).
- Responsive breakpoints: desktop ≥1280px, laptop 1024-1279px, tablet 768-1023px, mobile ≤767px.
- Use CSS grid to reorder community layout on mobile (feed first, events second, resources third).
- Motion reduced mode disables hero parallax and button hover translation.
