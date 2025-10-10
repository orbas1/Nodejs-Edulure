# Typography System

## Font Families
- **Primary UI:** Inter, sans-serif — selected for clarity across dense dashboards and long-form text.
- **Display & Marketing:** Clash Display for hero headlines, fallback to Poppins when unavailable.
- **Monospace:** JetBrains Mono for code snippets and analytics query builders.

## Type Scale
| Token | Size | Line Height | Usage |
| --- | --- | --- | --- |
| `--font-2xl` | 56px | 1.1 | Hero headlines, major metrics |
| `--font-xl` | 40px | 1.2 | Section intros, marketing callouts |
| `--font-lg` | 32px | 1.25 | Dashboard headings |
| `--font-md` | 24px | 1.3 | Card titles, profile names |
| `--font-base` | 18px | 1.45 | Body copy on desktop |
| `--font-sm` | 16px | 1.5 | Dense content, table cells |
| `--font-xs` | 14px | 1.5 | Supporting labels, filters |
| `--font-xxs` | 12px | 1.4 | Meta info, badges |

## Usage Guidelines
- Maintain `font-weight: 600` for CTAs and card titles, `500` for subheads, `400` for body.
- Apply `letter-spacing: -0.01em` for display sizes to keep large headings compact.
- Use `text-transform: uppercase` sparingly for statuses and micro labels only.

## Accessibility Considerations
- Provide text scaling up to 200% by respecting `rem` units.
- Ensure interactive elements maintain minimum 16px text size.
- Pair text with icons for complex actions (settings, analytics export) to reduce reliance on copy alone.
