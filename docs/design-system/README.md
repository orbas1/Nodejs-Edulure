# Design system foundations

The accessibility and responsiveness refresh introduces a shared layer of design tokens and grid utilities that power both marketing and dashboard surfaces.

## Tokens

Design tokens are authored in `docs/design-system/design_tokens.json` and synced into implementation targets by running `npm run sync:design-tokens`. The command regenerates:

- `frontend-reactjs/src/styles/tokens.css` for the web platform.
- `Edulure-Flutter/lib/core/design_tokens.dart` for Flutter theme primitives.
- `backend-nodejs/database/seeders/004_seed_design_system_assets.sql` so SQL-based environments seed the same token catalogue.

The generated artifacts expose CSS custom properties and Dart constants for:

- **Breakpoints** – exported as `--screen-{size}` variables so React utilities and CSS can read consistent viewport thresholds.
- **Spacing and typography** – shared spacing values (`--space-*`) and typography settings keep marketing and dashboard compositions aligned.
- **Semantic colour roles** – surface, border, text, and brand tokens react to dark mode and high-contrast preferences automatically.
- **Motion primitives** – reduced motion media queries combine with the new accessibility utilities to opt-out of pulse/transition effects.

Apply tokens via Tailwind utility composition or raw CSS (`background-color: var(--color-surface)`), and override them by setting `data-theme="dark"` or `data-contrast="high"` on the document root for explicit themes. Flutter surfaces should import `DesignTokens` and call `DesignTokens.lightTheme(...)` / `darkTheme(...)` to inherit the same palette and spacing.

> **Workflow:** Edit `design_tokens.json`, run `npm run sync:design-tokens`, commit the updated CSS/Dart/SQL outputs, and capture before/after screenshots for `user experience.md`.

The backend consumes the same source of truth via `backend-nodejs/seeds/006_design_system_assets.js`, which reads `design_tokens.json` and `research_insights.json` before inserting rows into `design_system_tokens` and `ux_research_insights`. When reseeding environments run `npm --workspace backend-nodejs run seed`, the navigation annex API immediately reflects any token or research changes. The annex payload also surfaces a `designSystem.catalogue` structure so clients can traverse tokens grouped by category (e.g., `space`, `grid`, `color`) with all available contexts (`:root`, `[data-theme='dark']`, high-contrast overrides).

## Research insights ledger

`docs/design-system/research_insights.json` mirrors the UX research ledger in `user experience.md` and seeds the `ux_research_insights` table. Each entry tracks status, impacted tokens, supporting documents, and evidence URLs so Annex A55 payloads provide both implementation context and research provenance. Update this file in tandem with the Markdown ledger, rerun the sync script, and reseed the backend to publish new insights.

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
