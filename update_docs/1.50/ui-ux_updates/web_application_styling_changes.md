# Web Application Styling Changes (v1.50)

## Typography System
- Primary font stack: `"Inter", "Segoe UI", "Helvetica Neue", sans-serif`. Introduced variable weights for consistent rendering across browsers.
- Display scale refined: `Display XL 56/64`, `Display L 48/56`, `Display M 40/48`, `Heading L 32/40`, `Heading M 24/32`, `Heading S 20/28`, `Body L 18/28`, `Body M 16/24`, `Body S 14/22`, `Caption 12/18`.
- Marketing pages utilize Display sizes for hero copy with letter-spacing +0.5px; dashboard headings use Heading M with uppercase label style.
- Monospaced token introduced (`"IBM Plex Mono"`) for code snippets in developer integration guides.

## Color Palette
- Unified light theme anchored in airy neutrals: `Background #FFFFFF`, `Surface #F8FAFC`, `Card #FFFFFF`, `Border #E2E8F0`, `Text Primary #0F172A`, `Text Secondary #475569`.
- Accent gradient `#4338CA → #6366F1` applied to CTAs, highlight lines, and active states. Secondary accent Coral `#F97316` for alerts.
- Success `#16A34A`, Warning `#F59E0B`, Error `#DC2626`. Info `#0EA5E9` used for tooltips and hints.
- Dark mode palette introduced: `Background #0F172A`, `Surface #111C2D`, `Card #16213C`, `Border #22314D`, `Text Primary #F8FAFC`, `Text Secondary #CBD5F5`.
- Chart palette includes 8 brand-consistent hues with 60% saturation to maintain legibility on light/dark backgrounds.

## Layout Principles
- Responsive grid system: 12-column layout on desktop (≥1280px), 8-column on tablet (768–1279px), 4-column on mobile (≤767px). Gutters 24px desktop, 20px tablet, 16px mobile.
- Section spacing: marketing sections 80px top/bottom; dashboard sections 48px; nested card spacing 24px.
- Sticky header shadow (0 6px 24px rgba(15, 23, 42, 0.08)) applied when scrolled to provide depth.

