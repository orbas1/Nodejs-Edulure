# Screens — Images & Vector Assets Plan

## Asset Strategy
- Store assets in `/design_assets/mobile/v1/` with subfolders `images/`, `illustrations/`, `icons/`, `lottie/`.
- Provide exports at 1x, 2x, 3x densities for raster; maintain vector masters in SVG.

## Screen-by-Screen Requirements
| Screen | Asset Type | File Name | Source | Notes |
| --- | --- | --- | --- | --- |
| Onboarding | Illustration | `onboarding_collab.svg` | Internal illustration library | Features three learners collaborating; 320 × 240 dp safe area.
| Home Hero | Image | `hero_instructor.webp` | Unsplash (photo by Christina @ wocintechchat.com) | Apply colour grading LUT to match brand; alt text “Instructor leading hybrid workshop”.
| Home Focus Card | Lottie | `resume_pulse.json` | LottieFiles (custom) | 1.6 s pulse animation on CTA icon.
| Learn Featured | Image | `course_ai_ethics.webp` | Unsplash (Clay Banks) | Crop to 16:9.
| Lesson Player | Icon set | `player_controls.svg` | Custom | Contains play, pause, captions, speed icons as symbol set.
| Community Empty State | Illustration | `community_empty.svg` | Internal | Depicts chat bubbles; tinted `secondary/500`.
| Community Post | Avatar placeholders | `avatar_default_{1-8}.svg` | Internal | 48 dp circle, gradient backgrounds.
| Library Offline Banner | Illustration | `offline_download.svg` | Storyset by Freepik (license CC BY 3.0) | Must include attribution in app credits.
| Profile Stats | Icon | `icon_badge_star.svg` | Feather modified | 24 dp.
| Settings Support | Illustration | `support_chat.svg` | Popsy illustrations | 240 × 160 dp.
| Provider Dashboard | Chart BG | `chart_grid.svg` | Custom | Transparent grid overlay for analytics cards.
| Upload Wizard | Lottie | `upload_progress.json` | Custom animation | Shows file uploading; uses accent colours.
| Notifications Empty | Illustration | `notifications_empty.svg` | Internal | Bell with confetti.
| Error States | Illustration | `error_state.svg` | Humaaans library | Provide dark/light variants.

## Iconography Guidelines
- Use outline weight 1.5 dp, round joins.
- Provide themeable stroke colour tokens referencing `primary`, `neutral`.
- For filled icons (premium), use gradient `linear(135°, #7C3AED, #22D3EE)` clipped to shape.

## Image Treatment
- Apply consistent overlay gradient `rgba(15, 23, 42, 0.35)` bottom 40% for readability.
- Use blur hash placeholders for progressive loading (store in JSON `blurHash` field).
- Provide metadata for alt text and copyright in `assets_manifest.json`.

## Animation Performance
- Limit Lottie frame rate to 45 fps, vector-only shapes.
- Provide static fallback PNG for platforms without Lottie support.
- Document trigger logic (e.g., `resume_pulse` loops while course incomplete, stops on completion).

## Asset Governance
- Maintain version control via Git LFS for files > 5 MB.
- Record updates in `design_change_log.md` with asset ID.
- Provide QA checklist ensuring colour profile sRGB and compression WebP 80% quality.
