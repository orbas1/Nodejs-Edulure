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

### Wallet & Transactions
- Wallet detail screen shows balance header with gradient background, quick actions (Add Funds, Withdraw, View History).
- Transaction list uses grouped sections (Learning Purchases, Refunds, Rewards) with iconography and status chips.
- Transaction detail modal includes invoice download, support CTA, and ability to categorize spending for analytics.
- Wallet integrates with checkout flow, showing toggle to apply balance and projected remaining funds.

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
