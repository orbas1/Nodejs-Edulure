# Menus — Navigation & Hierarchy Specification

## Global Navigation
### Learner App
- **Bottom Navigation Bar (Height 72 dp):**
  1. Home (icon: `home-variant`, label "Home").
  2. Learn (`book-open`).
  3. Community (`users-three`) — centre item with accent highlight.
  4. Library (`folder-play`).
  5. Profile (`user-circle`).
- Active item uses pill indicator (48 dp width) with `primary/50` background and icon tinted `primary/500`.
- On scroll down, bar hides with 120 ms slide; reappears on scroll up 12 dp.

### Provider App
- **Bottom Tab + Overflow (Phone):** Four main tabs: Dashboard, Content, Community, Earnings. Overflow (3-dot) opens 420 dp tall sheet listing Settings, Support, Legal.
- **Nav Rail (Tablet ≥768 dp):** 64 dp width with icons + collapsed labels. Hover tooltip 16 dp radius bubble.

## Secondary Menus
- **Contextual Action Bar:** On selection of items (courses, posts), top bar expands to show bulk actions (Archive, Publish, Share). Height 56 dp with subtle shadow.
- **Filter Menu:** Persistent chips below top bar; long-press toggles convert to dropdown for multi-select.
- **Quick Access Drawer:** Swipes from left, width 300 dp. Contains pinned cohorts, saved searches, offline queue.

## Settings Menu Structure
1. Account
   - Profile Info
   - Connected Accounts
2. Preferences
   - Notifications
   - Accessibility
   - Language
3. Learning Controls
   - Download Quality
   - Autoplay
4. Support & Legal
   - Help Centre
   - Privacy
   - Terms

## Menu Interaction Patterns
- Use `ScaleFade` animation (scale from 96% → 100%, opacity 0 → 1) over 160 ms for dropdowns.
- Ripple effect 220 ms using `rgba(37, 99, 235, 0.12)`.
- Provide haptic feedback (light tap) when menu item selected on mobile.

## Accessibility
- All menus reachable via keyboard: Tab/Shift+Tab cycles, Enter selects, Esc closes.
- Provide ARIA role annotations for sheet vs. listbox when exported to code.
- Focus trap inside modal menus; first focus on header.

## Content Guidelines
- Menu labels ≤24 characters, sentence case.
- Use supportive subtitles for complex items (e.g., “Earnings – payouts & invoices”) with `caption/01`.
- Provide iconography referencing Edulure pictogram library; maintain 16 dp padding around icons.

## Implementation Notes
- Document nav logic in `Screens_Update_Logic_Flow.md` to align with menu states.
- Provide Figma component with variant property for orientation (portrait/landscape) and mode (light/dark).
- Export JSON describing nav tree for integration with app routing.
