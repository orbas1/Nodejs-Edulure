# Provider App Wireframe Changes (v1.50)

## Dashboard Suite
### Global Dashboard
- **Header Composition:** Dual-row layout with top row containing cohort switcher dropdown, notifications bell with badge, and quick create button; second row includes KPI filter chips (Week, Month, Quarter) and contextual breadcrumbs.
- **Metric Grid:** Four primary cards (Cohort Health, Revenue Forecast, Upcoming Sessions, Open Tasks) arranged 2x2 with equal width, 16px gutters, and expanded detail modals accessible via info icon.
- **Secondary Panels:** Right-side column (320px) housing quick alerts (late submissions, expiring payments) and advisor feed with avatars.
- **Footer Utilities:** Sticky bottom toolbar providing shortcuts to Analytics, Messages, Support; includes floating action button for "Launch Live Session".

### Cohort Detail Wireframe
- **Hero:** Cohort avatar, title, mentor roster, and health meter displayed in stacked layout with gradient background. Inline controls for edit, duplicate, archive.
- **Tabbed Navigation:** Persistent top tabs (Overview, Curriculum, Members, Analytics, Messages) with sliding underline indicator.
- **Overview Tab:** Summary cards for engagement, completion, NPS; timeline widget showing upcoming milestones; table of recent submissions with status chips.
- **Curriculum Tab:** Accordion list by module with lesson count, duration, and completion indicators. "Add Lesson" button anchored top-right.
- **Members Tab:** Search bar, filters (All, Needs Attention, Alumni), sortable table with columns for name, role, progress, flags, last activity. Row actions include message, view profile, assign task.

### Scheduling Center
- **Calendar View:** Default weekly grid with color-coded sessions (Live, Async, Office Hours). Drag handles allow resizing duration; context menu for duplicate or cancel.
- **Agenda Sidebar:** Collapsible list of sessions with quick edit icons and conflict alerts.
- **Session Detail Drawer:** Slides from right covering 40% width; includes session info, assigned resources, automation toggles, and attachments.
- **Availability Overlay:** Transparent overlay showing mentor availability blocks and learner time-zone alignments.

## Content Authoring Flow
### Content Library Landing
- **Header:** Action buttons for Upload, Create Lesson, Create Assessment; search input with filter tags (Type, Cohort, Author).
- **Card Layout:** Masonry grid for lessons, assessments, templates with status badges (Draft, Scheduled, Published). Cards display thumbnail, duration, module tags, engagement preview.
- **Bulk Tools:** Checkbox selection reveals bulk actions (Publish, Archive, Assign).

### Lesson Builder Wireframe
- **Step Navigation:** Vertical progress indicator showing steps (Details → Content → Interactions → Review → Publish).
- **Canvas:** Main column contains content blocks (video, text, quiz). Blocks reorder via drag handle; each block has inline settings icon.
- **Side Panel:** Contextual options (theme color, prerequisites, estimated effort) and AI suggestions panel for auto-generated summaries.
- **Preview Toggle:** Top-right switch between Mobile and Desktop preview frames.

### Assessment Builder
- **Question List:** Ordered list with type icon, points, and status; add question button at bottom.
- **Workspace:** Selected question opens in main area with rich editor, answer options, feedback fields.
- **Rubric Panel:** Right column shows rubric criteria with weight sliders and preview of scoring bands.
- **Submission Policies:** Modal accessible from footer to adjust due date, time limit, attempt count, and late penalties.

## Communication & Support
### Messaging Hub
- **Navigation:** Left rail with conversation folders (All, Cohort Rooms, Direct Messages, Support). Search field pinned top.
- **Thread List:** Middle column showing recent threads with avatars, last message preview, unread badges, and SLA indicator.
- **Active Conversation:** Right pane containing message stream with bubble layout, pinned announcement banner, attachments row, and quick reply templates.
- **Composer:** Multi-line input with buttons for attachments, template insertion, scheduling, emoji. Presence indicator shows when mentors typing.

### Notifications Center
- Full-screen modal triggered via bell icon. Includes tabs for Platform, Cohort, Billing, Support. Each row displays icon, message snippet, timestamp, CTA pill. Bulk actions (Mark all read, Dismiss older than 30 days) pinned top-right.

### Support Console
- Single-column layout with knowledge base search, recent tickets list, and embedded contact form. Visual timeline of ticket status located below each ticket summary.

## Analytics & Reporting
### Analytics Home
- **Hero Metrics:** Row of large statistic cards with sparkline, percent change, and tooltip definitions.
- **Segment Selector:** Filters for Cohort, Timeframe, Segment (New vs Returning, Subscription tier).
- **Detailed Charts:** Area chart for engagement, stacked bar for completion by module, table for learner performance with sticky header.
- **Insights Feed:** Right column listing automated insights with confidence scores and recommended actions.

