# Menu Strategy – Application Design Update v1.50

## Navigation Framework
- **Learner App:** Bottom navigation with five primary destinations (Home, Cohorts, Calendar, Community, Profile). Uses center-aligned labels, gradient active indicator, and haptic feedback.
- **Provider App:** Bottom navigation (Dashboard, Cohorts, Calendar, Messages, More) plus top app bar for context-specific actions.

## Drawer & Overflow Menus
- Side drawers provide access to secondary options (Settings, Billing, Help, Feedback). Drawer header displays avatar, role switcher, and streak/health summary.
- Overflow menus (meatball) on cards offering contextual actions (Edit, Duplicate, Share, Archive). Limit to 5 items for readability.

## Contextual Menus
- Lesson player options accessible via bottom sheet including playback speed, captions, download transcripts.
- Calendar event actions accessible via action sheet (Edit, Duplicate, Cancel, Share Link).
- Chat message long-press menu providing Reply, Forward, Pin, React, Copy, Report.

## States & Accessibility
- Active menu item uses gradient highlight and 3px top indicator; icon labeled with accessible name.
- Focus states for keyboard: 3px outline (#22D3EE) around icon and label.
- Provide voiceover hints for double-tap action and long-press availability.

## Responsive Considerations
- Tablet layout expands bottom navigation to include labels by default; on desktop, convert to side rail.
- Overflow items in bottom navigation grouped under "More" menu containing Settings, Notifications, Support.
- Ensure menus remain accessible when dynamic text scaling applied (minimum tap target 48px).

## Content Guidelines
- Use concise labels (max 12 characters). Prefer nouns for primary nav (Home, Cohorts) and verbs for actions (Create, Share).
- Keep destructive actions separated visually (red text, confirm dialog) to prevent accidental use.

## Implementation Checklist
- Update navigation components in Flutter (BottomNavigationBar, NavigationRail) with new tokens.
- Document event tracking for menu interactions (analytics naming convention `nav_<destination>_tap`).
- Provide QA scenarios for orientation changes, theme switching, and localization (LTR/RTL support).
