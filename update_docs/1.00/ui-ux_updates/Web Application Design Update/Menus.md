# Navigation Menus Specification – Web Application v1.00

## Global Header Menu
- **Structure:** Three primary segments (Prospective Learners, Providers, Enterprises). Each segment reveals mega-menu on hover/click.
- **Mega-Menu Dimensions:** 920px width, 400px height, 24px radius, drop shadow `0 40px 80px rgba(11,17,32,0.48)`.
- **Content Layout:**
  - Left column (260px) with hero blurb and illustration.
  - Centre column listing top links (max 6) grouped under 18px headings.
  - Right column featuring CTA card (200×240px) with gradient background.
- **Interaction:** Menu opens on hover (desktop) with 80ms delay, on click (mobile). Focus trap ensures keyboard navigation.

## Sidebar Menu
- **Width:** 256px expanded, 80px collapsed.
- **Sections:** Dashboard, Learn Library, Communities, Analytics, Resources, Settings.
- **Icons:** 24px Phosphor icons, 16px leading indicator bar for active route.
- **Pinned Shortcuts:** Up to 4 user-defined links, reorderable with drag handles.
- **Secondary Actions:** Footer block with storage usage bar (progress fill `#4C7DFF`).

## Utility Menus
- **Profile Menu:** Dropdown 280px width triggered by avatar. Items: View Profile, Switch Role, Account Settings, Sign Out. Includes plan badge.
- **Notifications Menu:** Panel 360px width with tab filters (All, Mentions, System). Each item 64px height with icon and timestamp.
- **Quick Create Menu:** Modal overlay listing creation flows with icons and descriptions; accessible via `+ Create` button or `Shift + C`.

## Mobile Navigation
- **Hamburger Menu:** Full-height overlay sliding from left. 320px width, 24px padding. Sections collapsible accordions.
- **Bottom Utility Bar:** For <768px, display 5-icon nav (Home, Learn, Communities, Inbox, Menu). Each icon 28px within 64px tall bar.

## Keyboard Shortcuts
- Provide `?` keyboard overlay listing shortcuts: `⌘/Ctrl + K` search, `Shift + C` create, `G then D` go to dashboard, `G then S` settings.
- Ensure shortcuts localisable; display both Mac/Windows keys.

## Accessibility
- Menus support `aria-expanded`, `aria-controls`, `role="menu"`. Items `role="menuitem"` with appropriate tab order.
- Provide visible focus state (2px outline) and maintain escape key to close.
- Ensure screen readers announce mega-menu sections with headings.

## Screen-specific Navigation Notes
- **SCR-00 Home:** Mega-menu hero blur matches background gradient to prevent contrast issues; CTA within menu uses BTN-PRM small variant.
- **SCR-02 Dashboard:** Sidebar indicates active sub-section using left accent bar (4px) plus background fill `rgba(76,125,255,0.12)`.
- **SCR-03 Learn Library:** Breadcrumb displayed as `Home / Learn` with filter summary chip appended.
- **SCR-05 Lesson Player:** Utility bar includes breadcrumbs `Course > Module > Lesson` with dropdown to switch lessons.
- **SCR-06 Communities:** Topic tabs double as navigation; on mobile convert to horizontal scroll with snap alignment.
- **SCR-09 Settings:** Secondary sub-tabs appear under main tab when content sections exceed 3 (e.g., Notifications -> Channels, Digests, Alerts).
- **SCR-11 Admin Analytics:** Add global timeframe quick switcher in header (This week, This month, Custom) for faster context shifts.

## Interaction Timing
- Mega-menu open delay 80ms, close delay 120ms to support diagonal mouse movement.
- Sidebar collapse animation 240ms; focus moved to first nav item when expanded via keyboard.
