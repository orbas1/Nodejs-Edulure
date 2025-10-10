# Image & Vector Asset Requirements

## Storage
- Store assets under `/assets/web/v1.50/` with light/dark variants.
- Use descriptive filenames: `home-hero-provider-dark.svg`, `community-illustration-light.png`.

## Format & Optimisation
- Prefer SVG for icons/illustrations; compress using SVGO.
- Use WebP for bitmap images with fallback PNG.
- Maintain maximum file size of 200KB for hero imagery.

## Delivery
- Serve via CDN with caching headers; include responsive `srcset` for hero images.
- Provide LQIP placeholders for lazy-loaded sections.

## Governance
- Document usage rights and attributions.
- Track updates in `Assets.md` to align with version control.
