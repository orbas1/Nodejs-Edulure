# Screen Buttons Inventory – Application Design Update v1.50

## Button Variants
- **Primary Solid:** Gradient Indigo (#4C3FE3→#6366F1), white text, 52px height (mobile), 48px (tablet+). Used for primary CTAs (Resume, Publish, Join Live).
- **Secondary Outline:** Transparent fill, 2px border (#6366F1), white text in dark mode. For secondary actions (View Details, Learn More).
- **Tertiary Text:** No border, gradient text with underline on hover. For low-emphasis actions (See All, Dismiss).
- **Positive/Success:** Emerald (#10B981) for confirm actions (Mark Complete, Approve Request).
- **Destructive:** Crimson (#DC2626) with white text for delete/withdraw actions; includes confirmation dialog.
- **Icon-Only:** Circular 48px, used for quick actions (Filter, Add, Voice Note).
- **Floating Action Button:** Gradient circle 64px with drop shadow for global create actions.

## States
| Variant | Hover | Pressed | Focus | Disabled |
| --- | --- | --- | --- | --- |
| Primary | Brighten gradient +1 stop | Darken gradient -1 stop | 3px glow (#A5B4FC) with 4px offset | 50% opacity, remove shadow |
| Secondary | Fill with 8% gradient overlay | 12% overlay | 3px glow (#A5B4FC) | Border color #475569, text #475569 |
| Tertiary | Underline extends full width | Text darkens (#4338CA) | Outline 2px (#A5B4FC) | 40% opacity |

## Placement Guidelines
- Primary button positioned at bottom of screen or end of form; maintain 16px margin from edges.
- When two buttons present, use primary on right, secondary on left (LTR). On mobile, stack with 12px gap.
- Floating action button positioned bottom-right with 24px safe area offset; avoid overlapping persistent support chip (adjust to left when both present).

## Accessibility & Interaction
- Minimum touch target 48x48. Provide accessible labels (e.g., "Start Live Session button").
- Include haptic feedback on mobile for primary actions (medium impact).
- Buttons entering loading state show spinner left of label; disable additional taps.

## Content Standards
- Use action-oriented verbs (Resume, Submit, Publish). Max 20 characters to prevent wrapping.
- For destructive actions, pair button with confirmation dialog summarizing impact.

## Implementation Notes
- Update shared button component to support gradient tokens and new state styles.
- Provide design tokens (`button.primary.background`, `button.primary.focus`) to engineering.
- Document analytics events for key buttons (prefix `cta_`).
