# Colour Palette Specification – Version 1.00

## Core Palette
| Token | Hex | WCAG Contrast (on `#0B1120`) | Usage |
| --- | --- | --- | --- |
| `--surface-page` | `#0B1120` | – | Primary background, header, sidebar |
| `--surface-card` | `#111C3B` | 1.05:1 | Cards, modals, drawers |
| `--surface-alt` | `rgba(15,23,42,0.75)` | – | Hover overlays, gradients |
| `--border-soft` | `rgba(148,163,184,0.24)` | – | Dividers, card outlines |
| `--accent-electric` | `#4C7DFF` | 5.24:1 | Primary buttons, active links |
| `--accent-lilac` | `#A78BFA` | 3.89:1 | Secondary actions, highlights |
| `--accent-sun` | `#F59E0B` | 4.37:1 | Alerts, onboarding callouts |
| `--accent-mint` | `#34D399` | 4.62:1 | Success states |
| `--accent-crimson` | `#F87171` | 4.02:1 | Errors, destructive confirmations |
| `--accent-sky` | `#38BDF8` | 5.84:1 | Info tooltips, focus outlines |
| `--text-primary` | `#F8FAFC` | 11.43:1 | Body copy |
| `--text-secondary` | `#CBD5F5` | 5.23:1 | Supporting text |
| `--text-muted` | `#94A3B8` | 3.89:1 | Metadata |
| `--text-inverse` | `#0F172A` | 11.81:1 | Text on light surfaces |

## Supporting Palette
- **Neutrals:** `#1E293B`, `#2E3A59`, `#3B4B74` for backgrounds and disabled states.
- **Gradients:**
  - Primary CTA: `linear-gradient(118deg, #4C7DFF 0%, #7C5DDB 52%, #A78BFA 100%)`.
  - Hero Background: `radial-gradient(circle at 20% 30%, rgba(76,125,255,0.48) 0%, rgba(11,17,32,0) 55%), linear-gradient(135deg, #0B1120 0%, #111C3B 60%, #1F2C4F 100%)`.
  - Analytics Highlight: `linear-gradient(90deg, rgba(56,189,248,0.32), rgba(76,125,255,0))`.

## State Colours
| State | Background | Border | Text |
| --- | --- | --- | --- |
| Success | `rgba(52,211,153,0.16)` | `rgba(52,211,153,0.4)` | `#34D399` |
| Warning | `rgba(245,158,11,0.18)` | `rgba(245,158,11,0.48)` | `#F59E0B` |
| Error | `rgba(248,113,113,0.2)` | `rgba(248,113,113,0.48)` | `#F87171` |
| Info | `rgba(56,189,248,0.18)` | `rgba(56,189,248,0.48)` | `#38BDF8` |

## Light Theme Adjustments
| Token | Light Value |
| --- | --- |
| `--surface-page` | `#FFFFFF` |
| `--surface-card` | `#F8FAFF` |
| `--border-soft` | `rgba(15,23,42,0.08)` |
| `--text-primary` | `#0F172A` |
| `--text-secondary` | `#475569` |
| `--shadow-elevated` | `0 24px 48px rgba(15,23,42,0.12)` |

## Application Notes
- Maintain minimum contrast ratio 4.5:1 for text elements; verify via Stark plugin.
- Use accent colours sparingly to highlight interactive elements; never combine more than two accents in a single component to avoid colour noise.
- For gradients involving transparent stops, ensure background surfaces match `--surface-page` to avoid banding.
- Document palette usage per component in Storybook to enforce consistency.

## Screen Mapping
- Map tokens per screen using `Screen_update_Screen_colours.md` ensuring CSS variables align (`--color-screen-scr00-hero-bg`, etc.).
- Provide fallback solid colours for browsers lacking gradient support (IE mode) using `background-color` before gradient.

## Testing
- Validate colour combinations per screen via Figma plugin "Contrast" and document pass results in QA sheets.
- Use Percy visual regression to catch gradient shifts when tokens update.
