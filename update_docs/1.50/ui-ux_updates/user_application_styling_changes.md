# Learner Application Styling Changes

## Typography
- **Heading:** Inter Display 700/600 weights.
- **Body:** Inter 400/500 at 16px base with 18px on large screens for readability.
- **Supporting:** Source Serif Pro for quote blocks inside ebooks.

## Colour Palette
| Token | Hex | Usage |
| --- | --- | --- |
| `learner.primary` | #7C3AED | Primary CTA for resume/join/follow actions. |
| `learner.secondary` | #14B8A6 | Secondary chips (filters, badges). |
| `learner.background` | #F8FAFC | App background to maintain light, airy feel. |
| `learner.surface` | #FFFFFF | Card backgrounds with 1px border (#E2E8F0). |
| `learner.text` | #0F172A | Primary text colour for high contrast. |
| `learner.success` | #22C55E | Quiz success, streak achievements. |
| `learner.warning` | #F59E0B | Payment/paywall prompts. |
| `learner.error` | #EF4444 | Subscription issues or DRM violation. |

## Components
- **Cards:** Rounded corners (16px) with subtle drop shadow (0 10px 30px rgba(15,23,42,0.06)).
- **Buttons:** Primary buttons full-width on mobile, pill shaped with 8px padding; includes icon + label combos for clarity.
- **Chips:** 12px text with uppercase label, used for quick filters and badges.
- **Progress Indicators:** Combined ring + percentage for course completion; ebook progress uses horizontal bar with gradient fill.
- **Modal Sheets:** 24px corner radius, drag handle visible for mobile bottom sheets.

## Accessibility
- Provide dark theme variant with `learner.background` swapped to #0B1120 and text tokens reversed.
- Minimum contrast ratio 4.5:1 on all text vs. background.
- Animations respect reduced motion preference by switching to fade transitions.
- Voice-over labels include context (e.g., "Follow Instructor John – button").
