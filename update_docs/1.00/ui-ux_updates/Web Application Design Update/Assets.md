# Assets & Media Specification – Web Application v1.00

## Repository Structure
```
assets/
  brand/
    logomark_light.svg
    logomark_dark.svg
    wordmark_horizontal.svg
  illustrations/
    hero_orbit_v1.svg
    dashboard_glow_v1.png
    community_scene_v1.svg
  icons/
    16/
    20/
    24/
    32/
  photos/
    learners/
    providers/
    enterprise/
  patterns/
    gradient_mesh_01.png
    noise_overlay_01.png
```
All assets are stored in Git LFS with optimisation metadata in `assets/_manifest.json` containing checksum, width, height, and compression method.

## Asset Types & Requirements
- **Logos**
  - Format: SVG with responsive symbol, 48px min width, accessible `title` tags.
  - Usage: Header (48px), footer (72px), favicons (multi-size `.ico` derived via pipeline defined in `Resources.md`).
- **Illustrations**
  - Primary hero: `hero_orbit_v1.svg`, 1440×960 artboard, exported with 2px stroke, 0.8 opacity glow layer separate for CSS animation.
  - Secondary hero: `dashboard_glow_v1.png` (PNG-24, 1920×1080, <450KB) for dashboards.
  - Licensing: Custom Figma builds stored under `/resources/figma/` with version tags.
- **Icons**
  - Source: Phosphor Icons with enterprise license. Stored as 24px base; 16px and 32px variants generated via SVGO script.
  - Fill: Use `currentColor` to inherit text colour. Provide filled and outlined states for toggles.
- **Photography**
  - Curated from Unsplash API with usage rights. Each photo stored at 1920×1280, compressed to 70% quality JPEG (~220KB). Provide alt text in `images_and_vectors.md`.
- **Patterns & Textures**
  - `gradient_mesh_01.png` overlays hero backgrounds. 2800×1800 resolution to avoid pixelation on large screens.
  - `noise_overlay_01.png` 1200×1200 transparent PNG applied at 12% opacity for depth.

## Delivery & Optimisation
- All imagery processed through ImageOptim with colour profile sRGB. Provide WebP versions using build script `yarn assets:compress`.
- Lazy-load below-the-fold images using IntersectionObserver; specify `width`/`height` attributes to prevent CLS.
- Use `<picture>` for art-directed hero images (SVG default, fallback PNG at <768px).

## Accessibility & Metadata
- Every image must include descriptive `alt` text, `role="img"`, and `aria-describedby` if referencing captions.
- Provide JSON-LD metadata for hero illustrations referencing creative work license.
- Document asset usage in component stories to ensure reuse and reduce duplicates.

## Version Control & Governance
- Asset updates require design review and entry in `design_change_log.md` with checksum.
- Maintain `assets/licenses/` folder with PDFs for icon and photo usage rights.
- Run monthly audit script `yarn assets:audit` to detect unused media.
