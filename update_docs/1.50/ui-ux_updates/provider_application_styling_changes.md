# Provider Application Styling Changes

## Typography
- **Heading:** Inter Display, weights 600/700, sizes scaling from 32px (desktop) to 24px (mobile).
- **Body:** Inter, 400/500 weights, 16px base with 1.6 line-height to improve readability in analytics tables.
- **Mono:** JetBrains Mono for code snippets and signed URL previews within audit logs.

## Colour Palette
| Token | Hex | Usage |
| --- | --- | --- |
| `provider.primary` | #4B5DFF | Primary actions (publish, create event) aligning with brand accent. |
| `provider.secondary` | #5AC8FA | Secondary CTAs (preview, schedule). |
| `provider.background` | #0F172A | Dashboard background to frame analytics modules in dark navy. |
| `provider.surface` | #1E293B | Cards, drawers, and accordions. |
| `provider.success` | #22C55E | Conversion success states in funnels. |
| `provider.warning` | #F59E0B | Storage thresholds, moderation alerts. |
| `provider.error` | #F43F5E | DRM violation warnings and failed uploads. |

## Layout & Components
- **Card Elevation:** 4dp base with 12dp hover/active transitions using subtle scale + shadow; ensures tactile feedback.
- **Drawer Width:** 360px on desktop, full-width sheet on mobile with sticky action buttons.
- **Stepper Styling:** Horizontal with labeled steps and progress bar; transitions use 250ms ease-in-out.
- **Data Visualisation:** Spark-lines adopt gradient fills (#4B5DFF → transparent) with accessible contrast on dark background.
- **Badges:** Rounded pill with uppercase labels for roles (Owner, Moderator) and statuses (Live, Draft).

## Accessibility & Responsiveness
- Support high-contrast theme by inverting surfaces (#F8FAFC) while keeping accent tokens accessible.
- Minimum touch target 48px; stepper icons enlarge to 56px on mobile for easier tapping.
- Focus rings 2px using `provider.primary` with 50% opacity outer glow.
- Animations adhere to reduced motion preference by disabling card hover scale and replacing with opacity fade.
