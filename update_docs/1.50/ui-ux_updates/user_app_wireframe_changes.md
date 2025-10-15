# Learner App Wireframe Changes (v1.50)

## Home Experience
### Hero Stack
- Full-width hero with gradient backdrop, cohort badge, streak indicator, and next action CTA (Resume Lesson/Join Live). Includes microcopy summarizing learner progress.
- Secondary row with daily encouragement quote and progress ring animation for weekly goal completion.

### Focus Action Row
- Four icon tiles (Resume, Join Live, Review Notes, Explore Resources) with badge counts and long-press tooltips explaining actions.
- Tiles adopt card shadows and respond with haptic feedback on tap; long-press opens quick action menu (e.g., jump to specific lesson).

### Learning Timeline
- Vertical timeline with sticky "Today" marker. Each card shows session type icon, title, cohort tag, start time, required prep, and completion status.
- Overdue cards display red left border with "Catch Up" CTA. Completed cards fade with checkmark overlay.

### Resource Highlights
- Horizontal carousel of curated items: cards include thumbnail, type label, estimated read time, "Save" heart icon, and share action.
- Carousel supports pagination dots; swiping reveals peek of next card.

### Support & Notifications
- Persistent support chip anchored bottom-right; opens bottom sheet with options (Chat with Mentor, FAQ, Report Issue).
- Notification bell on top nav with badge count; tapping opens full-screen center with segmented filters and quick actions (Mark all read).

## Cohort Ecosystem
### Cohort Overview
- Header contains background illustration, cohort avatar, mentor list, and next session chip. Includes "Invite Friend" micro CTA.
- Tab bar: Feed, Curriculum, Members, Resources, Analytics. Underline animation tracks swipes.

### Feed Tab
- Sequence of stacked cards: pinned announcements with highlight color, lesson summaries, poll cards (with vote UI), and assignment reminders.
- Comment preview inline with ability to expand; like/share icons accessible.

### Curriculum Tab
- Accordion by module with progress bars, lesson count, estimated effort. Each lesson row shows completion indicator, lesson type (video, reading), and prerequisites.
- Floating "Add to Calendar" button on upcoming live sessions.

### Members Tab
- Grid layout for mentors and learners. Mentors appear first with role chip. Learners grouped by progress tiers (Ahead, On Track, Needs Support).
- Each learner card includes avatar, progress percentage, communication shortcuts.

### Resources Tab
- File list with filter chips (Type, Module, Tag). Items show icon, title, format, size, and quick download button.

### Analytics Tab
- Overview card summarizing completion, streak, engagement. Graph of weekly learning time and badge tracker.

## Learning Surfaces
### Lesson Player
- Full-bleed video/audio area with floating controls (Play/Pause, 10s skip, speed toggle). Bottom gradient ensures readability of overlay text.
- Transcript drawer accessible via handle; supports search, highlight, and note linking.
- Action bar: Mark Complete, Ask a Question, Bookmark. Completion triggers confetti animation.
- Secondary panel for downloadable attachments and references.

### Interactive Lessons
- Quiz overlays with single-choice, multi-choice, slider, and open text. Timer display for timed sections.
- Feedback screen summarizing correct answers, explanations, and recommended resources.

### Notes Workspace
- Split view with transcript on left, note editor on right. Notes autosave and sync; tags allow categorization.
- Export button to share notes via email or export to PDF.

## Assignments & Assessments
### Assignment List
- Segmented control for Active, Upcoming, Past. Cards show due date, estimated time, progress state, and attached rubric preview.
- Color-coded edge indicates urgency (green, amber, red).

### Assignment Detail
- Hero card summarizing assignment, due date, points, weight. Includes checklist of submission requirements.
- Submission section with drag-and-drop area, file preview thumbnails, text editor, and rubric criteria display.
- Feedback tab shows mentor comments, annotated files, and grade breakdown.

