# Component Functions & Behaviours

## Navigation Shell
- **Global Nav:** Provides persistent access to explorer, notifications, quick create, and workspace switcher; adapts to user role (learner/provider/admin) to expose relevant shortcuts.
- **Breadcrumbs:** Auto-generated from route hierarchy; support quick jump to parent context and show entity icons for clarity.
- **Contextual Sidebar:** Surfaces dynamic filters, saved views, and inline analytics for the active module; collapses to icon rail on tablet.

## Data Displays
- **Insight Cards:** Bind to analytics service, refresh every 5 minutes with live socket fallback; each card supports hover tooltips and drill-down CTA.
- **Tables:** Offer multi-column sorting, column show/hide, pagination, and export; rows include quick actions (view, edit, share).
- **Charts:** Configurable time range, thresholds, and annotation overlays; accessible with ARIA descriptions and keyboard toggles.
- **Activity Feed:** Streams events with grouping by day and load-more pattern; integrates inline moderation actions.

## Interaction Elements
- **Filter Chips:** Toggle states for entity types and time windows; chip groups remember last selection per user profile.
- **Tabs:** Support lazy loading and maintain scroll position when switching; used for dashboards, profile views, and settings sections.
- **Buttons:** Provide micro-interactions with progress spinners for async requests; disable with tooltip explanation when prerequisites unmet.
- **Drawers & Modals:** Use overlay scrim with focus trapping; modals include steppers for multi-phase flows with auto-save drafts.

## Forms & Inputs
- **Smart Forms:** Validate with schema definitions, inline error messaging, and helper copy; auto-populate from context (e.g., default community when creating event from community page).
- **Upload Widgets:** Handle drag-and-drop, file validation, progress bars, and resumable uploads to R2 storage.
- **Rich Text & Media Editors:** Provide WYSIWYG controls, embed options, and preview; store delta for collaboration compatibility.
- **Toggle & Slider Controls:** Manage notification preferences, affiliate commission rates, and visibility states with real-time preview.

## Communication Modules
- **Announcements Rail:** Rotates up to three cards with timers and dismiss states stored per user.
- **Toast Notifications:** Display success/error/info for API results with auto-dismiss and action links (undo, view details).
- **Chat Dock:** Connects to messaging service with thread list, message composer, file attachments, and presence indicators.
- **Guided Coach Marks:** Introduce new features with sequential overlays triggered on first visit after update.

## Utility & System
- **Skeleton Loader:** Mirrors layout of underlying component to reduce layout shift; uses theme-aware shimmer.
- **Search Overlay:** Provides keyboard shortcuts (⌘/Ctrl + K), result grouping, and ability to pin saved searches.
- **Analytics Exporter:** Bundles current filters into downloadable dataset; queued jobs tracked in notifications.
- **Accessibility Layer:** Implements focus outlines, skip links, ARIA labelling, and keyboard navigation across all interactive components.
