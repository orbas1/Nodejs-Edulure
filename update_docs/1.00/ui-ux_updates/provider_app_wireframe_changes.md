# Version 1.00 Provider App Wireframe Changes

## Structural Overview
- **Grid system:** Desktop web console uses a 12-column grid with 24px gutters; collapses to an 8-column grid on tablets and stacked cards on mobile web.
- **Navigation shell:** Left rail hosts global navigation (Dashboard, Content, Communities, Explorer, Monetisation, Settings). Rail collapses to icon-only at <1280px and into a top hamburger at <960px.
- **Persistent utilities:** Header contains global search, notification bell with badge counts, profile avatar dropdown, and “Create” primary CTA.

## Authentication & Onboarding
- **Welcome screen:** Split layout with left marketing panel (illustration + bullet benefits) and right form module (email, password, SSO options). Inline checklist shows onboarding steps (Verify Email, Set Profile, Import Assets).
- **Profile setup wizard:** Three-step modal overlay capturing business info, teaching focus, payout preferences. Progress bar and contextual tips anchored to right sidebar.

## Dashboard
- **Hero guidance panel:** Top full-width card summarising account health with contextual CTA (e.g., “Finish community tier setup”). Includes progress rings and support link.
- **Analytics widgets row:** Three cards (Revenue, Active Learners, Course Completion) with spark lines and dropdown to switch time range. Clicking opens slide-in drawer with charts.
- **Task timeline:** Vertical list of upcoming tasks and reminders with quick actions (Publish, Review, Respond). Supports drag to reorder priority.
- **Community pulse:** Split widget showing top community notifications, unread messages, and upcoming events. Each row has hover actions for “Open Hub” or “Message Leader”.

## Content Pipeline
- **Content overview table:** Tabbed interface for Courses, Lessons, Assets. Each tab features sortable columns (Status, Updated, Engagement). Bulk action toolbar appears when rows selected.
- **Create content CTA:** Floating action button bottom-right on desktop; expands to show options (Course, Lesson, Deck, Ebook, Video).
- **Asset upload modal:** Stepper with three panels (Upload → Optimise → Publish). Side panel displays validation checklist and estimated processing time. Includes dropzone, progress bars, error states.

## Course Builder
- **Structure panel:** Left column tree view of modules and lessons with drag handles, status badges, and add buttons. Supports inline renaming.
- **Lesson canvas:** Central area with tabbed editing (Overview, Content, Resources, Assessments). Rich text editor with formatting toolbar anchored at top.
- **Resource drawer:** Right column housing asset search, recommended content, and notes. Drag-and-drop from drawer into lesson timeline.
- **Preview toggle:** Top-right button toggles between Edit and Preview modes, showing responsive preview sizes.

## Asset Library
- **Filter header:** Search bar, tag filters, media type chips, owner filter. Save filter option persists as quick chip.
- **Card grid:** Cards display thumbnail, file type icon, usage count, version indicator, and status pill (Draft, Processing, Live). Hover reveals quick actions (Preview, Share, Replace).
- **Version history modal:** Timeline view with checkmarks, rollback button, download links.

## Community Management
- **Community selector:** Left rail extension listing owned communities with avatar, tier count, and status indicator. Clicking loads details.
- **Community overview:** Hero section with cover image, member count, tier badges, and primary actions (Post Update, Schedule Event, Manage Tiers).
- **Tabs layout:** Feed, Events, Tiers, Affiliate, Moderation. Each tab shares top action bar with filters and export button.
  - **Feed tab:** Masonry feed of posts with inline metrics and quick moderation icons.
  - **Events tab:** Calendar grid with list toggle; event cards show RSVPs, chat link, and edit CTA.
  - **Tiers tab:** Comparison table of benefits per tier; includes reorder handles and pricing editor drawer.
  - **Affiliate tab:** Dashboard of offers with commission sliders, shareable links, and eligibility badges.
  - **Moderation tab:** Queue table with severity tags, decision buttons, and audit trail preview.

## Messaging & Support
- **Inbox panel:** Slide-out drawer triggered from header. Displays tabs for Notifications, Messages, System Alerts with pill counters.
- **Conversation view:** Two-column layout: thread list with search + filters, message panel with composer (attachments, quick replies, slash commands).
- **Support hub:** Modal accessible via footer link featuring search, top articles, contact support button, and status of open tickets.

## Analytics & Reports
- **Reporting home:** Grid of report cards (Engagement, Revenue, Retention, Content Performance) with download and schedule icons.
- **Detail report layout:** Chart area (line/bar) above segmented table. Filter bar includes date range, segmentation (Community, Course), export, and benchmark toggle.
- **Compare mode:** Split view showing two metrics side by side with highlight callouts for key changes.

## Settings & Administration
- **Tabbed layout:** Profile, Organisation, Billing, Notifications, Integrations, Security.
- **Forms design:** Two-column layout with field groups separated by divider lines. Inline validation for each field, tooltip icons for complex options.
- **Audit log table:** Chronological list with user avatar, action summary, timestamp, filter chips, and CSV export.

## Responsive & Mobile Considerations
- Dashboard widgets stack vertically with collapse/expand accordions on mobile web.
- Navigation transforms into bottom tab bar with five primaries (Home, Content, Communities, Monetise, More) plus floating “Create” action.
- Modals convert to full-screen sheets with top progress indicators on small screens.