### Peer Review Flow
- Stepper UI showing Received → Review → Submit. Peer review instructions card, review form with sliders, comment fields, and helpful examples.
- Confirmation screen with summary and share option.

## Community & Social
### Chat Hub
- Bottom nav entry opens chat hub with top-level tabs: Cohort, Mentors, Peers, Support.
- Conversation list includes avatars, preview, unread count, and status icons (live typing, attachments).
- Active thread uses speech bubble layout, pinned resources strip, emoji reactions, mention support.
- Composer includes attachments, voice note, quick poll, and AI summary button.

### Unified Inbox
- Dedicated inbox surface accessible from notification bell or bottom nav badge.
- Tabbed filters (All, Mentions, Announcements, Billing) with persistent search bar and sort options (Newest, Oldest, Priority).
- Message cards show source icon (Cohort, Community, System), preview snippet, timestamp, and action icons (Mark read, Archive, Pin).
- Bulk action toolbar appears on multi-select for mark read/archive; includes "Mute thread" chip and "Escalate to Support" CTA.

### Floating Chat Bubble
- Mini bubble persistent across app surfaces showing latest conversation avatar and unread count.
- Tapping expands mini composer overlay with quick reply templates, while swipe dismiss hides for current session.
- Long press reveals shortcut menu (Open Inbox, Start New Chat, Notify Mentor).
- Accessibility option to disable bubble or convert to banner accessible via preferences.

### Events & Calendar
- Monthly calendar with event dots; tapping reveals agenda list. Live events highlight with gradient border.
- Event detail shows description, speakers, resources, join button, and ICS download.

### Community Feed
- Infinite scroll of highlights, achievements, upcoming events. Cards include large imagery, reaction counts, and comment previews.

## Profile & Personalization
### Profile Overview
- Cover gradient with customizable imagery, avatar, name, pronouns, tagline. Stats row for streak, badges, hours learned.
- Quick edit button opens bottom sheet for profile fields.

### Skills & Goals
- Tag chips for tracked skills with proficiency bars. Goals list with progress tracker and target date.
- CTA to request mentor feedback; logs responses in timeline.

### Achievements & Badges
- Badge grid with filter (All, Earned, In Progress). Each badge has tooltip with criteria.

### Preferences & Billing
- Settings accessible via gear icon: toggles for reminders, theme, language. Billing card shows plan, renewal date, manage payment method.
- Wallet tile displays current balance, upcoming auto-payments, and CTA to open wallet details.
- Finance alerts banner surfaces outstanding invoices with pay now button linking to checkout.
- Privacy & communication preferences list with toggle chips for marketing emails, SMS reminders, community mentions.

## Privacy & Safety Surfaces
### Consent Center Drawer
- Persistent entry point in the profile tab and home support chip that opens a half-height drawer summarising consent posture (Marketing, Research, Third-Party Integrations). Each consent row shows last updated timestamp, jurisdiction badge (GDPR, CCPA, LGPD), and toggle state with inline "View Policy" link.
- Primary CTA toggles trigger confirmation sheet requiring biometric or PIN confirmation when device supports it; sheet reiterates consequences (e.g., disabling marketing stops tailored recommendations) and records purpose/proof to the audit ledger.
- Drawer footer includes "Export Data" and "Request Deletion" secondary actions routing to guided workflows with SLA countdown chips and escalation link.

### Privacy Dashboard Canvas
- Dedicated screen accessible from profile and notification banner summarising privacy insights: cards for "Active Consents", "Open Requests", "Data Footprint" (storage categories with size/retention), and "Recent Policy Updates" arranged in two-column responsive grid for tablet breakpoints.
- Timeline module surfaces most recent privacy events (consent change, export completion, incident notice) with severity colour coding and deep links to detail modals; incidents display runbook tips and contact options.
- "Data Categories" accordion details stored personal data (Identity, Learning History, Payments) with encryption icons, retention windows, and quick actions to edit preferences or trigger redaction for eligible items.

