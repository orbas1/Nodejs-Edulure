# Provider Application Styling Changes (v1.50)

## Typography
- Adopted **Inter Variable** with weight range 300–700. Headings use uppercase letter-spacing (0.8px) for dashboard metrics; body text 16px/24px baseline.
- Introduced typography tokens: `display-lg`, `display-md`, `heading-lg`, `heading-md`, `heading-sm`, `body-lg`, `body-md`, `body-sm`, `label`, `mono` (for code snippets in integrations tab).
- Implemented responsive scaling: mobile headings drop by one level (e.g., `heading-lg` → `heading-md`), ensuring readability without crowding.

## Color Palette
- Primary palette: Indigo (`#4C3FE3`), secondary Sapphire (`#1D4ED8`), accent Coral (`#FF7A70`) for alerts, success Emerald (`#10B981`), warning Amber (`#F59E0B`), error Crimson (`#DC2626`).
- Neutral stack for dark backgrounds: `Base-950`, `Surface-900`, `Surface-800`, `Stroke-700`, `Muted-600`, `Muted-500`.
- Background gradients introduced on hero modules (Indigo 600 → Indigo 400). Buttons use accessible contrast thresholds.
- Chart colors adhere to 8-color categorical palette with 60% saturation to avoid glare on dark surfaces.

## Layout & Spacing
- Adopted 12-column grid for tablet/desktop with 24px gutters. Mobile uses 4-column grid with 16px padding.
- Section spacing increased to 48px top/bottom to provide breathing room on data-dense screens.
- Cards maintain 16px internal padding, 24px separation. Sticky panels use 32px padding to differentiate from scrollable content.

## Component Styling
### Cards
- Elevation tokens: `card/base` (shadow 0 1px 3px rgba(15,23,42,0.24)), `card/hover` (0 12px 24px rgba(15,23,42,0.22)).
- Headers use body-sm uppercase label with letter spacing; supporting text uses body-md with muted color.
- Status chips integrated with consistent pill styling (radius 999px, 12px vertical padding, weight 600 text).

### Buttons
- Primary button: Indigo 600 background, Indigo 300 hover, Indigo 700 pressed, white text. Focus ring 3px Indigo 200 with 4px offset.
- Secondary outline: Transparent fill, border `1.5px` Indigo 500, text Indigo 200; hover fills with Indigo 900 at 6% opacity.
- Icon-only buttons adopt circular shape, 48px diameter, subtle shadow on hover.

