# Button System – Web Application v1.00

## Global Principles
- Minimum hit area: 44×44px on mobile, 40×40px on desktop.
- Typography: Label uses `Inter SemiBold` 16px/24px for primary & secondary, `Inter Medium` 14px/20px for tertiary/icon-only.
- Icon placement: 8px gap between icon and text, icons sized 20px.
- Corner radius: 16px for pill buttons, 12px for rectangular buttons.
- Shadow: `0 18px 40px rgba(76, 125, 255, 0.24)` on focus/hover for primary.

## Variants & Tokens
| Variant | Background | Border | Text/Icon | Hover | Active | Disabled |
| --- | --- | --- | --- | --- | --- | --- |
| Primary | `linear-gradient(120deg, #4C7DFF 0%, #A78BFA 100%)` | none | `#0B1120` | Increase brightness +12%, apply glow `0 0 0 2px rgba(76,125,255,0.32)` | Darken by 8%, inset shadow `0 4px 0 rgba(11,17,32,0.32)` | `#243047` bg, text `rgba(203,213,245,0.56)` |
| Secondary | `rgba(76,125,255,0.12)` | `1px solid rgba(148,163,184,0.32)` | `#F8FAFC` | Background `rgba(76,125,255,0.2)` | Background `rgba(76,125,255,0.32)` | Border `rgba(148,163,184,0.16)`, text `rgba(203,213,245,0.48)` |
| Tertiary | transparent | none | `#A78BFA` | Underline 2px `#A78BFA` | Text `#7C5DDB` | Text `rgba(167,139,250,0.48)` |
| Destructive | `#F87171` | none | `#0B1120` | Darken 6% | Darken 12% | `#4B2D2D` |
| Ghost | transparent | `1px solid rgba(148,163,184,0.24)` | `#F8FAFC` | Border `rgba(148,163,184,0.4)` | Border `rgba(148,163,184,0.56)` | Border `rgba(148,163,184,0.12)` |
| Icon-only | `rgba(15, 23, 42, 0.64)` | none | `#F8FAFC` | Background lighten 8% | Background lighten 16% | Background `rgba(15,23,42,0.24)` |

## Sizes
| Size | Height | Horizontal Padding | Label Size | Use Case |
| --- | --- | --- | --- | --- |
| Large | 56px | 32px | 16px/24px | Hero CTAs, major forms |
| Medium | 48px | 24px | 16px/24px | Default across application |
| Small | 40px | 16px | 14px/20px | Dense tables, filter chips |
| Compact Icon | 36px | 12px | 0 (icon only) | Toolbars, quick actions |

## States & Motion
- Hover: 120ms `ease-out` fade between states.
- Focus: 2px outline `#38BDF8` offset by 4px.
- Pressed: Downward translateY 2px to simulate depth.
- Loading: Replace label with spinner (20px) from `/assets/icons/spinner.svg`, maintain width to avoid reflow.

## Special Buttons
- **Quick Create FAB:** 64px diameter circular button anchored bottom-right on mobile dashboards; gradient background from primary token, drop shadow `0 24px 48px rgba(76,125,255,0.32)`. Expands into radial menu with 3 child actions spaced 72px apart.
- **Inline CTA Links:** Underlined text with 2px gap to trailing arrow icon, colour `#38BDF8`.

## Accessibility
- Provide `aria-pressed` for toggle buttons.
- Use descriptive labels for icon-only buttons (e.g., `aria-label="Open notifications"`).
- Ensure disabled state is programmatically disabled to prevent focus.
