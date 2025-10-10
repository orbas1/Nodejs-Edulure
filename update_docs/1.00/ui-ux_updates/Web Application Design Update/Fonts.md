# Typography Specification – Web Application v1.00

## Primary Typeface
- **Font Family:** Inter (Variable) with fallback `'SF Pro Text', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`.
- **Weights Used:** 400, 500, 600, 700. Use variable axes for fine-tuning (opsz 14–72).
- **Loading Strategy:** Self-hosted via `@font-face` with WOFF2 format. Use `font-display: swap`. Preload regular (400) and semibold (600) weights.

## Secondary Typeface
- **Display Accent:** `Clash Display` for marketing hero H1s (weights 500, 600). Only used above 36px. Provide fallback to Inter with letter-spacing adjustments.

## Type Scale
| Token | Style | Size (px) | Line Height | Letter Spacing | Usage |
| --- | --- | --- | --- | --- | --- |
| `--type-hero` | Clash Display SemiBold | clamp(40, 5vw, 56) | 1.1 | -0.02em | Home hero headline |
| `--type-h1` | Inter SemiBold | 36 | 1.2 | -0.01em | Section intros |
| `--type-h2` | Inter SemiBold | 28 | 1.3 | -0.005em | Dashboard headers |
| `--type-h3` | Inter SemiBold | 24 | 1.35 | 0 | Card titles |
| `--type-h4` | Inter Medium | 20 | 1.4 | 0 | Subheads |
| `--type-body-lg` | Inter Regular | 18 | 1.55 | 0 | Marketing copy |
| `--type-body` | Inter Regular | 16 | 1.6 | 0 | Application body text |
| `--type-body-sm` | Inter Medium | 14 | 1.6 | 0.01em | Metadata, helper text |
| `--type-caption` | Inter Medium | 12 | 1.4 | 0.02em | Badges, chart labels |
| `--type-eyebrow` | Inter SemiBold | 14 | 1.4 | 0.18em uppercase | Section eyebrow |

## Responsive Scaling
- Use CSS clamp for headings to maintain readability across breakpoints.
- On screens <768px, reduce hero headline to clamp(32, 6vw, 44), body text remains 16px for legibility.

## Accessibility & Language Support
- Support Latin Extended subset; ensure fonts include diacritics for Spanish/French.
- Provide fallback `Noto Sans` for languages requiring additional glyphs.
- Maintain consistent line-height to support dyslexia-friendly adjustments (increase letter spacing to 0.05em when toggled).

## Implementation Notes
- Define typography tokens in `_typography.scss` using maps for direct consumption by components.
- Use `font-feature-settings: 'liga' 1, 'tnum' 1;` on numeric-heavy surfaces (dashboards) to align digits.
- Keep max line length 72ch for paragraphs; apply `hyphens: auto;` for long words.
