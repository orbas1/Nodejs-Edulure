# Styling Directives – Web Application v1.00

## Layout Rhythm
- Base spacing unit: 8px. Apply multiples to maintain vertical rhythm.
- Section padding: 80px top/bottom desktop, 64px tablet, 48px mobile.
- Use consistent `gap` tokens (`var(--space-lg)`, etc.) to align with CSS variables.

## Corners & Shadows
| Level | Radius | Shadow |
| --- | --- | --- |
| Shell | 0 | `0 12px 24px rgba(8,18,36,0.36)` (header shadow when sticky) |
| Cards/Modals | 20px | `0 32px 64px rgba(8,18,36,0.42)` |
| Buttons | 12–16px | `0 18px 40px rgba(76,125,255,0.24)` hover |
| Chips | 999px | none |

## Borders & Dividers
- Use `1px solid rgba(148,163,184,0.16)` for light separators.
- Use `2px` accent borders for active states, e.g., selected tab indicator `#4C7DFF`.
- Divider spacing: 32px above and below to maintain readability.

## Background Treatments
- Apply gradient overlays to hero modules using tokens defined in `colours.md`.
- For cards, use `background-blend-mode: screen` when layering noise texture.
- Dashboard backgrounds include subtle grid pattern `url('../patterns/grid_8.svg')` at 6% opacity.

## Imagery & Masks
- Hero illustrations masked with 24px corner radius to align with cards.
- Avatar images use 2px border `rgba(15,23,42,0.88)` to stand out on dark backgrounds.
- Use CSS `mask-image` for layered shape cutouts on marketing sections.

## Iconography
- Standard icon size 20px in buttons, 24px in navigation, 32px for hero callouts.
- Maintain 8px spacing between icon and label.
- Use monotone icons tinted via `currentColor` to ensure theme compatibility.

## Motion Styling
- Use transform-based animations (translate/scale) rather than layout properties for performance.
- Provide subtle 2% scale-up on card hover with `transform: translateY(-4px) scale(1.01)`.
- Delay sequential list items by 60ms for entrance animations.
- Provide `prefers-reduced-motion` fallback: disable transforms, only fade opacity.

## State Styling
- Focus: 2px outline `#38BDF8`, 4px offset, maintain across components.
- Hover: lighten backgrounds by 10% or increase shadow depth.
- Active: compress component by `translateY(2px)` with darker gradient.
- Disabled: reduce opacity to 48% and remove shadows.

## Typography Styling
- Maintain optical alignment; align headings to baseline grid.
- Body text `font-weight: 400`, letter spacing 0. Paragraph margins 16px bottom.
- Links: `color: #38BDF8`, underline on hover, focus states as above.

## Responsive Considerations
- Breakpoint-specific adjustments documented in `Screen Size Changes.md`.
- Avoid text smaller than 14px on mobile.
- Buttons span full width on mobile when part of forms or hero modules.

## Implementation Checklist
1. Audit components against design tokens in Storybook.
2. Validate responsive layout in Chrome, Safari, Firefox, Edge.
3. Run Lighthouse to ensure minimal layout shifts (<0.05 CLS).
4. Document deviations in `design_change_log.md` with rationale.
