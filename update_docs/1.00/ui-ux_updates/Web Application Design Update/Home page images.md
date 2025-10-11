# Home Page Imagery Plan – Web Application v1.00

## Asset Inventory
| Zone | Asset ID | File Name | Dimensions | Format | Repo Source | Layering Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Hero | IMG-HERO-ORBIT | `hero_orbit_v1.svg` | 1440×960 | SVG | `design/figma/Web_v1.00/assets/hero_orbit_v1.fig` | Positioned columns 7–12, Z-index 2 with 12px Gaussian blur glow layer |
| Hero | IMG-HERO-GLOW | `hero_glow_mesh.png` | 1800×1400 | PNG (WebP alt) | `assets/patterns/gradient_mesh_01.png` | Placed absolutely behind orbit at 8% opacity, blend mode `screen` |
| Value Pillars | ICON-PILLAR-LEARN | `icon-learning.svg` | 32×32 | SVG | `design/iconography/pillars/` | Vector gradient stops 0% `#4C7DFF`, 100% `#A78BFA`, drop shadow `0 8px 16px rgba(76,125,255,0.24)` |
| Value Pillars | ICON-PILLAR-COMMUNITY | `icon-community.svg` | 32×32 | SVG | Same as above | Mirror transform 180° to align handshake motif |
| Value Pillars | ICON-PILLAR-MENTOR | `icon-mentor.svg` | 32×32 | SVG | Same as above | Add accent dot `#38BDF8` radius 4px for micro-animation |
| Featured Tracks | THUMB-TRACK-* | e.g., `track_ai_masterclass.webp` | 640×360 | WebP + AVIF | `cdn.edulure.com/courses/featured/` | Apply overlay gradient `linear-gradient(180deg, rgba(11,17,32,0) 0%, rgba(11,17,32,0.72) 100%)` |
| Community Snapshot | ILL-COMMUNITY-RING | `community_scene_v1.svg` | 1280×880 | SVG | `design/figma/community_pack.fig` | Set opacity 0.12, anchored bottom-left, responsive scale 0.72–1.0 |
| Testimonials | AVA-LEARNER-* | `learner_{name}.webp` | 96×96 | WebP | `assets/photos/learners/` | Crop with 20px corner radius mask, add border `2px solid #4C7DFF` |
| CTA Band | DEC-CTA-ORBITAL | `orbital_path.svg` | 960×480 | SVG | `design/figma/Web_v1.00/decorations.fig` | Absolutely positioned top-left -80px, stroke `#38BDF8`, animate dash 3.2s |
| Footer Logos | LOGO-PARTNER-* | `partner_{brand}.svg` | 120×40 | SVG/PNG | `assets/brand/partners/` | Convert to monochrome `#CBD5F5` using CSS mask for dark theme |

## Responsive Art Direction
- **Hero Orbit Scaling:** At SM, constrain orbit width to 420px and shift to columns 5–12; at XS replace with static PNG fallback `hero_orbit_v1_sm.png` (720×540) for performance.
- **Thumbnail Density:** Serve `srcset` variants for tracks (320w, 480w, 640w) with `sizes="(min-width: 1024px) 320px, (min-width: 768px) 50vw, 90vw"` to avoid over-downloading on mobile.
- **Background Watermarks:** `community_scene_v1.svg` disables on XS to keep metrics legible; fallback to subtle border bottom `rgba(148,163,184,0.16)`.

## Accessibility & Metadata
- Provide descriptive alt text stored in `assets/metadata/home.json`. Example: `"IMG-HERO-ORBIT": "Illustration of interconnected learning planets representing Edulure's learning orbit"`.
- Testimonials include `aria-describedby` linking avatar to quote block for context; ensure `role="figure"` with caption text for screen readers.
- For decorative assets (orbital path, glow mesh), set `aria-hidden="true"` and `focusable="false"` to keep keyboard navigation clean.

## Implementation Notes
- Manage hero layers using CSS custom properties: `--hero-orbit-translate` controls parallax offset; update values via `requestAnimationFrame` for smoothness.
- All imagery references versioned filenames; update `assets/_manifest.json` after export and log in `design_change_log.md`.
- Maintain 16px spacing between images and adjacent text to respect baseline rhythm; apply `margin-block-start: 24px` to testimonial avatars for vertical balance.
