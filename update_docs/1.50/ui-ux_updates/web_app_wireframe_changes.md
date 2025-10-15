# Web Application Wireframe Changes (v1.50)

## Global Shell
- **Header:** 72px tall with left-aligned logo, centered authenticated navigation ordered **Feed, Communities, Explore, Create, Dashboard**, and right utilities (Search, Notifications, Profile avatar dropdown). The avatar opens role switcher (Learner, Instructor, Admin), quick links to Preferences, Finance, and Sign out. Sticky behavior with compressed 56px variant on scroll.
- **Secondary Navigation:** Contextual sidebar on dashboard surfaces with collapsible sections for Overview, Cohorts, Analytics, Settings. Includes quick create button and badges for items requiring attention.
- **Search Overlay:** Command palette (⌘K) sliding from center with fuzzy search results, quick actions, and keyboard shortcut hints.

## Marketing Pages
### Home Page
- Hero layout with split column: left copy, right illustration + embedded video. CTA buttons (Browse Cohorts, Start Free Trial) stacked with microcopy.
- Social proof band featuring partner logos, testimonials carousel, and stats cards.
- Curriculum preview section with tabbed content (Live Sessions, Projects, Mentorship, Community). Each tab reveals card grid with icons.
- Outcomes section showing data visualization, quote block, and CTA to view case studies.
- Footer expanded with sitemap, newsletter signup, language selector, accessibility statement.

### Cohort Catalog
- Filter rail with checkboxes (Subject, Level, Duration), slider for start date, search bar with suggestions.
- Results grid using card layout: cohort image, title, mentor info, duration, format, price, "View Details" CTA.
- Sorting options (Recommended, Newest, Price, Duration). Pagination controls bottom with result count summary.

### Cohort Detail Page
- Hero with breadcrumb, title, mentor avatars, rating, CTA button (Enroll/Join Waitlist).
- Sticky enrollment widget on right showing price, payment options, guarantee copy.
- Tabs for Overview, Curriculum, Mentors, FAQ, Reviews. Curriculum uses accordion with module breakdown.
- FAQ section uses accordions; reviews show aggregated rating, filter options, and featured testimonials.

## Auth & Onboarding
- Authentication screens use two-column layout: form left, feature highlights right. Social login buttons horizontal with brand icons.
- Onboarding questionnaire (for marketing leads) uses stepper progress, question cards with illustrative icons, and summary screen.

## Dashboard Experience (Authenticated)
### Overview Dashboard
- Top row: metric cards (Active Cohorts, Lessons Assigned, Upcoming Live Sessions, Satisfaction). Each card has sparkline and action link.
- Middle section: Activity feed (announcements, due dates), and tasks list with checkboxes.
- Right column: Calendar widget for upcoming sessions, quick links to publish content, support resources.

### Cohort Management
- Table view with columns (Cohort Name, Status, Learners, Next Session, Health). Row expands to reveal quick stats and actions.
- Cohort detail page mirrors provider mobile design but optimized for desktop: hero with tabs (Overview, Curriculum, Members, Analytics, Messages).
- Embedded chat panel accessible via right drawer for quick communication.

### Analytics Hub
- Filter panel top with date range, cohort selector, metric focus.
- Visualization grid: multi-series line charts, stacked bars, funnel chart for learner progression.
- Insight cards summarizing anomalies or opportunities with "Apply Fix" action.

### Resource Library
- Sidebar filters (Type, Subject, Difficulty, Format). Main area uses masonry grid with preview hover states showing summary and actions (Assign, Save, Share).
- Detail modal reveals metadata, preview, and version history.

### Settings
- Multi-level navigation: Account, Billing, Notifications, Integrations, Team, Security.
- Forms laid out in two-column arrangement for desktop; collapses to single column on mobile.
- Security page includes device list, session history, and 2FA setup wizard.

### Purchase & Checkout Flow
- Pricing comparison table presenting course packages, subscription tiers, and promo entry alongside savings breakdown.
- Order summary sticky column showing line items, tax, wallet balance application, and final total with CTA states (Pay Now, Schedule Payment).
- Payment method selection screen supporting cards, wallets, bank transfer; inline validation and support link to finance settings.
- Confirmation page surfaces receipt, download invoice button, and quick access to course onboarding tasks.

### Admin Control Panel
- Global KPIs banner (Revenue, Active Users, Compliance Alerts) with drill-down chips.
- Management grid linking to Course, Ebook, Tutor, Community, Finance, and Policy modules with status badges.
- Activity audit log table with filters for entity, action, actor, timestamp; export button top-right.
- Left rail houses governance shortcuts (Role permissions, Feature toggles, Localization packs).

