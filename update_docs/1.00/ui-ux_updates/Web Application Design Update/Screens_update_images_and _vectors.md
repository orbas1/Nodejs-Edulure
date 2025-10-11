# Screen Imagery & Vector Requirements – Version 1.00

| Asset ID | Screen Usage | Description | Source Repository | Format | Dimensions | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| IMG-ORBIT-01 | SCR-00 Hero | 3D orbital illustration with layered gradients | `design/figma/Web_v1.00/assets/hero_orbit_v1.fig` | SVG (compressed) | 960×720px | Export with `SVGOMG` (0.4 precision), include parallax layers as separate groups |
| IMG-LOGO-STRIP | SCR-00 Proof Strip | Partner logos row | `assets/brand/partners/` | PNG @2x | 120×40px each | Use CSS mask to ensure monochrome adaptation |
| IMG-TESTIMONIAL-AVATAR | SCR-00 Testimonials | Round avatars | `assets/cms/testimonials/` | WebP | 96×96px | Apply 2px border `#4C7DFF` |
| ILL-ONBOARD-GOALS | SCR-01 Step Headers | Minimal line art for goals, skills, schedule | `design/figma/Web_v1.00/onboarding_illustrations.fig` | SVG | 160×160px | Stroke width 2px, tinted `#38BDF8` |
| IMG-WIZARD-BG | SCR-01 Background | Abstract gradient shape | `assets/backgrounds/onboarding_wave.svg` | SVG | 1200×800px | Place bottom-right with 40% opacity |
| IMG-KPI-ICONSET | SCR-02 KPI | Icon set for KPI categories | `design/iconography/linear/` | SVG sprite | 24×24px | Provide sprite sheet `kpi-icons.svg` |
| ILL-TASK-CHECK | SCR-02 Task Rail | Success illustration for zero-state | `design/figma/empty_states_v1.fig` | SVG | 320×240px | Use accent `#34D399` |
| IMG-COURSE-THUMBS | SCR-03/04/12 | Course cover images | `cdn.edulure.com/courses/` | WebP & AVIF | 640×360px | Provide 1x/2x variants, use `sizes` attribute |
| ILL-FILTER-EMPTY | SCR-03 Empty State | Filter funnel illustration | `design/figma/empty_states_v1.fig` | SVG | 360×260px | Display when zero results |
| ILL-LESSON-NOTES | SCR-05 Notes Drawer | Illustration for empty notes | `design/figma/empty_states_v1.fig` | SVG | 320×220px | Tint `#A78BFA` |
| IMG-TRANSCRIPT-ICON | SCR-05 Transcript | Icon set for transcript controls | `design/iconography/mono/` | SVG | 20×20px | Provide focus ring compatibility |
| ILL-COMMUNITY-HERO | SCR-06/07 | Abstract community rings | `design/figma/community_pack.fig` | SVG | 840×480px | Animated via CSS transform (rotate 6deg) |
| IMG-EVENT-CARD | SCR-06 | Event photography | `assets/photo/community_events/` | WebP | 480×320px | Apply gradient overlay `rgba(11,17,32,0.56)` |
| ILL-PROFILE-HERO | SCR-08 | Layered gradient shapes behind avatar | `design/figma/profile_frames.fig` | SVG | 600×320px | Clip to 16px radius mask |
| IMG-BADGES | SCR-08 | Badge icons | `assets/badges/series-alpha/` | SVG + PNG fallback | 120×120px | Provide 8 variations, accessible alt text |
| ILL-SETTINGS-SECURITY | SCR-09 Security | Shield illustration | `design/figma/settings_art.fig` | SVG | 280×220px | Display when MFA disabled |
| ILL-SUPPORT-AGENT | SCR-10 | Support hero illustration | `design/figma/support_pack.fig` | SVG | 480×320px | Use 75% opacity drop shadow |
| IMG-ANALYTICS-CHARTS | SCR-11 | Sample chart backgrounds | `analytics/figma/mock_charts.fig` | PNG (hi-res) | 640×320px | Use for skeleton state before data loads |
| IMG-ADMIN-TABLE-EMPTY | SCR-12 | Empty table illustration | `design/figma/empty_states_v1.fig` | SVG | 400×260px | Display when no courses |

## Asset Management
- Store exported assets in `frontend-reactjs/public/assets/web_v1/` mirroring IDs above.
- Optimise SVGs via SVGO script (`yarn svgo`). Ensure gradients preserved with `--multipass` flag.
- Provide design token references (colour, stroke width) in asset metadata JSON.

## Licensing & Credits
- Illustrations created in-house; no external licensing.
- Stock photography (if needed for events) sourced from Pexels; maintain attribution list in `assets/credits.md`.

## Delivery Checklist
- All assets delivered in both dark and light variants where applicable (hero, badges).
- Provide Lottie JSON alternative for hero orbit if animation required (`animations/hero_orbit_v1.lottie`).
- Document asset versioning in `design_change_log.md` when updates shipped.
