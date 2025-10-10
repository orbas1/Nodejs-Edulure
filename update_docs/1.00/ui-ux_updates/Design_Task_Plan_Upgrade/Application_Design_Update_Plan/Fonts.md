# Fonts — Typographic System v1.00

## Font Families
- **Primary Sans:** `Inter` (Google Fonts) – UI text, labels, body copy. Optimised for readability at small sizes.
- **Display Sans:** `Manrope` – Hero numerals, card titles, analytics metrics due to geometric aesthetic.
- **Supporting Serif:** `Merriweather` – Optional for long-form editorial articles in Library (minimum size 16 pt).
- **Accessibility Alternate:** `Atkinson Hyperlegible` – Provided as toggled option in Accessibility settings for dyslexia-friendly reading.

## Typographic Scale (based on 1.125 modular scale)
| Token | Font | Weight | Size (pt) | Line Height | Usage |
| --- | --- | --- | --- | --- | --- |
| `display/01` | Manrope | SemiBold | 34 | 40 | Home hero headline, onboarding splash.
| `display/02` | Manrope | SemiBold | 28 | 34 | Section headers on tablets.
| `title/01` | Inter | SemiBold | 24 | 30 | Screen titles, modal headers.
| `title/02` | Inter | SemiBold | 20 | 26 | Card titles, navigation labels on tablet.
| `body/01` | Inter | Medium | 18 | 26 | Primary body copy for intros.
| `body/02` | Inter | Regular | 16 | 24 | Standard body text, list tiles.
| `body/03` | Inter | Regular | 14 | 20 | Secondary labels, metadata, button text.
| `caption/01` | Inter | Medium | 12 | 16 | Chart annotations, helper text.
| `overline/01` | Inter | SemiBold | 11 | 14 | Tag chips, uppercase section markers.

## Platform Guidelines
- **iOS:** Use San Francisco fallback; adjust letter-spacing -0.2% for titles, 0% for body.
- **Android:** Use `Inter` from Google Fonts; fallback to `Roboto` if unavailable.
- **Web Wrapper (PWA):** Host fonts via `fonts/` repo with WOFF2 assets; preconnect to avoid FOIT.

## Accessibility & Scaling
- Support dynamic type scaling from 80% to 200%. When >150%, switch layout to single-column and convert bottom navigation to top segmented tabs.
- Minimum contrast: maintain 4.5:1 with background for `body/02`; 3:1 allowed for `title/01` on large text backgrounds.
- Provide letter-spacing tokens: `tight (-1%)`, `normal (0%)`, `loose (+2%)`. Apply `loose` for uppercase overlines.

## Microcopy Tone Guidelines
- Use action verbs (“Resume Module”, “View Cohort Insights”).
- Keep button labels to 20 characters max; prefer Pascal case for feature names (“SkillTracks”).
- Provide inline translations spreadsheet (EN, FR, ES) referencing `Strings_ID` so localisation is consistent.

## Iconography Alignment
- Icons sized at 24 dp default, align to optical pixel grid; label text baseline aligns with `body/03` tokens.
- Provide glyph set via `Feather` and custom Edulure pictograms exported as 24 px and 32 px variants.
