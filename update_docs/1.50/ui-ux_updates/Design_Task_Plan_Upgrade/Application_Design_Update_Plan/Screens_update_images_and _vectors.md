# Images & Vector Assets Plan – Application Design Update v1.50

## Asset Inventory
- **Hero Illustrations:** 8 new scenes (learner focus, provider dashboard, community, success celebration). Export in SVG + PNG fallback.
- **Avatars:** 40 learner avatars, 20 mentor avatars with inclusive representation. Provided as PNG @2x/@3x.
- **Badges:** 16 achievement badges redesigned with gradient fills, exported as SVG with PNG fallback.
- **Icons:** Duotone icon set 120 glyphs sized 24/32/48px.
- **Background Textures:** Subtle gradient overlays for onboarding and profile screens.

## Usage Guidelines
- Maintain consistent illustration style (soft gradients, rounded shapes). Avoid mixing with legacy flat illustrations.
- Use alt text describing purpose ("Illustration of learners collaborating") not purely decorative details.
- Optimize file sizes (<200KB for SVG, <400KB for PNG) to maintain performance.

## Delivery & Organization
- Store assets in `/update_docs/1.50/assets/app/` grouped by type (`heroes`, `avatars`, `badges`, `icons`).
- Naming convention: `context_variant_theme.ext` (e.g., `hero_cohort_collaboration_dark.svg`).
- Provide asset manifest (JSON) with metadata (usage location, alt text suggestions, licensing info).

## Responsive Considerations
- Provide 1x/2x/3x raster exports for mobile. Ensure hero illustrations scale up to tablet without pixelation.
- Support dark/light variants where necessary (e.g., hero backgrounds, icons).

## Accessibility & Localization
- Ensure text within images converted to live text to support translation and screen readers.
- Provide mirrored variants for RTL languages if illustration direction impacts comprehension.

## QA Checklist
- Verify assets load correctly on low-bandwidth connections (progressive loading).
- Test color contrast in dark mode backgrounds.
- Confirm alt text present and accurate.
