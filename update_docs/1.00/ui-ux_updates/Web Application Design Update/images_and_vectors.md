# Images & Vector Assets – Web Application v1.00

## Hero Imagery
| Page | Asset | Dimensions | Format | Source | Notes |
| --- | --- | --- | --- | --- | --- |
| Home Hero | `hero_orbit_v1.svg` | 1440×960 | SVG | Figma file `hero_orbit_v1.fig` | Layered planets with glow; animate using CSS parallax |
| Dashboard Intro | `dashboard_glow_v1.png` | 1920×1080 | PNG/WebP | Rendered in Blender, exported via `renders/dashboard/` | Use WebP for browsers supporting; fallback PNG |
| Community Section | `community_scene_v1.svg` | 1280×880 | SVG | Figma component library | Illustrates collaboration, includes masked gradients |

## Photography Library
| Category | File Name | Dimensions | Usage |
| --- | --- | --- | --- |
| Learners | `learner_pair_collab.jpg` | 1920×1280 | Testimonials carousel |
| Learners | `learner_virtual_event.jpg` | 1920×1280 | Events section |
| Providers | `provider_content_setup.jpg` | 1920×1280 | Provider dashboard hero |
| Enterprise | `enterprise_team_strategy.jpg` | 1920×1280 | Enterprise CTA block |
All photographs stored under `assets/photos/` with WebP derivatives. Each photo includes metadata JSON specifying credit and alt text.

## Icon Sets
- Primary icon collection from Phosphor. Export script generates 16px, 20px, 24px, 32px variants.
- Use filled style for primary actions, duotone for analytics modules.
- Provide sprite sheet `icons/sprite.svg` for inline use; ensure `<symbol>` IDs follow `icon-{name}-{size}` convention.

## Vector Decorations
- `gradient_mesh_01.png`: 2800×1800 background mesh used in hero.
- `grid_overlay.svg`: 16px grid pattern overlay at 6% opacity on dashboards.
- `orbital_path.svg`: Animated path line for hero; animate stroke-dashoffset 3200ms cycle.

## Accessibility Metadata
- Alt text stored in `assets/metadata/images.json` with keys matching file names.
- Provide `role="presentation"` for purely decorative vectors; include `aria-hidden="true"` to remove from accessibility tree.

## Optimisation Workflow
1. Designers export from Figma with `flatten bitmaps` disabled.
2. Run `yarn assets:optimize` (SVGO + imagemin) to compress.
3. Generate responsive image sizes (480, 768, 1024, 1440) using `sharp` pipeline.
4. Update `assets/_manifest.json` with new dimensions and checksum.
