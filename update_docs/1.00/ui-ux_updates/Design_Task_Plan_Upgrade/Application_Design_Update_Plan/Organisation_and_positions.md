# Organisation & Positions — Mobile Application Layout Blueprint

## Global Structure
- **Safe Areas:** Respect OS status bar + home indicator; add 12 dp additional padding for scrollable contexts to avoid accidental taps.
- **Grid:** 4-column layout on phones (column width 72 dp with 16 dp gutters), 8-column on tablets (column width 88 dp with 20 dp gutters).
- **Section Spacing:** Primary sections separated by 32 dp. Within sections, card stacks maintain 16 dp vertical spacing.
- **Sticky Elements:**
  - Learner Home: Progress streak bar sticks 72 dp below top after hero collapses.
  - Provider Dashboard: Metrics bar sticks below top app bar with 8 dp divider.

## Screen-Level Arrangements
### Home (Learner)
1. **Collapsible Hero (Top 280 dp):** Left-aligned avatar (64 dp circle) with welcome message. Right side hosts vertical progress pill (max width 120 dp). Hero gradient background with 24 dp corner radius.
2. **Focus Tiles Row:** Two 160 × 120 dp cards (“Resume Module”, “Continue Challenge”) side-by-side; fallback to single column on narrow (<360 dp) screens.
3. **Recommendation Carousel:** 280 dp height horizontal list with 16 dp peek to imply scroll. Each card uses 12 dp internal padding.
4. **Community Snapshot:** 2-column list of compact cards (140 dp height) showing trending discussions and events.
5. **Footer CTA:** Inline banner (full-width, 72 dp height) encouraging notifications enablement.

### Learn (Course Catalogue)
- **Search Header:** Persistent search field 48 dp height with filter chip row below. Chips wrap with 8 dp spacing.
- **Featured Modules:** 3-card horizontal slider (card width 248 dp). Use 20 dp padding to align with grid.
- **List Section:** Vertical list items 88 dp tall with thumbnail (64 dp radius 12). Inline progress bar runs full width 4 dp height at bottom of each cell.

### Community
- **Tabs:** Segmented control anchored under top bar (width equals text + 32 dp). Active tab indicator 3 dp thick primary/500.
- **Feed:** Each post card 344 dp max width, 16 dp padding, optional attachment slot 200 dp height. Comments preview truncated at 3 lines.
- **Action Row:** Sticky composer at bottom with 56 dp height, includes 40 dp icon buttons, 8 dp radius text field.

### Library
- **Folders Grid:** 2-column grid (card 160 × 160 dp) showing cover art and quick stats. On tablets expand to 3 columns.
- **Filter Drawer:** Slide-in from right covering 320 dp width, containing toggles and sort order selectors.

### Profile & Settings
- **Profile Header:** 104 dp avatar, name, role chip. Stats row beneath (3 columns, each 88 dp width) showing learning hours, certifications, streak.
- **Settings List:** Section header text (body/03 uppercase) followed by toggles or navigations. Each row 64 dp height with trailing chevron or switch.

### Provider Dashboard (Phone)
- **Top Summary:** Dual metric cards (160 × 120 dp) for revenue and enrolment. Each includes sparkline overlay (24 dp height) anchored to bottom.
- **Task Timeline:** Vertical stepper occupying 320 dp width, steps spaced 48 dp apart.
- **Content Pipeline:** Horizontal scroll of asset cards (width 220 dp). Each card features stage chips aligned right.

## Interaction Placement
- **FAB:** Positioned bottom-right with 24 dp margin from edges. Expands to radial menu (angles 0°, 45°, 90°) for quick actions.
- **Snackbars/Toasts:** Appear above bottom nav with 16 dp margin, max width 320 dp on phones.
- **Dialogs:** Centered, width 88% of viewport, max height 520 dp; scrollable content area uses 24 dp padding.

## Responsive Behaviour
- Breakpoint <360 dp: switch to single column for hero actions, reduce body text to `body/03` for metadata.
- Breakpoint ≥600 dp (small tablet): enable dual-pane layout for Learn (list left 320 dp, detail right flex) and Settings (nav rail + detail).
- Landscape orientation: top bar height reduces to 56 dp; bottom nav transforms into compact rail with labels hidden but accessible via tooltip.

## Alignment Rules
- All icons align with text baseline where possible. Use 4 dp optical adjustments to avoid misalignment.
- Dividers extend full width minus 24 dp on each side to respect grid.
- Charts and graphs align to 12 dp padding to maintain consistent negative space.
