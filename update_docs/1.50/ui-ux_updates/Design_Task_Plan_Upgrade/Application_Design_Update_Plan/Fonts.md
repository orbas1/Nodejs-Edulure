# Typography Plan – Application Design Update v1.50

## Primary Typeface
- **Inter Variable** adopted for all mobile experiences (learner & provider). Supports optical sizing and variable weight from 300–700.
- Fallback stack: `"Inter", "SF Pro Text", "Roboto", "Segoe UI", sans-serif` to maintain consistency across platforms.

## Type Scale
| Token | Size (px) | Line Height | Use Cases |
| --- | --- | --- | --- |
| display-xl | 44 | 54 | Marketing hero overlays, major announcements |
| display-lg | 36 | 44 | Onboarding hero slides, celebratory modals |
| heading-xl | 28 | 36 | Dashboard section headers |
| heading-lg | 24 | 32 | Cohort titles, tab headers |
| heading-md | 20 | 28 | Card titles, modal headers |
| heading-sm | 18 | 26 | Timeline labels, settings headers |
| body-lg | 18 | 26 | Description copy, tooltips (longer text) |
| body-md | 16 | 24 | Default body text, forms |
| body-sm | 14 | 22 | Metadata, helper text |
| caption | 12 | 18 | Timestamps, badge labels |
| mono-sm | 13 | 20 | Code snippets, integration tokens |

## Weight & Emphasis Guidelines
- Headings use weight 600; body defaults 400; emphasis 500.
- Links use 500 with underline on hover/focus.
- Avoid using weight above 700 to maintain readability on mobile.

## Accessibility & Dynamic Type
- Support OS-level text scaling from 80% to 200%. Components adapt using AutoLayout to prevent truncation.
- Provide alternative layout patterns for extremely large text (stack buttons, wrap metadata).

## Alignment & Spacing
- Use consistent 4px baseline grid. Maintain 8px spacing between heading and supporting text.
- Justified text discouraged; left alignment default, center alignment reserved for hero statements.

## Localization Considerations
- Verify glyph support for Latin, Latin Extended, Cyrillic, Devanagari. Inter covers these; ensure fallback for missing glyphs (Noto Sans).
- Avoid uppercase for languages where case not applicable; use sentence case when localizing.

## Implementation Tasks
- Update Flutter theme with typography tokens; ensure Material typography override.
- Update React Native stylesheets; remove legacy fonts.
- Provide engineers with design token export (`typography.json`) mapping tokens to font-size/line-height/weight.
- Include QA test cases for dynamic type and long text scenarios.