### Report Builder
- **Template Gallery:** Grid of report templates with thumbnails and metadata (Audience, Last Updated).
- **Builder Canvas:** Drag-and-drop blocks for metrics, charts, tables, narrative text. Layout grid uses 12-column system.
- **Export Panel:** Options for PDF, CSV, Scheduled Email. Include brand customization (logo, accent color, cover page text).

## Administrative & Settings Screens
### Profile & Team Management
- **Profile Overview:** Card with avatar, verification status, primary cohort assignments. Quick action buttons for edit and view public profile.
- **Team Members:** Table with role, permissions, last login; inline toggle for account status. Invite member modal includes role presets and custom permissions.
- **Billing & Payouts:** Panels for payout method, invoice history, upcoming transfers. Embedded chart showing earnings trend.

### Settings Architecture
- Tabbed layout (Account, Notifications, Integrations, Security, Compliance). Each tab uses left-side navigation with anchor links to subsections.
- **Account Tab:** Forms for business details, timezone, contact info with inline validation.
- **Notifications Tab:** Matrix of channel toggles (Push, Email, SMS) per event type; includes digest schedule card.
- **Integrations Tab:** Cards for LMS, CRM, payment connectors with connection status and manage buttons.
- **Security Tab:** Controls for MFA, device management, session history table, download data button.
- **Compliance Tab:** Document repository with signed agreements, export logs, GDPR handling preferences.

### Tutor Management Suite
- **Tutor Directory:** Filterable list by expertise, location, rating, availability; cards show avatar, skill chips, schedule snapshot.
- **Tutor Detail:** Profile header with accreditation badges, earnings summary, assigned cohorts, and feedback timeline.
- **Actions Drawer:** Buttons to adjust payout rate, assign cohorts, send announcements, or escalate issues.
- **Compliance Checklist:** Progress tracker for onboarding tasks (background check, tax forms) with status badges.

### Creation Studio Hub
- **Entry Tiles:** Grid of quick actions (Create Course, Create Ebook, Launch Live Series, Build Community) with draft counts.
- **Drafts List:** Table of in-progress assets showing status, last edited, collaborators; inline actions for resume, duplicate, archive.
- **Template Library:** Carousel of modality-specific templates with preview and "Apply" CTA.
- **Resource Drawer:** Slide-out panel offering brand assets, policy guidelines, and AI assistant tips.

### Course & Ebook Management
- **Course Dashboard:** Tabs (Overview, Curriculum, Pricing, Cohorts, Reviews) with summary metrics and quick edit buttons.
- **Ebook Dashboard:** Cover gallery with status badges (Draft, Live, Scheduled); detail view lists distribution channels and royalty splits.
- **Automation Rules:** Card stack for enrollment caps, waitlist logic, certificate triggers with toggle switches and edit modals.
- **Analytics Strip:** Inline charts tracking revenue, completion, engagement with export icons.

### Community Creation & Oversight
- **Community Builder:** Stepper (Basics → Rules → Branding → Preview) with live preview of feed layout and rule summary.
- **Member Management:** Table with role tags, join date, participation score, and action menu (Promote, Suspend, Message).
- **Content Moderation:** Queue for flagged posts/comments with approve/deny actions, context preview, and escalation trail.
- **Community Switcher:** Header dropdown listing communities with unread badges and quick toggle to view as member.

### Finance & Wallet Controls
- **Wallet Overview:** Balance card highlighting available funds, pending payouts, reserved amounts; CTA for Transfer Funds.
- **Transaction Ledger:** Filterable table (Payouts, Purchases, Refunds) with export CSV, dispute button, and search.
- **Invoice Center:** List of invoices with status chips, quick view modal, send reminder button, and download PDF.
- **Promo & Coupons:** Management grid for promotions with usage analytics, activation toggle, and scheduling controls.

## Onboarding & Authentication
- **Welcome Carousel:** Three slide introduction with imagery, progress dots, and skip CTA.
- **Signup Form:** Split layout with form on left and benefits panel on right. Includes password strength meter, terms checkbox, and "Continue with Google" button.
- **Verification Step:** Upload ID photo widget with guidelines, progress tracker, and estimated review time.
- **Checklist:** Post-onboarding checklist with progress bar for tasks (Complete Profile, Add Payment Method, Create First Cohort, Invite Team).

## Mobile-Specific Considerations
- Introduced bottom navigation with five icons (Dashboard, Cohorts, Calendar, Messages, More) and floating action for Create.
- Added pull-to-refresh guidelines and skeleton placeholders for data loading states.
- Ensured all interactive elements meet 48x48 minimum touch target and maintain 16px padding.

## Deprecations
- Removed legacy "Task List" overlay, consolidated functionality into Dashboard Open Tasks card.
- Retired standalone "Announcements" screen; content now lives within Messaging Hub pinned threads.
- Decommissioned "Static Reports" tab replaced by dynamic Report Builder.