### Operator Command Centre
- Four-card metric header communicates impacted services, open incidents, engaged watchers, and payments blocked with severity-coded backgrounds so operators instantly gauge platform posture. Each card binds to Redis-backed manifest and incident queue summaries exposed via the new operator dashboard service.【F:frontend-reactjs/src/pages/dashboard/AdminOperator.jsx†L19-L113】【F:backend-nodejs/src/services/OperatorDashboardService.js†L262-L305】
- Service health panel splits into core services and impacted capabilities, highlighting component-level degradations, dependency summaries, and escalation contacts sourced from capability manifest payloads. Live alerts from the service health context appear inline for parity with the global banner.【F:frontend-reactjs/src/pages/dashboard/AdminOperator.jsx†L115-L199】【F:backend-nodejs/src/services/OperatorDashboardService.js†L92-L154】
- Incident queue column surfaces the top five escalations with severity badges, acknowledgement/resolution telemetry, watcher counts, and the first two recommended actions so duty managers can triage without leaving the page.【F:frontend-reactjs/src/pages/dashboard/AdminOperator.jsx†L201-L259】【F:backend-nodejs/src/services/OperatorDashboardService.js†L156-L231】
- Scam intelligence section visualises active scam alerts, detection channels, watcher coverage, and recommended actions, while the adjacent runbook stack links to the relevant playbooks for rapid mitigation.【F:frontend-reactjs/src/pages/dashboard/AdminOperator.jsx†L261-L332】【F:backend-nodejs/src/services/OperatorDashboardService.js†L202-L246】
- Operational timeline composes incident lifecycle updates and runbook launches in reverse-chronological order, giving operators an audit-friendly journal of acknowledgements, mitigations, and resolutions.【F:frontend-reactjs/src/pages/dashboard/AdminOperator.jsx†L334-L371】【F:backend-nodejs/src/services/OperatorDashboardService.js†L233-L246】

### Learner Panel (Web)
- Personalized hero with streak tracker, recommended next lesson, wallet snapshot.
- Feed column merges announcements, assignments, mentor notes, and comment replies with contextual action buttons.
- Right column surfaces upcoming events, saved resources, and support contacts.
- Footer region includes quick links to account preferences, finance settings, and help center.

### Instructor Panel
- Overview strip with teaching hours, cohort satisfaction, pending reviews.
- Task board segmented into Today, Upcoming, Needs Attention columns with drag-and-drop interactions.
- Messaging shortcuts to cohorts, DMs, support; chat bubble indicator for new messages.
- Resource quick create cards (Lesson, Live Session, Assessment) launching creation wizards.

### Messaging & Inbox
- Unified inbox layout with folder tabs (All, Mentions, Direct Messages, System, Billing).
- Thread list includes avatars, status pills, last message snippet, unread counters.
- Conversation view supports rich text, attachments, emoji, quick replies, and pinned items.
- Floating chat bubble accessible across app to resume latest conversation; collapses to icon when idle.

### Account Preferences & Finance Settings
- Preferences page uses segmented controls for notification cadence, accessibility options, language, and time zone.
- Finance settings include payout account forms, wallet transfer history, invoice list, and tax document upload module.
- Security area surfaces login history timeline, MFA toggle, and device revocation controls.
- Support CTA panel connects to finance support and compliance documentation.

### Profile Page
- Modular layout with hero banner, avatar, progress rings, biography, skills chips, badges, testimonials carousel.
- Tabs for Overview, Portfolio, Certifications, Activity, Reviews; each tab uses cards and timelines for clarity.
- Edit mode overlays inline fields with autosave confirmation toasts.
- Social sharing controls and privacy toggle located near header.

### Informational & Compliance Pages
- About Us uses story timeline, leadership grid, mission pillars, and CTA to careers.
- Terms & Conditions and Privacy Policy adopt anchored table of contents on left with scrollspy to sections.
- Accessibility statement component and revision history callout at top with download PDF link.
- Contact CTA at bottom linking to support and compliance email addresses.

### Wallet Experience
- Dashboard card showing available balance, locked funds, upcoming payouts, and Add Funds button.
- Transaction ledger table with filters (Type, Status, Date), export CSV action, and dispute button per entry.
- Transfer modal with amount input, destination selection, and fees disclosure summary.
- Integration with checkout surfaces wallet toggle and balance warning state.

