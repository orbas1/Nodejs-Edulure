# Design system foundations

The accessibility and responsiveness refresh introduces a shared layer of design tokens and grid utilities that power both marketing and dashboard surfaces.

## Tokens

Design tokens live in `frontend-reactjs/src/styles/tokens.css` and expose CSS custom properties for:

- **Breakpoints** – exported as `--screen-{size}` variables so React utilities and CSS can read consistent viewport thresholds.
- **Spacing and typography** – shared spacing values (`--space-*`) and typography settings keep marketing and dashboard compositions aligned.
- **Semantic colour roles** – surface, border, text, and brand tokens react to dark mode and high-contrast preferences automatically.
- **Motion primitives** – reduced motion media queries combine with the new accessibility utilities to opt-out of pulse/transition effects.

Apply tokens via Tailwind utility composition or raw CSS (`background-color: var(--color-surface)`), and override them by setting `data-theme="dark"` or `data-contrast="high"` on the document root for explicit themes.

For navigation remediation specifics, see [navigation-annex.md](navigation-annex.md) which tracks Annex A55 deliverables.

## Responsive grid utility

The `.responsive-grid` class (defined in `frontend-reactjs/src/styles.css`) implements an auto-fit grid powered by token defaults. Components can customise the minimum column size or gap by setting CSS variables inline, e.g.

```jsx
<div className="responsive-grid" style={{ '--grid-min-column': '18rem' }}>
  {items.map(renderCard)}
</div>
```

This keeps marketing cards, dashboards, and resource libraries aligned without duplicating breakpoint maps in component styles.

## Accessibility helpers

`frontend-reactjs/src/utils/a11y.js` centralises:

- Focus trapping (`useFocusTrap`) for modal/dialog experiences.
- Reduced motion detection hooks (`usePrefersReducedMotion`).
- Live region helpers for polite announcements.

All modal components and animated marketing panels should import from this module to honour system-level accessibility preferences.
