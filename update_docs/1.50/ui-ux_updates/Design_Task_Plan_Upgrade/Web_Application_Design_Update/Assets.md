# Asset Plan – Web Application Design Update v1.50

## Asset Types
- **Hero Illustrations:** 6 scenes covering hero, community, analytics, mentorship, resources, and success stories. Provided in SVG + WebP fallback.
- **Photography:** Curated set of high-resolution imagery for testimonials and case studies. Optimized for 16:9 and 4:5 crops.
- **Icons:** Updated duotone set for navigation, features, and callouts (sizes 24/32/48px).
- **Lottie Animations:** Lightweight animations for empty states and onboarding tooltips (<600KB).
- **Background Patterns:** Subtle gradient overlays and textures for section backgrounds.

## Organization
- Store assets in `/update_docs/1.50/assets/web/` grouped by category (`heroes`, `photos`, `icons`, `animations`, `patterns`).
- Naming convention: `type_context_variant.ext` (e.g., `hero_collaborate_light.svg`).
- Maintain asset manifest (CSV/JSON) documenting usage, alt text guidance, file size, and responsible owner.

## Optimization Guidelines
- Compress SVGs using SVGO; remove unnecessary metadata.
- Deliver responsive images via `<picture>` element with AVIF/WebP + JPEG fallbacks.
- Limit hero imagery to <500KB after optimization; lazy load below-the-fold assets.
- Provide retina versions for icons used in high-density displays.

## Accessibility & Localization
- Provide descriptive alt text focusing on story ("Mentor guiding learners via video call") not decorative details.
- Ensure text within images replaced with live text for translation.
- Provide mirrored versions for RTL contexts when directional imagery used.

## Governance
- Brand team reviews new assets for consistency.
- Version assets with semantic naming (v1, v1.1). Archive deprecated assets in `/archive` folder.
- Document licensing details for photography and ensure compliance.
