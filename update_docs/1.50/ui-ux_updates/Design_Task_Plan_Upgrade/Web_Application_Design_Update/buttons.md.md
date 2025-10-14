# Button Specification – Web Application v1.50

## Variants
- Primary (gradient fill), Secondary (outline), Tertiary (text link), Destructive (solid red), Positive (solid green), Icon-only.

## States
| Variant | Hover | Active | Focus | Disabled |
| --- | --- | --- | --- | --- |
| Primary | Brighten gradient | Darken gradient | 3px glow (#C7D2FE) | 50% opacity, remove shadow |
| Secondary | Fill with #EEF2FF | Border darkens (#4338CA) | Outline (#C7D2FE) | Border & text lighten (#94A3B8) |
| Tertiary | Underline animate | Text darkens (#4338CA) | Outline (#C7D2FE) | Opacity 0.5 |

## Sizing
- Default height 48px (desktop), 52px (mobile). Padding 20px horizontal, 16px vertical on icon-only (40px square).

## Icons
- Support left/right icons with 8px spacing. Loading state replaces icon with spinner.

## Accessibility
- Provide aria-labels for icon-only buttons. Ensure color contrast meets 4.5:1.

## Implementation
- Use CSS variables for background, border, text. Provide utility classes for button groups.
- Document analytics naming: `cta_<context>_click`.
