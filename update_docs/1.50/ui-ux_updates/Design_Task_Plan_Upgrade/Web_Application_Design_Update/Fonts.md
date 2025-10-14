# Typography System – Web Application Design Update v1.50

## Primary Typeface
- **Inter Variable** across marketing and product surfaces. Fallback: `"Inter", "Helvetica Neue", "Segoe UI", sans-serif`.
- Monospaced usage: `IBM Plex Mono` for code snippets and analytics filters displaying query syntax.

## Type Scale
| Token | Size | Line Height | Usage |
| --- | --- | --- | --- |
| display-xl | 56 | 64 | Homepage hero headlines |
| display-lg | 48 | 56 | Section intros, marketing banners |
| display-md | 40 | 48 | Dashboard hero metrics |
| heading-lg | 32 | 40 | Page titles, navigation headings |
| heading-md | 24 | 32 | Section headers, card titles |
| heading-sm | 20 | 28 | Subsection headers, table headings |
| body-lg | 18 | 28 | Marketing paragraph text |
| body-md | 16 | 24 | Standard copy, form labels |
| body-sm | 14 | 22 | Metadata, helper text |
| caption | 12 | 18 | Timestamps, chart axis labels |
| mono-sm | 13 | 20 | Code tokens, command palette hints |

## Weight Usage
- Display + headings: weight 600.
- Body: weight 400, emphasis 500.
- Links: 500 with underline on hover.

## Accessibility
- Support browser text scaling up to 200%. Layouts adjust by increasing line height and allowing text wrapping.
- Avoid center alignment for long paragraphs to maintain readability.

## Localization
- Validate glyph support for extended Latin, Cyrillic, Greek. Provide fallback `Noto Sans` for missing characters.
- Use sentence case to support languages without title case conventions.

## Implementation
- Update CSS variables for typography tokens (`--font-size-heading-md`, etc.).
- Document usage guidelines in Storybook including responsive behavior.
