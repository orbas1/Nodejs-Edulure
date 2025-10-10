# Version 1.00 Provider Application Styling Changes

## Typography System
- **Display/Headers:** Inter Display 700 for page titles (32px desktop, 28px tablet, 24px mobile). Secondary headers use Inter 600 with responsive scaling and 1.3 line-height.
- **Body Copy:** Inter 400/500 at 16px base, scaling to 15px on compact layouts. Extended descriptive text (support articles) at 15px with 1.7 line-height for readability against dark surfaces.
- **UI Labels:** Inter 600 at 12px uppercase for navigation rail, badge labels, and stepper titles.
- **Numeric Data:** Tabular numbers use Inter Tight 600 to maintain alignment in analytics tables.
- **Code & Logs:** JetBrains Mono 500 for signed URL, API keys, and audit log payloads.

## Colour Palette & Tokens
| Token | Hex | Usage |
| --- | --- | --- |
| `provider.bg.canvas` | #0F172A | Primary dashboard background, enabling contrast for cards and charts. |
| `provider.bg.surface` | #1E293B | Cards, drawers, accordions, modal surfaces. |
| `provider.bg.elevated` | #273449 | Hover/active surfaces, popovers, dropdowns. |
| `provider.text.primary` | #F8FAFC | Primary text on dark backgrounds. |
| `provider.text.secondary` | #CBD5F5 | Secondary copy, helper text. |
| `provider.accent.primary` | #4B5DFF | Primary buttons, focus outline, key icons. |
| `provider.accent.secondary` | #5AC8FA | Secondary CTAs, charts overlays. |
| `provider.feedback.success` | #22C55E | Success toasts, status pills, positive deltas. |
| `provider.feedback.warning` | #F59E0B | Storage warnings, moderation alerts. |
| `provider.feedback.error` | #F43F5E | Error states, destructive confirmations. |
| `provider.feedback.info` | #38BDF8 | Tooltips, info banners. |
| `provider.border.default` | rgba(148, 163, 184, 0.24) | Divider lines, table borders. |
| `provider.shadow` | rgba(15, 23, 42, 0.45) | Card elevation shadow. |

## Component Styling
- **Buttons:** Rounded 8px corners with 4px internal padding increments. Primary buttons use solid `provider.accent.primary`, secondary buttons use outlined style with 1px `provider.accent.secondary` border. Loading state displays animated dot trio aligned left of label.
- **Inputs & Selects:** Filled style with translucent background (`rgba(248, 250, 252, 0.06)`) and 1px border. Focus state uses 2px `provider.accent.primary` outline and subtle glow. Error state overlays `provider.feedback.error` border and inline helper text.
- **Cards & Panels:** Base elevation `0 12px 32px rgba(15, 23, 42, 0.45)` with 12px radius. Hover transitions lighten background to `provider.bg.elevated` over 180ms. Each card includes 16px padding (24px on analytics panels).
- **Tables:** Header row uses uppercase 12px labels with `provider.text.secondary`. Zebra striping uses `rgba(148, 163, 184, 0.08)`. Row hover intensifies background to `rgba(148, 163, 184, 0.16)`.
- **Tabs:** Underline indicator 3px using `provider.accent.primary`. Inactive tabs have `provider.text.secondary` colour and lighten on hover.
- **Stepper:** Horizontal, background pill with segmented fill. Completed steps use `provider.accent.primary`; upcoming steps greyed out (#4C5772). Icons 20px with 6px padding.
- **Charts:** Spark-lines use gradient (#4B5DFF → transparent). Bar charts include rounded caps and white axis lines at 1px. Tooltips use semi-transparent dark surface (#111826) with drop shadow.
- **Badges & Chips:** 999px radius for pill shape, uppercase label, 8px horizontal padding. Status colours map to feedback tokens.
- **Drawers & Modals:** 360px width on desktop, full-height on mobile. Top bar includes drag handle for mobile. Footer actions remain sticky with subtle top shadow.
- **Notification Drawer:** Background `#121D33`, list items separated by 1px border. Unread indicator is 4px accent bar on left edge.

## Iconography & Illustration
- Icons from Phosphor set with stroke weight 1.5. Primary icons tinted `provider.accent.primary`; secondary icons use `#94A3B8`.
- Empty states include monochrome line illustrations tinted `provider.accent.secondary` at 60% opacity with supportive copy.

## Spacing & Layout Rules
- **Spacing scale:** 4px base unit; standard gaps 8/12/16/24/32. Dashboard main content uses 32px padding desktop, 20px tablet, 16px mobile.
- **Section headers:** 24px top padding, 12px bottom margin before content.
- **Form groups:** 24px vertical spacing, 16px between related fields. Divider lines spaced 32px apart.

## Interaction & Motion
- **Transitions:** Buttons 120ms ease-out; cards 180ms; modals 220ms slide-up. Motion respects reduced-motion preferences by switching to fade.
- **Feedback:** Toast notifications appear bottom-right, 40px width cards with subtle slide-in. Success toasts auto-dismiss after 4s, errors persist until closed.
- **Drag & Drop:** Course builder uses shadow + slight rotation (1°) when dragging to convey movement.

## Accessibility Considerations
- Ensure 4.5:1 contrast ratio for all primary text on surfaces; tested combination `#F8FAFC` on `#1E293B` meets 9.14:1.
- Focus outlines extend beyond rounded corners by 2px to remain visible.
- High-contrast mode flips backgrounds to light theme; tokens map to fallback palette (`#F8FAFC` surfaces, `#1E293B` text).
- Error messaging includes icon + descriptive text, with aria-live region for screen readers.

## Responsive & Theme Variants
- Tablet view reduces card padding to 20px, compresses typography scale by 1 step.
- Mobile view uses light theme variant (`#F8FAFC` background, `#1E293B` text) for readability outdoors; accent colours remain consistent.
- Dark/light theme toggle persists preference via local storage and server profile flag.
