# Colour Guidelines – Web Application Design Update v1.50

## Palette Overview
- **Primary Gradient:** `#4338CA → #6366F1` for CTAs, active states, navigation highlights.
- **Secondary Accent:** `#F97316` for key callouts, tooltips, and conversion nudges.
- **Neutral Base (Light):** Background `#FFFFFF`, Surface `#F8FAFC`, Card `#FFFFFF`, Border `#E2E8F0`, Text Primary `#0F172A`, Text Secondary `#475569`.
- **Neutral Base (Dark):** Background `#0F172A`, Surface `#111C2D`, Card `#16213C`, Border `#22314D`, Text Primary `#F8FAFC`, Text Secondary `#CBD5F5`.
- **Feedback Colors:** Success `#16A34A`, Warning `#F59E0B`, Error `#DC2626`, Info `#0EA5E9`.

## Usage Principles
- Limit gradient usage to primary CTAs, active nav states, progress indicators; use solid colors for supporting actions to maintain hierarchy.
- Maintain consistent color coding for statuses across web and mobile (e.g., Overdue #DC2626).
- Provide neutral backgrounds for data-heavy areas to reduce visual noise; use accent colors sparingly for emphasis.

## Accessibility & Contrast
- Ensure text meets 4.5:1 contrast ratio. For light mode, use Text Primary on white backgrounds; for dark mode, lighten background to maintain contrast.
- Provide high contrast theme tokens (Primary HC `#312E81`, Background HC `#000B1A`, Text HC `#FFFFFF`).

## Charts & Data Visualizations
- Use 8-color palette with 70% saturation: Indigo, Violet, Teal, Emerald, Amber, Coral, Slate, Sky.
- Provide alternative patterns for colorblind accessibility when multiple series use similar hues.

## Implementation
- Update CSS variables: `--color-primary-500`, `--color-primary-gradient`, `--color-surface`, etc.
- Ensure SCSS mixins use tokens to avoid hard-coded hex values.
- Document gradient usage (angle 135°, start at 0%).