### Scam & Fraud Education Hub
- Carousel banner on privacy dashboard hero rotates featured articles ("Spotting Tuition Scams", "How We Vet Tutors", "Secure Payment Checklist") with CTA to mark as read and share; progress ring indicates completion of recommended modules.
- Resource grid groups education content into Playlists (Video, Infographic, Quiz). Each tile lists duration, difficulty, and trust badges; completion progress syncs with analytics to unlock "Safety Certified" badge displayed on learner profile.
- Embedded quiz modal at end of playlist uses multi-step cards with scenario-based questions; scoring above 80% unlocks contextual reward (badge/discount) and registers completion in scam-awareness ledger for compliance reporting.

### Incident Escalation Strip
- Sticky bottom strip appears when learner reports potential fraud via support chip; summarises case ID, assigned advocate, and latest SLA checkpoint. Provides "Add Evidence" upload button (camera/upload) and "Contact Support" call-to-action with availability indicator.
- Strip persists across app routes until case resolved, ensuring visibility while allowing core learning tasks to continue uninterrupted.

### Wallet & Transactions
- Wallet detail screen shows balance header with gradient background, quick actions (Add Funds, Withdraw, View History).
- Transaction list uses grouped sections (Learning Purchases, Refunds, Rewards) with iconography and status chips.
- Transaction detail modal includes invoice download, support CTA, and ability to categorize spending for analytics.
- Wallet integrates with checkout flow, showing toggle to apply balance and projected remaining funds.

## Creation Companion Workspace
### Project Overview Strip
- Header surfaces outstanding tasks with pill chips (Needs Review, Awaiting Approval, Queued Share) alongside last sync timestamp and offline badge when replay queue pending.
- Segmented control toggles (Attention, In Progress, Published, Archived) include count bubbles and reorder cards by urgency score.
- Hero banner reserves illustration slot for marketing-led companion artwork with fallback gradient when assets unavailable.

### Project Cards
- Card hero shows title, status chip, and type icon (Course, Community, Campaign) plus collaborator count and readiness bar.
- Footer action row exposes Approve, Request Changes, View Details buttons; busy overlay appears with spinner + "Syncing" label when offline queue processes.

### Detail Drawer
- Bottom sheet displays summary, compliance notes, and pending action strip describing queued operations (e.g., "Share update queued – awaiting network").
- Outline list nested accordions show per-lesson review status with CTA to approve/request changes plus optional note capture modal.

### Share Update Dialog
- Modal gathers community selector, message body, and tags. Body enforces 10+ characters; tags deduplicated and limited to eight entries.
- Success toast communicates whether post published immediately or queued for sync, referencing community name.

### Offline & Sync Messaging
- Global banner communicates "Working offline – updates will sync automatically" with manual retry chip linking to sync routine.
- Failed queue entries display red badges inside pending action strip with "Retry in studio" copy and support hand-off link.

## Onboarding & Authentication
- Animated welcome sequence with brand narrative. Each slide includes illustration and CTA.
- Sign-up form supports email, Google, Apple. Validation messages inline with accessible descriptions.
- Onboarding checklist after sign-in surfaces tasks (Complete profile, Join cohort, Set learning goal). Completion triggers celebratory animation.

## Offline & Error States
- Skeleton loaders for offline caching; when offline, banner indicates limited functionality and shows last sync time.
- Error modals provide retry options, contact support CTA, and link to troubleshooting article.

## Accessibility Considerations
- VoiceOver labels on all navigation icons. Large text mode triggers layout adjustments to prevent clipping.
- High contrast mode toggles accessible from settings, adjusting color scheme to 7:1 ratio.

## Deprecations & Consolidations
- Removed legacy "Milestones" tab; content merged into Analytics view.
- Deprecated separate "Support" screen replaced by persistent support chip and chat integration.
