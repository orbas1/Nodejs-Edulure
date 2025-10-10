# CSS Implementation Guidelines – Web Application v1.00

## Architecture
- Adopt CSS Modules with `@layer` support to organise utilities, components, and overrides.
- File hierarchy:
  - `styles/tokens.css` – CSS custom properties (colours, spacing, typography).
  - `styles/base.css` – Resets, typography base, global layout primitives.
  - `styles/components/` – Component-specific modules.
  - `styles/pages/` – Page-level overrides.
- Use `:where()` selectors to reduce specificity; avoid chaining more than three selectors.

## Custom Properties
```
:root {
  --color-surface-page: #0B1120;
  --color-surface-card: #111C3B;
  --color-surface-alt: rgba(15,23,42,0.75);
  --color-border-soft: rgba(148,163,184,0.24);
  --color-accent-electric: #4C7DFF;
  --color-accent-lilac: #A78BFA;
  --color-text-primary: #F8FAFC;
  --shadow-elevated: 0 32px 64px rgba(8,18,36,0.42);
  --radius-lg: 20px;
  --radius-md: 16px;
  --radius-sm: 12px;
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;
  --space-2xl: 48px;
  --transition-fast: 120ms cubic-bezier(0.33, 1, 0.68, 1);
  --transition-medium: 240ms cubic-bezier(0.33, 1, 0.68, 1);
}
```
Dark/light theme toggled via `data-theme="light"` to override relevant variables.

## Base Styling
- Apply `box-sizing: border-box` globally.
- Typography base `font-family: 'Inter', 'SF Pro Text', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`.
- Set `body` background `var(--color-surface-page)` and text `var(--color-text-primary)` with `line-height: 1.6`.
- Use CSS logical properties for margin/padding to support localisation.

## Layout Utilities
- `.grid-12` – Defines 12-column responsive grid using CSS Grid with `grid-template-columns: repeat(12, minmax(0, 1fr))` and `column-gap: var(--space-lg)`.
- `.stack-md` – Flex column with `gap: var(--space-lg)`.
- `.cluster` – Flex row with wrap, `gap: var(--space-md)`, align centre for badges/chips.
- `.visually-hidden` – Standard accessible hiding utility.

## Responsive Helpers
```
@media (max-width: 1023px) {
  .sidebar { width: 80px; }
  .grid-12 { grid-template-columns: repeat(8, minmax(0,1fr)); }
}
@media (max-width: 767px) {
  .grid-12 { grid-template-columns: repeat(6, minmax(0,1fr)); }
  .hero { flex-direction: column; text-align: center; }
}
@media (max-width: 479px) {
  .grid-12 { grid-template-columns: repeat(4, minmax(0,1fr)); }
  .header { height: 56px; }
}
```

## Motion & Interaction
- Define keyframes in `styles/motion.css`:
  - `@keyframes parallaxFloat` for hero illustration (translate 0→12px, rotate 0→8deg).
  - `@keyframes shimmer` for skeleton loaders.
- Use `prefers-reduced-motion` media query to disable non-essential animations.

## Accessibility Considerations
- Provide `:focus-visible` styles with `outline: 2px solid #38BDF8; outline-offset: 4px;`.
- Maintain `scroll-margin-top: 112px;` on headings to account for sticky header.
- Ensure contrast by referencing tokens from `colours.md`.

## Performance Best Practices
- Minify CSS via build pipeline, target <120KB compressed.
- Use `content-visibility: auto` for offscreen sections to improve rendering.
- Implement CSS `@supports` to gracefully degrade advanced features.