### Forms & Inputs
- Inputs use dark theme base (#0F172A) with subtle border (#334155). Focus state uses glow (#6366F1) + 1px inner border.
- Labels body-sm uppercase, helper text body-sm muted (#CBD5F5). Error state border (#F87171) with icon prefix.
- Checkbox and radio controls have 20px dimensions, 2px border; filled states use gradient (Indigo 500 to Indigo 400).

### Tables
- Header row uses uppercase label, background #111827, bottom border #1F2937. Rows alternate background (#0F172A / #111827) for readability.
- Row hover applies subtle highlight (#1E293B) and drop shadow 0 4px 12px rgba(15,23,42,0.25).
- Selected rows show left accent bar (#6366F1) 4px width.

### Tutor Directory & Detail
- Tutor cards use 12px radius, gradient outline (#4338CA→#6366F1), and avatar with 4px border glow. Availability chips color-coded (#16A34A available, #F59E0B limited, #DC2626 unavailable).
- Detail headers adopt hero gradient background with accreditation badge row; earnings summary uses dual-tone typography (display-sm for totals, body-sm muted for labels).
- Action drawer buttons stacked with 12px spacing, gradient fill for primary actions, outline for destructive (Deactivate) with crimson border.
- Compliance checklist uses stepper with icon badges; completed steps tinted Emerald gradient with check glyph.

### Creation Studio
- Entry tiles adopt glassmorphism (background rgba(67,56,202,0.14) with blur 16px) and luminous icon overlays; progress badge positioned top-right using coral accent.
- Draft list rows use zebra striping, left accent bar representing asset type (Course Indigo, Ebook Violet, Live Session Sapphire, Community Teal).
- Template library carousel cards 16px radius with drop shadow and hover scale 1.02; "Apply" button gradient fill.
- Resource drawer background #0C1224 with subtle grid texture; cards inside use outline style with neon edge.

### Course & Ebook Dashboards
- Tab headers uppercase label with underline gradient; active tab includes glow effect.
- Metric chips use pill shape, gradient fill (#4338CA→#7C3AED), white text, and icon left.
- Automation rule cards adopt dark surface (#111827) with icon badge, toggle switch gradient, and code block styling for preview of rule logic.
- Analytics strip charts tinted duotone with translucent overlays; export icons minimal line style.

### Community Oversight
- Community builder steps display numbered badges with gradient fill; preview pane uses card frames with drop shadow to simulate feed layout.
- Member table role badges tinted (Admin Indigo, Moderator Teal, Member Slate) with uppercase text.
- Moderation queue cards include severity flag color-coded (#F59E0B warning, #DC2626 critical) and timeline accent bar.
- Community switcher dropdown uses glass effect with banner thumbnails and unread count pill.

### Finance & Wallet
- Wallet overview card gradient (#0EA5E9→#38BDF8) with large tabular figures and subtle animated shimmer.
- Ledger table uses monospace columns for currency, alternating row highlight (#10263B) and sticky header with drop shadow.
- Invoice center modals feature card layout with callout for due amount; reminder button uses coral gradient.
- Promo management chips use outline style with accent glow when active; schedule timeline uses dashed connectors.

### Charts
- Toolkit uses gradients for area charts (Indigo to Transparent). Line charts have 2.5px stroke, 8px data points.
- Tooltip styling: dark panel with 14px text, 12px padding, border radius 12px, shadow 0 12px 24px rgba(15,23,42,0.32).

## Iconography & Illustrations
- Icons updated to duotone style with 1.5px stroke, 16/20/24px sizes. Selected icons tinted Indigo 400 fill + Indigo 200 stroke.
- Illustration set features mentor and learner characters with dark backgrounds; used on empty states, onboarding slides, and support screens.

## Motion & Microinteractions
- Animation timing standardized: entrance 180ms, exit 150ms, easing `cubic-bezier(0.22, 1, 0.36, 1)`.
- Hover effects use 8px upward translate with fade for cards; button hover uses color shift only (no scale to prevent jitter).
- Skeleton loaders have shimmer animation (1200ms linear) with gradient overlays (#1E293B → #0F172A).

## Accessibility Adjustments
- Contrast ratios verified with Stark plugin; minimum 4.5:1 on text, 3:1 on large display text.
- Added "reduce motion" preference detection; disables shimmer, transitions, and parallax backgrounds when enabled.
- Form control focus states include shape + color change and text announcement for screen readers.

## Dark Mode Specifics
- Provider app defaults to dark theme; light theme option uses same tokens with inverted neutrals.
- Charts adapt backgrounds to avoid glare; gridlines lighten to #273449.
- Overlays and modals use blur effect (12px) with transparent white overlay for depth.

## Responsive Behavior
- Breakpoints: 360, 768, 1024, 1280, 1440. Components reflow accordingly.
- Navigation collapses to hamburger on <1024px; bottom sheet patterns introduced for modals on mobile.
- KPI cards stack vertically on mobile, maintain horizontal layout on tablet+.

## Brand Alignment
- Applied updated logotype with monochrome variant on dark backgrounds.
- Introduced gradient accent line (Indigo 500 to Violet 400) under headings to reinforce brand vibrancy.
- Added background texture (subtle grid) on marketing surfaces, removed in core workflows to reduce noise.

## Asset Specifications
- Icon exports at 1x/2x/3x. Lottie animations trimmed to <800KB. Illustration backgrounds exported as SVG with fallback PNG.
- Documented color token mapping to CSS variables and Flutter theme JSON.

## Future Styling Backlog
- Evaluate high-contrast theme toggle for accessibility compliance.
- Expand animation library for analytics insights (enter transitions) once performance budgets validated.
