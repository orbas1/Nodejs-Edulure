# Screen Buttons

| Button | Label Examples | Style | Interaction | Notes |
| --- | --- | --- | --- | --- |
| Primary | Publish, Join, Resume, Save Changes | Filled gradient (#2563EB → #7C3AED), 16px radius | Elevates + glow on hover, compresses with 95% scale on press, focus ring 2px info/500 | Minimum width 48px, text sentence case. |
| Secondary | Preview, Share, Manage Access | Outline with `primary/500`, transparent fill | Border darkens on press, ripple animation 200ms | Convert to pill shape when used as filter chips. |
| Tertiary | View Details, Learn More | Text-only with underline on focus | Colour shifts to `primary/600` on press | Use for inline contextual links. |
| Destructive | Delete, Remove Member | Filled `error/500`, white text | Shake animation suppressed; rely on confirmation modal | Always paired with confirmation copy. |
| Floating Action | + Upload, + Event | Circular 56px, drop shadow, gradient fill | Expands into radial menu on long-press | Anchored to safe area bottom-right. |
| Icon Button | Search, Filter, More | 44px container with 12px padding | Ripple, tooltip on long-press | Provide accessible labels and larger hit area. |

## Interaction Guidelines
- Support multi-state loading indicator (spinner overlay) for long tasks; disable repeated taps.
- Provide dual confirmation (toast + badge) when action triggers background processing.
- Align button labels with tone guidelines: direct verbs, no gerunds.
