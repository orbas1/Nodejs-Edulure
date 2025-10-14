# Learner Application Styling Changes (v1.50)

## Design Language Overview
The learner experience transitions to a luminous theme emphasizing clarity, warmth, and motivational cues. The palette now harmonizes across light and dark modes with accessible contrast and animated accents for achievements.

## Typography
- Primary font: **Inter Variable** with optical sizing; fallback stack `"Inter", "SF Pro", "Roboto", sans-serif`.
- Display scale: `Display XL 40/48`, `Display L 32/40`, `Heading L 26/34`, `Heading M 22/30`, `Heading S 18/26`, `Body L 18/28`, `Body M 16/24`, `Body S 14/22`, `Caption 12/18`.
- Learning timeline uses `Heading S` for session titles, `Body S` for metadata. Buttons use uppercase label style with 0.6px letter spacing.
- Implemented dynamic type adjustments up to 200%; ensures layout resilience.

## Color System
- **Primary Gradient:** Azure (#2563EB) → Violet (#7C3AED) used in hero backgrounds and CTAs.
- **Secondary Palette:** Coral (#F97316) for streaks, Emerald (#10B981) for success, Amber (#F59E0B) for warnings, Rose (#EF4444) for errors.
- **Neutral Base (Light Mode):** `Surface 0 #FFFFFF`, `Surface 50 #F8FAFC`, `Surface 100 #F1F5F9`, `Surface 200 #E2E8F0`, `Text Primary #0F172A`, `Text Secondary #334155`.
- **Neutral Base (Dark Mode):** `Surface 900 #0F172A`, `Surface 800 #1E293B`, `Surface 700 #334155`, `Text Primary #F8FAFC`, `Text Secondary #CBD5F5`.
- Accent glows applied to achievement badges (drop shadow `0 10px 30px rgba(124, 58, 237, 0.35)`).

## Iconography & Illustration
- Adopted playful line icons with 2px stroke; filled variant for selected states. Icon set expanded to include learning-specific glyphs (streak, practice, reflection).
- Illustrations feature friendly characters and gradients; appear in empty states, onboarding slides, and error pages with consistent background shapes.

## Layout & Spacing
- Baseline grid uses 4px increments. Mobile layout uses 4-column grid with 16px margins; tablet uses 8 columns; desktop (web wrapper) uses 12 columns.
- Section spacing increased to 32px to avoid crowding; cards maintain 16px padding with 12px gap between header and body.

## Component Styles
### Cards
- Corners rounded to 16px. Shadow `0 12px 28px rgba(15, 23, 42, 0.12)` for elevated cards; timeline cards use subtle border `1px #E2E8F0`.
- Header text `Heading S` with emphasis color; metadata in muted text. Completed state uses desaturated overlay with checkmark icon.

### Buttons
- Primary: Gradient fill (Azure→Violet), 52px height, 20px horizontal padding, 14px uppercase text. Hover/pressed states adjust gradient brightness by ±8%.
- Secondary: Outline with 2px gradient border, transparent fill; pressed state fills with 8% gradient overlay.
- Tertiary: Text button with underline animation on hover/tap.
- Icon-only: Circular 48px with subtle inner shadow.

### Tabs & Navigation
- Bottom navigation uses pill-shaped active indicator that animates between icons. Active icon tinted gradient; inactive icons #94A3B8.
- Tab bars use underline with gradient stroke; scrollable tabs maintain 16px left/right padding.
- Notification bell displays gradient badge chips (#F97316→#FB923C) with white numerals and bounce animation on new events; tapping transitions to inbox via 280ms slide-up.

### Forms & Inputs
- Input fields use filled variant with 12px radius, background #F1F5F9 (light) / #1E293B (dark). Focus ring gradient border 2px with glow.
- Helper text color #64748B; error text #EF4444 with exclamation icon.
- Toggle switches adopt gradient track when enabled; disabled state greyed out (#CBD5F5).

### Badges & Chips
- Streak badge uses animated glow, gradient border, and star icon.
- Skill tags use soft background (#E0E7FF) with text #3730A3; progress tags include small progress bar indicator.
- Inbox filter chips adopt pill shape with gradient outline; active chip filled gradient with drop shadow 0 8px 18px rgba(59,130,246,0.25).
- Bulk action chips use neutral background (#E2E8F0) with icon prefix; destructive variant tinted #FEE2E2 with crimson text.

### Inbox & Message Panels
- Inbox cards 12px radius with left accent bar color-coded by source (Cohort #6366F1, Community #22D3EE, Billing #F97316).
- Message preview text Body S #475569; timestamp right-aligned using Caption style muted (#94A3B8).
- Swipe actions reveal gradient buttons (Mark Read, Archive) with haptic feedback on completion.
- Empty state illustration uses soft gradient background and tertiary CTA encouraging exploration.

### Floating Chat Bubble
- Bubble uses circular 56px frame with gradient background (#4338CA→#6366F1) and drop shadow 0 16px 32px rgba(79,70,229,0.3).
- Unread badge 16px coral gradient (#F97316→#FB923C) with bold white numerals and accessible label.
- Expanded mini-composer overlays translucent card (#0F172A at 82% opacity) with 16px radius and blurred backdrop.
- Long-press menu displays vertical list of options (Open Inbox, Start New Chat, Notify Mentor) each with gradient hover highlight.

### Charts & Progress
- Progress rings use thick stroke (10px) with gradient fill and drop shadow; center text uses Display S weight 600.
- Analytics graphs adopt pastel palette with transparent fills and crisp gridlines (#E2E8F0).
- Wallet analytics sparkline bars use teal gradient (#0EA5E9→#38BDF8) with rounded corners; tooltip dark theme for contrast.

### Modals & Bottom Sheets
- Modals rounded to 24px, drop shadow `0 24px 48px rgba(15, 23, 42, 0.25)`.
- Bottom sheets use drag handle, 12px top radius, scrim background 40% opacity. Blur effect 12px applied to background for focus.
- Wallet action buttons (Add Funds, Withdraw) use gradient fills with icon left and subtle inner shadow for depth.
- Transaction detail modal features zebra rows for metadata, accent border around invoice download button, and tertiary tone for dispute CTA.

## Motion Guidelines
- Entrance animations 220ms ease-out; exit 180ms ease-in. Key components (hero CTA, streak indicators) have subtle pulsing animations every 15 seconds.
- Achievement confetti uses particle system with gradient colors, 1.2s duration, haptics on mobile.
- Tab transitions crossfade content with 120ms slide to maintain continuity.

## Accessibility Enhancements
- Ensured all color combinations meet 4.5:1 contrast; high contrast mode toggles to 7:1 scheme with darker text and deeper backgrounds.
- Added focus outlines (#22D3EE) for keyboard navigation; accessible labels for icons and toggles.
- Provided alternative text for badges and animations, along with reduced-motion fallback (static imagery).

## Sound & Haptics
- Introduced gentle success chime for major milestones (lesson completion, streak). Volume normalized to 40% of system.
- Haptic feedback: light tap for button interactions, medium impact for achievements, warning vibration for overdue assignment alerts.

## Asset Delivery
- Icons exported at 24/32/48px; lottie animations optimized under 500KB. Background textures exported as 2x retina PNG with lazy loading.
- Theme tokens documented for Flutter theming and React Native wrappers; includes color mapping, typography, elevation.

## Future Considerations
- Explore personalization of color accents based on learner preference while maintaining accessibility.
- Investigate 3D badge variations for premium tiers pending performance validation.
