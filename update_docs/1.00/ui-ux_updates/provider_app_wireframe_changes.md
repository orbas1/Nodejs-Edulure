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

## Financial Operations & Compliance Screens
- **Payout centre:** Dedicated dashboard tab featuring summary banner (next payout date, amount), transactions table with filters (status, date range, currency), and anomaly alerts. Includes side panel for bank account verification and tax document uploads.
- **Invoice manager:** Grid of invoices with status pills, download buttons, and resend email action. Detail drawer shows line items, learner info, and payment history timeline.
- **Compliance checklist:** Accordion layout enumerating region-specific requirements (KYC, DRM, accessibility statements). Each item links to inline form or document upload with status icons.
- **Ledger exports:** Drawer launched from finance tables surfaces CSV/JSON export toggles, webhook replay controls, and inline explanations of ledger entry provenance mapped to Stripe/PayPal event IDs so finance leads can reconcile discrepancies without leaving the dashboard.

## Payments, Coupons & Refund Management
- **Payment intent monitor:** Real-time list (polling every 10 seconds, websockets on desktop) of open Stripe/PayPal intents with columns for learner, product, source (card, PayPal, wallet), tax jurisdiction, risk score, and expiry countdown. Cards surface inline actions to resend confirmation email, regenerate PayPal approval links, or cancel intents referencing `/api/payments` status transitions.
- **Coupon governance console:** Dual-panel layout with searchable coupon list on the left and detail inspector on the right. Inspector displays redemption caps, per-user limits, applicable products, and performance analytics (redemption rate, attributed revenue, abandonment delta). Includes controls to pause/resume coupons, adjust validity windows, and generate deep links; warning banners highlight upcoming expirations and conflicting stacking rules derived from backend validation errors.
- **Refund orchestration flow:** Multi-step drawer triggered from payment ledger or booking cards. Step 1 summarises learner purchase details with fraud signals; Step 2 allows partial/full refund selection, tax/fee split preview, and optional restocking fee; Step 3 confirms communication template, attaches supporting notes, and schedules optional follow-up tasks for success managers. Confirmation screen embeds refund ID, Stripe/PayPal reference, and ledger impact log for audit purposes.
- **Dispute response workspace:** Kanban with columns (New, Responding, Awaiting Evidence, Resolved). Each card shows dispute amount, channel, evidence deadline countdown, and collaboration sidebar (file uploads, comment threads, tag customer support). Integrates quick links to download invoices, attach proof-of-service, and escalate to legal/compliance stakeholders.
- **Finance health overview:** Header summary chips highlighting chargeback rate, refund volume, coupon liability, and revenue-at-risk. Clicking a chip drills into detailed graphs with anomaly annotations fed from observability metrics introduced in `backend-nodejs/src/observability/metrics.js`.

## Stripe & PayPal Webhook Visibility
- **Event stream viewer:** Timeline component visualising inbound Stripe/PayPal webhooks with filters for event type, processing result, and retry count. Each item expands to show raw payload excerpt, validation status (signature verified, idempotency accepted), and downstream automation triggers (ledger posted, finance summary updated).
- **Failure triage modal:** Launches from event stream when a webhook fails. Presents recommended remediation (retry, ignore, escalate), impacted learners/providers, and quick action buttons invoking backend replay endpoints. Includes guidance copy referencing runbooks stored in the operations knowledge base.
- **Alert configuration panel:** Allows finance admins to set thresholds for high failure rates, dispute spikes, or coupon abuse; integrates with notification service to push alerts to Slack/email. Panel mirrors backend metric keys and retention policies to keep design aligned with runtime behaviour.

## Marketplace & Promotion Surfaces
- **Offer builder:** Canvas with stepper (Audience → Incentive → Schedule → Review). Each step features preview panel showing learner-facing card, with ability to toggle channels (email, in-app banner, push).
- **Promo analytics:** Dual-column layout combining conversion funnel chart and table of campaign performance metrics. Includes filter chips for channel, segment, and date.
- **Affiliate resources:** Library of pre-built assets (banners, copy, tracking links) presented as cards with quick copy buttons and download CTA.

## Support & Knowledge Base Integration
- **Help centre dock:** Persistent question mark tab reveals contextual articles and quick links to webinars/documentation based on current module. Includes “contact success manager” CTA with scheduling widget.
- **Status & incidents:** Banner area reserved for platform incident notifications; clicking opens modal with incident timeline and mitigations.

## Quality Assurance & Review Workflows
- **Content QA queue:** Table listing lessons flagged for review with severity tags, reviewer assignment, due date. Detail drawer shows reviewer checklist, inline comment thread, and approval buttons.
- **A/B experiment setup:** Wizard supporting variant creation for course landing pages. Wireframe shows variant cards, traffic allocation sliders, and success metric dropdown.

## Documentation & Asset Governance
- **Brand kit:** Section housing logos, fonts, palettes with download controls. Wireframe includes preview area and usage guidelines accordion.
- **Template library:** Grid view of lesson templates with preview thumbnails, metadata (length, format), and quick actions (Duplicate, Customise).

## Tutor Hire & Live Classroom Wireframes
- **Schedule planner:** Calendar view with sidebar filters (Subject, Availability type). Dragging to create slot opens inline form; conflict warnings display red banner with details referencing `provider_app_wireframe_changes.md` overlays.
- **Booking board:** Three-column kanban (Requests, Upcoming, Completed) with cards showing learner avatar, agenda snippet, and rate. Quick actions (Accept, Reschedule, Decline) accessible via top icons.
- **Tutor profile completeness:** Progress widget with checklist (Bio, Certifications, Pricing, Compliance). Each item links to corresponding form; banner surfaces if payout not verified.
- **Live classroom host console:** Layout includes video stage, roster tab, chat tab, polls tab, and moderator tools sidebar. Control bar anchored bottom with buttons (Start recording, Share screen, End session) referencing `Admin_panel_drawings.md`.
- **Post-session review:** Summary card with metrics (Attendance %, Average rating, Revenue). Buttons for “Send recap”, “Issue refund”, “Publish recording”.
- **Compliance audit log:** Dedicated tab listing session transcripts, recording consent status, and incident reports with export options for legal review.

## Error & Empty States
- Documented screens for empty analytics (invite learners CTA), zero revenue (connect payment provider), and no communities (create community walkthrough). Each state includes illustration placement, supportive copy, and primary CTA positioning for clarity across breakpoints.
