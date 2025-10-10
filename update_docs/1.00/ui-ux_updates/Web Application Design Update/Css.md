# CSS Architecture Guidelines

## Methodology
- Use CSS Modules for scoped styling in React components to prevent leakage.
- Adopt BEM-inspired naming within modules for clarity (`card__header`, `card--featured`).
- Rely on CSS custom properties for tokens (`--space-16`, `--accent-electric`).

## Structure
```
/web
  /styles
    tokens.css
    globals.css
  /components
    Button.module.css
    Card.module.css
```

- `tokens.css`: Defines colour, spacing, typography variables.
- `globals.css`: Resets, base typography, root layout and scrollbars.
- Component modules import tokens and define local classes.

## Responsive Strategy
- Use mobile-first media queries (`@media (min-width: 768px)` etc.).
- Provide container queries for cards/dashboards to adapt layout in wrappers.
- Utilize CSS Grid for dashboards and profile sections; fallback to flex on older browsers.

## Theming
- Manage theme switching by toggling `data-theme` attribute on `<body>`.
- Provide high-contrast theme by overriding tokens in `[data-theme="contrast"]` block.
- Persist user preference via local storage; fallback to system preference using `prefers-color-scheme`.

## Performance
- Combine shared utility classes (e.g., `.sr-only`, `.visually-hidden`).
- Lazy load heavy background images using `content-visibility: auto` for off-screen sections.
- Use `@layer` to organise base, components, utilities for future cascade management.