## Component Styling
### Buttons
- Primary button: gradient background (#4338CA→#6366F1), white text, 4px radius on marketing pages and 8px on dashboard for modern feel. Hover brightens gradient by 10%, focus ring 3px #C7D2FE.
- Secondary button: solid white with 1.5px border #4338CA, text #4338CA. Hover fills with #EEF2FF.
- Tertiary button: text link with underline animation; visited state color #7C3AED.
- Icon button: 40px square, subtle shadow 0 6px 12px rgba(67, 56, 202, 0.18).

### Cards
- Card radius 16px marketing, 12px dashboard. Border `1px #E2E8F0`. Drop shadow `0 10px 24px rgba(15, 23, 42, 0.08)` for elevated cards.
- Header uses uppercase label, body text Body M. Footer area for actions with top border `#E2E8F0`.
- Hover state lifts card by 4px and intensifies shadow.

### Tables & Data Grids
- Table header background #F1F5F9; text uppercase Body S weight 600.
- Rows alternate background (#FFFFFF/#F8FAFC). Hover highlights (#EEF2FF). Selected row indicator: left border 4px gradient.
- Sort icons use 16px chevron tinted #6366F1.

### Forms & Inputs
- Inputs adopt filled style: background #F8FAFC, border #CBD5F5, radius 12px. Focus border gradient; error border #F87171 with icon.
- Labels Body S with #475569; helper text #64748B. Required fields flagged with red asterisk and accessible text.
- Checkbox/radio components 18px with gradient fill on checked state.

### Navigation
- Header background semi-transparent (rgba(255,255,255,0.9)) with blur (12px). Authenticated nav order fixed as Feed, Communities, Explore, Create, Dashboard followed by profile avatar dropdown. Active nav item uses pill background #EEF2FF with gradient underline.
- Sidebar uses dark variant (#111C2D) with icons #CBD5F5; active item gradient bar 4px on left.
- Breadcrumbs separated by chevron icons; final crumb bolded.

### Modals
- Radius 20px, drop shadow `0 24px 48px rgba(15, 23, 42, 0.24)`. Header uses Heading S, close icon 24px.
- Footer buttons align right with 24px gap.

### Charts
- Charts adopt gradient area fills, 2px line weight, crisp gridlines (#E2E8F0). Tooltips use dark background (#111827) with white text, 14px size.
- Bar charts feature rounded corners (4px). Pie charts include inner ring showing percent.

### Notifications & Toasts
- Toast background #111C2D, text #F8FAFC, border-left 4px gradient. Icon tinted depending on severity (success, warning, error).
- Notification center cards 100% width with subtle border, timestamp Body S, CTA button tertiary style.

### Chat & Message Panels
- Chat bubbles use gradient accent for sender, neutral for recipient. Timestamp Body XS (12/16) italic.
- Composer background #F1F5F9, rounded 24px; icons 20px with hover change.
- Floating chat bubble circular (56px) with gradient fill and drop shadow 0 16px 32px rgba(67,56,202,0.26); unread count pill coral #F97316.
- Inbox list items adopt dark navy background (#111C2D) with alternating translucency and left border accent on hover.

### Purchase & Checkout
- Pricing comparison tables use alternating row fills (#FFFFFF/#F8FAFC); best value column outlined with gradient border and badge.
- Order summary card sticky with soft shadow (0 12px 28px rgba(15,23,42,0.12)); totals row uses uppercase label and gradient divider.
- Payment method tiles 64px height, icon left, text Body M, selected state gradient outline and subtle glow.
- Confirmation screen features celebratory illustration, success badge gradient (#22D3EE→#38BDF8), and print-friendly receipt layout.

### Admin Panel & Governance
- KPI banners gradient background (#1E1B4B→#4338CA) with white text and sparkline overlay in translucent white.
- Management grid cards adopt dark navy (#10152B) with glassmorphism overlay; status badges pill-shaped with neon accent.
- Audit log table uses monospace columns for timestamps/action codes, row hover accent #334155, and severity icons.
- Governance shortcuts styled as pill buttons with icon, uppercase label, focus outline #22D3EE.

### Learner Panel Styling
- Hero banner gradient (#312E81→#6366F1) with streak path illustration; progress ring uses 6px stroke and drop shadow.
- Feed cards 12px radius, left accent bar color-coded by item type, inline CTAs tertiary style.
- Support footer features subtle top border #E2E8F0 and iconography tinted #6366F1.
- Wallet snapshot chip gradient fill (#4338CA→#6366F1) with white text and icon.

### Instructor Panel Styling
- Task board columns neutral background (#F8FAFC), column header uppercase Body S and pill showing count.
- Task cards 8px radius, status color tags, drag handle icon (#CBD5F5); hover shadow 0 12px 24px rgba(15,23,42,0.12).
- Messaging shortcut chips gradient fill with unread badge #F97316.
- Quick create cards use icon in circular badge, background #EEF2FF, CTA button primary gradient.

### Preferences & Finance Styling
- Preferences toggles adopt soft switch with gradient track when active (#4338CA→#6366F1); labels Body M #0F172A.
- Finance tables align currency figures right using tabular numerals; status chips (Paid, Pending, Overdue) color-coded.
- Upload dropzones dashed border #94A3B8, hover gradient glow; success state displays emerald check badge.
- Modal footers include grayscale trust badges and fine print Body XS.

### Profile Page Styling
- Hero uses layered gradient overlay and blurred background image; avatar 120px with white 4px border.
- Progress rings dual-tone (#6366F1 outer, #C7D2FE inner); badge components circular with gradient fill and icon knock-out.
- Tab bar underline indicator 4px gradient; content cards 16px radius with uppercase section headers.
- Edit mode highlights fields with subtle glow (#C7D2FE) and checkmark animation upon save.

### Informational & Compliance Pages Styling
- Anchored table of contents rail background #F8FAFC; active item gradient pill and left border accent.
- Body copy Body M with 160% line height; headings Display S letter-spacing +0.3px.
- Revision callout box tinted #EEF2FF with icon, timestamp in monospace.
- CTA buttons neutral tone (#0EA5E9) to differentiate from conversion CTAs.

### Wallet Styling
- Balance card gradient (#0EA5E9→#22D3EE) with large numeric display using tabular figures.
- Ledger table zebra striping and duotone currency icons; export button tertiary gradient outline.
- Transfer modal stepper header with icons; confirm button gradient, fee info Body S #475569.
- Warning banner (#F59E0B background) appears when wallet insufficient; includes icon and tertiary link.

### Comment Management Styling
- Moderation queue rows include severity pills color-coded (#F59E0B warning, #DC2626 critical, #0EA5E9 info).
- Detail drawer background #0F172A with white text; action buttons spaced evenly, destructive button red gradient.
- Automation builder cards use grid layout with dotted connectors styled via SVG strokes.
- Analytics widget mini charts adopt sparklines with gradient fill and dark tooltips.

### Creation Studio Styling
- Tiles feature frosted glass effect over gradient background; iconography luminous line art.
- Progress badges display percentage ring and label chip (#C7D2FE background, #312E81 text).
- Guidance panel sticky with soft shadow and callout cards (#F1F5F9) with icons.
- Draft list rows include status color dots and hover reveal action buttons.

### Content Wizard Styling
- Stepper header gradient bar with numbered nodes; completed steps tinted #22D3EE, current step #6366F1.
- Form sections separated by subtle dividers; required fields display label chips with icon.
- Media upload area full-bleed card with dotted border and drop shadow; preview thumbnails 3:2 ratio.
- Review screen uses checklist with icon bullets and color-coded pass/fail indicators.

### Management Dashboards Styling
- Course/Ebook cards share 12px radius, header gradient accent, body with subtle grid background pattern.
- Analytics charts adopt dark theme overlays within admin contexts to contrast with primary background.
- Bulk action toolbar sticky with drop shadow and pill buttons for actions.
- Activity timeline uses vertical line with gradient dots; timestamp text monospace for alignment.

### Tutor Management Styling
- Directory cards include circular avatar, rating stars gradient fill, availability chips (#16A34A available / #DC2626 unavailable).
- Profile detail header gradient (#312E81→#6366F1) with certification badges overlay.
- Action bar buttons grouped with shared shadow; deactivate uses destructive styling.
- Compliance checklist checkboxes gradient when complete; pending items tinted #F59E0B.

### Community Creation & Feed Styling
- Creation forms use two-column layout with illustrated sidebar; inputs adopt creation-themed iconography.
- Management tabs highlight active tab with gradient underline and background tint (#EEF2FF).
- Community feed cards include author pill, role badge color-coded, and comment counters with gradient bubble.
- Switcher dropdown uses glassmorphism with blur; each community item has banner thumbnail and unread badge.

### Main Site Feed Styling
- Feed cards 16px radius, drop shadow 0 18px 34px rgba(15,23,42,0.12); video cards include play overlay gradient.
- Filter bar sticky with translucent background and backdrop blur; active filter pill gradient fill.
- Inline newsletter prompt uses contrasting coral gradient (#F97316→#FB923C) to attract attention.
- Infinite scroll loader uses gradient spinner matching brand colors.

## Imagery & Media
- Hero illustrations use layered gradients with motion blur; exported as SVG for resolution independence.
- Video embeds adopt 16:9 aspect ratio with rounded corners, overlay play button gradient.
- Resource thumbnails include subtle overlay gradient to ensure legible labels.

## Motion & Interaction
- Page transitions fade-in 240ms. Cards animate on scroll (20px upward slide, 200ms) triggered once.
- Button presses use 95% scale for tactile feedback on mobile; disabled states reduce opacity to 60% and remove shadows.
- Skeleton loaders use shimmer animation 1200ms linear.

## Accessibility Enhancements
- Verified color contrast meets or exceeds WCAG 2.2 AA. Provided high-contrast mode toggling to darker backgrounds and white text.
- Focus outlines unify at 3px #22D3EE with 4px radius. Keyboard skip links visible on focus.
- Added aria-live regions for async updates in dashboards.

## Branding Updates
- Logo lockup refined with improved spacing; header uses monochrome variant on light backgrounds and inverted on dark.
- Introduced brand pattern in footer backgrounds using subtle diagonal lines (#EEF2FF).
- Updated favicon set to include dark/light variants.

## Asset Pipeline
- CSS variables defined for typography, colors, spacing, radii. Provided SCSS mixins for gradient buttons and card shadows.
- Introduced theme JSON exported for integration with design tokens CLI.
- Assets optimized using AVIF/WebP; fallback to PNG for Safari older versions.

## Future Styling Backlog
- Build motion library for analytics interactions (hover reveal). 
- Evaluate glassmorphism overlays for hero sections once performance validated.