### Comment Management Console
- Moderation queue listing flagged comments with filters (Reason, Source, Severity).
- Detail drawer shows comment thread context, user history, action buttons (Approve, Edit, Remove, Escalate).
- Automation rules builder to set keyword filters, rate limits, and escalation workflows.
- Analytics widget summarizing moderation volume, response time, and resolution outcomes.

### Creation Studio Hub
- Tiled layout presenting creation pathways (Create Course, Create Ebook, Schedule Live Session, Build Community) with progress indicators.
- Guidance panel on right with templates, best practice links, and support contact.
- Recent drafts list with status chips, last edited timestamp, and quick actions (Resume, Preview, Publish).
- Announcement banner for new creation features or policy updates.

### Course Creation Wizard
- Multi-step flow: Basics → Curriculum → Pricing → Media → Publish Settings.
- Sidebar progress tracker with validation status icons per step.
- Curriculum builder uses drag-and-drop modules, lesson duplication, and prerequisites mapping.
- Review screen highlights policy checklist compliance before enabling Publish.

### Ebook Creation Wizard
- Stepper: Outline → Content → Media → Metadata → Distribution.
- Content editor supports rich text, embedded media, footnotes, and version history.
- Metadata step collects ISBN, categories, keywords, language; integrates with search indexing.
- Distribution options to toggle storefront visibility, pricing tiers, DRM settings.

### Course Management Dashboard
- Table view with columns (Course, Status, Cohorts, Revenue, Last Updated) plus bulk action toolbar.
- Detail page includes enrollment funnel chart, feedback summary, release schedule timeline, and resource attachments.
- Automation rule cards to set enrollment caps, waitlist behavior, and certificate issuance.
- Activity timeline capturing edits, comments, policy acknowledgements.

### Ebook Management Dashboard
- Library grid showcasing cover previews, price, format, publish date, availability.
- Detail drawer with download stats, ratings, reviews, and distribution channels.
- Update workflow for uploading revisions, adjusting pricing, scheduling promotions.
- Rights management panel listing collaborators and royalty splits.

### Tutor Management
- Directory list with search, filters (Subject, Location, Availability, Rating), and onboarding status.
- Profile detail page featuring bio, certifications, schedule, assigned cohorts, performance analytics.
- Action bar to assign tutors, adjust payouts, send feedback, or deactivate.
- Compliance checklist widget verifying background checks and policy acknowledgements.

### Communities Creation & Management
- Creation form captures name, description, cover imagery, access rules, and content pillars.
- Management dashboard with tabs (Feed Layout, Members, Events, Resources, Moderation Rules).
- Community switcher dropdown in header enabling quick navigation between communities with unread badges.
- Feed configuration area previewing posts, pinned content, and announcement scheduling.

### Community Feed & Switcher
- Feed page displays hero card, filter chips (All, Events, Polls, Resources), and composer with quick actions (Poll, Live Session, Resource).
- Right sidebar shows featured mentors, upcoming events, and trending tags.
- Switcher anchored in header exposes joined communities with search, pin, and reorder capabilities.
- Mobile view transforms switcher into bottom sheet accessible from persistent button.

### Main Site Feed
- Personalized stream combining marketing stories, success spotlights, public community highlights, and blog posts.
- Card variants for video, article, testimonial, data insight with respective call-to-action buttons.
- Infinite scroll with lazy loading; sticky filter bar (Topics, Role, Format).
- Inline subscription prompt for newsletter and product updates.

## Community Spaces
- Community landing features hero, featured discussions, trending resources, event calendar preview.
- Discussion threads displayed in two-column layout: list of threads left, active thread right with message stream, reaction bar, and context sidebar showing pinned resources.
- Events calendar full-width grid with filters for format, location, and cohort relevance.

## Support & Help Center
- Support hub accessible via footer and header utility. Layout: search bar, featured articles, categorized list, contact form.
- Contact form uses multi-step wizard (Issue type → Details → Attachments → Confirmation). Confirmation provides estimated response time and support channels.

## Responsive Considerations
- Breakpoints: 480, 768, 1024, 1280, 1440.
- Tablet view collapses secondary navigation into top-level tabs with dropdown. Mobile view adopts hamburger menu, stacking sections vertically.
- Dashboard cards stack to single column on mobile; analytics charts provide simplified sparkline summaries.

## Deprecations
- Removed legacy top tabs from dashboard in favor of left navigation.
- Deprecated old catalog list view; replaced with card grid to highlight imagery and mentors.
