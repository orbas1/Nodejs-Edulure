# Screen Images and Vectors Updates

## Illustration Direction
- Replace stock photography with brand-consistent 3D illustrations emphasising collaboration, cloud infrastructure, and progress.
- Provide day and night variants to support light/dark modes.
- Ensure characters represent diverse backgrounds, abilities, and roles.
- Commission screen-specific hero pieces:
  - **PD-01 Hero (ILL-PD01):** Team reviewing analytics hologram; used in empty state of Insights Feed.
  - **PD-02 Hero (ILL-PD02):** Creator uploading multimedia stack; appears in Upload Flow success sheet.
  - **LR-01 Hero (ILL-LR01):** Learner celebrating streak with confetti; placed in empty state of Community Highlights.
  - **LR-02 Hero (ILL-LR02):** Immersive listening scene with ambient lighting; displayed on offline download screen.

## Iconography
- Introduce icon set for media types (slides, ebooks, video, audio) derived from Feather icons with adjusted 2px stroke.
- Create state-specific icons for conversion, sync, and moderation to improve scanability.
- Supply Lottie animations for success, warning, and loading states under 600kb.
- Map icon usage to widgets:
  - **W-ACT-010** uses outlined 24px icons with gradient mask.
  - **W-MED-020** overlays 16px media-type badge at top-left.
  - **W-SOC-030** includes severity indicator icon (shield, flag, bell) swapping by `severity` prop.

## Asset Delivery
- Provide export guidelines: SVG for vector UI, PNG @2x/@3x for raster assets, WebP for hero illustrations.
- Document naming conventions and slicing coordinates for engineering handoff.
- Include skeleton placeholder illustrations for loading states to maintain visual rhythm.
- Deliver component-specific asset packs:
  - **Toolbar Icons Pack (ICO-TOPBAR)** with 32px artboards for navigation header.
  - **Annotation Toolset (ICO-ANNOT)** containing pen, highlighter, comment, laser pointer.
  - **Community Reaction Pack (ICO-REACTION)** featuring emoji glyphs optimised for 1.5× scale.
  - **Empty State Set (ILL-EMPTY)** covering tasks, media library, events, and messages.

## Accessibility & Performance
- Ensure alt text recommendations accompany every illustration.
- Optimise vector paths to reduce render cost on low-end devices.
- Provide fallback monochrome icons for high-contrast mode.
- Export annotation icons with hit area outlines to assist engineers with minimum touch target (44px) implementation.
- Include JSON metadata referencing animation playback duration and loop behaviour for Lottie assets.
