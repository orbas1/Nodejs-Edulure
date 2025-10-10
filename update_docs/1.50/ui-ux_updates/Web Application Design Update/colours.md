# Colour Palette Specification

| Token | Hex | Usage |
| --- | --- | --- |
| `--surface-page` | `#0B1120` | Primary background, global shells |
| `--surface-card` | `#111C3B` | Cards, drawers, and modals |
| `--surface-alt` | `rgba(15, 23, 42, 0.75)` | Overlays, hover states |
| `--border-soft` | `rgba(148, 163, 184, 0.24)` | Card outlines, dividers |
| `--accent-electric` | `#4C7DFF` | Primary CTAs, active tabs |
| `--accent-lilac` | `#A78BFA` | Secondary highlights, progress bars |
| `--accent-sun` | `#F59E0B` | Warnings, announcement badges |
| `--accent-mint` | `#34D399` | Success toasts, completion badges |
| `--accent-crimson` | `#F87171` | Errors, destructive actions |
| `--accent-sky` | `#38BDF8` | Informational states, tooltips |
| `--text-primary` | `#F8FAFC` | Primary copy |
| `--text-secondary` | `#CBD5F5` | Supporting text |
| `--text-inverse` | `#0F172A` | Text on light surfaces |
| `--chart-blue` | `#3B82F6` | Dashboards: revenue & engagement lines |
| `--chart-purple` | `#8B5CF6` | Community metrics |
| `--chart-green` | `#22C55E` | Completion metrics |
| `--chart-amber` | `#F59E0B` | Drop-off or risk indicators |

## Gradients & Backgrounds
- **Hero Gradient:** `linear-gradient(135deg, #4C7DFF 0%, #A78BFA 45%, #F59E0B 100%)` used for marketing hero blocks.
- **Card Hover:** `linear-gradient(180deg, rgba(76, 125, 255, 0.08), rgba(76, 125, 255, 0))` for interactive feedback.
- **Chart Area Fill:** Use accent with 16% opacity for area under curves.

## Light Theme Adjustments
- Swap surfaces to `#FFFFFF`, `#F8FAFF`, maintain accent values.
- Update text tokens: `--text-primary: #0F172A`, `--text-secondary: #475569`.
- Increase border visibility to `rgba(15, 23, 42, 0.08)`.
