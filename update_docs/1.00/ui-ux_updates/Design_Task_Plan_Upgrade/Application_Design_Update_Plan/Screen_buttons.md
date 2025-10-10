# Screen Buttons

| Button | Label Examples | Style | Interaction | Notes |
| --- | --- | --- | --- | --- |
| Primary | Publish, Join, Resume, Save Changes | Filled gradient (#2563EB → #7C3AED), 16px radius | Elevates + glow on hover, compresses with 95% scale on press, focus ring 2px info/500 | Minimum width 48px, text sentence case. |
| Secondary | Preview, Share, Manage Access | Outline with `primary/500`, transparent fill | Border darkens on press, ripple animation 200ms | Convert to pill shape when used as filter chips. |
| Tertiary | View Details, Learn More | Text-only with underline on focus | Colour shifts to `primary/600` on press | Use for inline contextual links. |
| Destructive | Delete, Remove Member | Filled `error/500`, white text | Shake animation suppressed; rely on confirmation modal | Always paired with confirmation copy. |
| Floating Action | + Upload, + Event | Circular 56px, drop shadow, gradient fill | Expands into radial menu on long-press | Anchored to safe area bottom-right. |
| Icon Button | Search, Filter, More | 44px container with 12px padding | Ripple, tooltip on long-press | Provide accessible labels and larger hit area. |
| Chip Toggle | In review, Published, Archived | Filled `neutral/200` w/ 12px radius | Toggle animates 120ms sliding thumb | Used within status filters on PD-02. |
| Segmented Control | Provider, Analyst | 40px height segmented pill | Indicator slides with spring easing | Used for role switcher on PD-01 header. |

## Interaction Guidelines
- Support multi-state loading indicator (spinner overlay) for long tasks; disable repeated taps.
- Provide dual confirmation (toast + badge) when action triggers background processing.
- Align button labels with tone guidelines: direct verbs, no gerunds.
- Minimum target size 48×48px; ensure 8px padding inside safe areas on mobile.
- Document `aria-pressed` behaviour for toggle buttons and segmented controls for accessibility parity.

## Screen Placement Matrix
| Screen | Primary Buttons | Secondary/Tertiary | Special Controls |
| --- | --- | --- | --- |
| PD-01 Provider Dashboard | Quick action pills (Upload deck, Schedule event), CTA in Insights cards (`"View insight"`) | KPI cards tertiary links (`"See report"`), tasks `"Mark done"` | Role segmented control, support icon button |
| PD-02 Media Library | Bulk action primary (`"Publish"`, `"Move to archive"`), FAB `+ Upload` | Secondary `"Preview"`, `"Share"` on media cards | Status chip toggles, filter icon button |
| LR-01 Learner Home | Resume carousel `"Resume"` primary, event strip `"Join live"` | Tertiary `"View community"` links | Support CTA pill, streak chip (tap reveals details) |
| LR-02 Media Viewer | Transport control primary (`"Play"`, `"Pause"`), note panel `"Save"` | Tertiary `"View transcript"` | Annotation rail icon buttons, discussion toggle |
