# Styling Overview – Web Application v1.50

## Design System Alignment
- Use shared typography, color, spacing tokens defined in design_change_log.
- Ensure component variants (buttons, cards, tables) align visually with mobile counterparts.

## Elements
- Buttons: gradient primary, outline secondary, ghost tertiary. Include hover, focus, disabled states.
- Cards: 16px radius, 24px padding, subtle drop shadow. Provide hover/active states.
- Tables: zebra striping, sticky headers, responsive behavior.
- Forms: filled inputs with 12px radius, focus ring gradient, helper/error text styles.
- Modals: 20px radius, drop shadow, close icon 24px.

## Imagery & Iconography
- Duotone icon set with consistent stroke width. Illustrations with gradient backgrounds.
- Use consistent color grading across photography.

## Motion
- Entrance animations 240ms ease-out; exit 180ms ease-in. Use `prefers-reduced-motion` fallback.
- Hover states utilize color shift and subtle elevation; avoid excessive scaling.

## Accessibility
- Contrast ratios 4.5:1, focus outlines 3px #22D3EE. Provide states for keyboard and screen reader interactions.

## Documentation
- Maintain component guidelines in Storybook with usage do/don’t examples.
