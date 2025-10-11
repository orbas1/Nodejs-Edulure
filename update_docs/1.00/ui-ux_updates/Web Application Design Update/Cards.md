# Card Components – Web Application v1.00

## Universal Specifications
- Radius: 20px outer, 16px inner for nested content.
- Border: `1px solid rgba(148,163,184,0.16)`.
- Shadow: `0 32px 64px rgba(8,18,36,0.42)` default, reduce to `0 24px 48px rgba(8,18,36,0.32)` on hover for subtle lift.
- Background: `var(--surface-card)`; highlight states layer gradient overlay `linear-gradient(180deg, rgba(76,125,255,0.14) 0%, rgba(167,139,250,0.08) 100%)`.
- Padding: `24px` desktop, `20px` tablet, `16px` mobile.
- Layout: Use CSS grid `grid-template-columns: auto 1fr` for cards with media.

## Card Types
### 1. Course Spotlight Card
- Dimensions: 320×360px desktop.
- Hero media: 16:9 thumbnail (corner radius 16px) using course cover from CDN.
- Content stack: Title (22px/30px, 2 lines max), instructor (16px/24px), rating stars (icons 16px with 4px gap), modules count chips.
- CTA row: Primary button (medium) + tertiary link "Preview" with arrow.
- Footer: Progress bar 6px height, gradient from `#34D399` to `#A78BFA`.

### 2. Community Pulse Card
- Size: 280×320px; collapses to full width on mobile.
- Header: Avatar group (40px, 32px, 24px overlapping) with border `2px solid #0B1120`.
- Body: Activity graph 120px height sparkline + top metrics (posts, new members, events).
- Interaction: Hover reveals quick actions (View, Message Admin, Share) sliding up from bottom with 160ms fade.

### 3. KPI Insight Card
- Dimensions: 320×220px.
- Metric label (14px uppercase), metric value (48px), delta badge (16px pill) with arrow icon.
- Chart area: Inline sparkline using accent tokens.
- Additional info: Tooltip icon top-right linking to methodology.

### 4. Content Feed Card
- Full-width 720×auto at desktop.
- Structure: Header (poster avatar 48px, name, timestamp), body text (18px/28px up to 6 lines), attachments (image grid 2×2 with 12px gap), reactions bar.
- Comments preview: up to 2 comments collapsed with "View thread" tertiary button.

### 5. Announcement Banner Card
- Height 120px, full width.
- Background gradient `linear-gradient(135deg, #F59E0B 0%, #FDE68A 100%)` with overlay pattern `noise_overlay_01.png` at 8% opacity.
- Contains icon (32px), headline (24px/32px), description (16px/24px), CTA button (small secondary).

## Responsive Behaviour
- Cards stack vertically with `24px` spacing at <768px.
- Course & community cards become horizontally scrollable within container with snap alignment.
- Ensure `aspect-ratio` property used for thumbnails to prevent layout shift.

## Accessibility & States
- Cards are `article` elements with `aria-labelledby` referencing card title.
- Focus state: 2px outline `#38BDF8` with offset 4px.
- Loading skeleton replicates layout: grey blocks for text, gradient shimmer left-to-right in 1200ms cycle.

## Data Sources & Dependencies
- Course cards query `/api/courses?featured=true`.
- Community cards query `/api/communities/pulse`.
- KPI cards pull from `/api/insights` with metric parameter.
- Feed cards integrate GraphQL subscription `feedUpdates` for live comments.

## Screen Usage Matrix
- **Dashboard (SCR-02):** KPI cards (WGT-KPI), announcement banners, community pulse.
- **Learn Library (SCR-03):** Course spotlight cards with inline actions, library playlist items styled as horizontal cards.
- **Course Detail (SCR-04):** Module cards nested within accordion, instructor highlight card (columns 9–12).
- **Communities (SCR-06/07):** Feed posts share card styling with reaction footer and comment preview.
- **Profile (SCR-08):** Badge grid uses card tokens with accent overlays.
- **Support (SCR-10):** Ticket list cards include status badge and quick links.
- **Admin Analytics (SCR-11):** Insight cards with metric and chart combos.
- **Admin Content (SCR-12):** Data table rows convert to card layout at <768px.

## Elevation Guidelines
- Default cards use `shadow-sm` variant; hovered interactive cards use `shadow-lg` to signal clickability.
- Sticky cards (task rail, summary) remove bottom shadow and add border top `rgba(148,163,184,0.32)` to blend with scroll.

## Micro-interactions
- Cards animate entry with 80ms stagger (Framer Motion) from 8px upward offset.
- On focus, apply `outline: 2px solid #38BDF8` plus `outline-offset: 4px`.
