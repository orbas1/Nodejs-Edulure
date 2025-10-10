# Component Functions & Behaviours – Version 1.00

## Navigation Shell
- **Global Nav**
  - Persistently exposes segmented navigation and quick actions. Reacts to scroll by compressing height and fading hero background.
  - Displays contextual CTA ("Upgrade plan") when billing flag triggered via `/api/account/status`.
- **Breadcrumbs**
  - Auto-generated from route tree with icons. Each crumb clickable; final crumb truncated with ellipsis if >32 characters. Keyboard navigation using left/right arrow with focus loop.
- **Contextual Sidebar**
  - Populates dynamic filters, saved views, pinned actions. Supports drag-and-drop reordering with accessibility handles.
  - Collapses automatically at <1024px and persists state via user preferences API.

## Data Displays
- **Insight Cards**
  - Poll analytics service every 300 seconds; integrate WebSocket fallback for real-time updates. Hover reveals detailed tooltip with delta vs. previous period.
  - Drilldown CTA opens drawer with expanded trend chart and filters.
- **Tables**
  - Provide column sorting, column visibility toggles, sticky headers, infinite scroll with virtualisation for >200 rows.
  - Row selection triggers action bar floating at bottom with batch actions.
- **Charts**
  - Use area, bar, and radial chart components with accessible labels. Provide dataset legend, range selector (7d, 30d, 90d), and annotation markers for major updates.
- **Activity Feed**
  - Real-time updates via GraphQL subscription. Each item groups by day with sticky date labels. Inline moderation options (approve, archive) accessible via kebab menu.

## Interaction Elements
- **Filter Chips**
  - Toggle between states, support multi-select. Display selection count when >3 filters applied. Provide "Reset" ghost button after user interaction.
- **Tabs**
  - Manage content sections with lazy loading. Maintain scroll position per tab. Keyboard accessible via arrow keys; focus indicator moves with transition.
- **Buttons**
  - Provide asynchronous feedback using inline spinners and label changes ("Saving…"). Destructive actions require confirmation modal.
- **Drawers & Modals**
  - Drawers slide in from right, trap focus, close on ESC/backdrop click. Support nested modals for confirmations.

## Form Components
- **Smart Forms**
  - Auto-populate from context; display inline help icons that open tooltip or knowledge base article.
  - Provide auto-save status indicator in footer (icon + text "Saved 2 mins ago").
- **Upload Widgets**
  - Support drag-and-drop, multi-file selection, progress bars with pause/resume. Validate file type/size before upload.
- **Rich Text Editor**
  - WYSIWYG with headings, lists, embeds, code blocks. Provide markdown shortcut hints. Autosave drafts to local storage.
- **Toggle & Slider Controls**
  - Provide immediate preview (e.g., slider for commission updates previewing payout totals). Snap to defined increments.

## Communication Modules
- **Announcements Rail**
  - Rotates cards using 8-second interval with pause on hover. Each card clickable with action logging.
- **Toast Notifications**
  - Appear top-right, stack up to 3, auto-dismiss after 4s unless hovered. Provide action link (Undo/View).
- **Chat Dock**
  - Docked chat panel with real-time presence indicators. Message composer supports attachments, emoji picker, slash commands.
- **Guided Coach Marks**
  - Sequence of overlays triggered after update. Provide progress (Step x of y) and ability to skip.

## Utility & System Components
- **Skeleton Loader**
  - Mirror component layout with shimmering animation (1.2s). Adapts to theme (light/dark).
- **Search Overlay**
  - Global command palette with fuzzy search, keyboard shortcuts display on right column. Provide pinned actions (e.g., "Invite teammate").
- **Analytics Exporter**
  - Shows queue status with timeline steps (Queued → Processing → Delivered). Provides download link and ability to email results.
- **Accessibility Layer**
  - Skip links for main navigation, content, and footer. Provide status region for screen readers announcing state changes.
