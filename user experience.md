# User experience

This blueprint defines how Edulure should feel: Skool-style community energy paired with Udemy-grade course depth, wrapped in monetisation-ready surfaces that still run comfortably on a lightweight stack. Each numbered section lists the experience outline followed by assessments A–G covering redundancies, strengths, weaknesses, styling/colour, improvements with justification, a change checklist, and a release sequence.

## 1. Global shell and navigation

### Experience outline
- **Header bar** – Compact top navigation with logo, primary tabs (Feed, Courses, Communities, Tutors, Library), quick-create button, and avatar menu. The header embeds global search, unread indicators, and context-aware CTAs (e.g., "Launch classroom" when a live session is in progress) without requiring a second toolbar.
  - Badge counts and presence pills hydrate from the session context in `frontend-reactjs/src/context/RealtimePresenceContext.jsx`, keeping the shell aware of live rooms and unread discussions.
  - The top-level `AppShell` layout exposes slots for partner branding or seasonal campaigns so marketing can toggle promotions without reworking navigation.
- **Sidebar** – Contextual nav on dashboards with role-aware sections (Learner, Instructor, Admin) and collapsible groups. Each group is derived from the `navigation/routes.js` manifest so dashboards, analytics, and support areas stay synchronised with route-level permissions.
  - Collapsed sidebar mode still surfaces tooltips and keyboard shortcuts, mirroring the desktop productivity tools learners and instructors already use.
  - Inline status chips (e.g., invoice overdue, campaign running) reuse the shared `StatusPill` primitive to avoid bespoke styling per dashboard.
- **Notifications & quick actions** – Bell icon reveals notifications; plus button surfaces create actions for posts, courses, events. The notification panel shows batched updates grouped by surface (communities, courses, payouts) with infinite scroll and quick-dismiss affordances.
  - Quick-create uses the shared modal stack so launching a post or booking from any page keeps validation, autosave, and analytics consistent.
  - Inline preference toggles allow users to mute certain notification categories without leaving the panel, persisting to `UserPreferenceController.updateNotificationChannels`.
- **Responsive behaviour** – Mobile collapses nav into bottom tab bar with floating action button for creation. Tablet layouts adopt a hybrid with a condensed sidebar and sticky header search to preserve discoverability.
  - Breakpoints align with the design tokens declared in `frontend-reactjs/src/styles/tokens.css`, ensuring paddings and tap targets scale with pixel density.
  - The mobile FAB opens a sheet-style menu for creation actions, matching the gesture patterns in the live chat and booking flows.

### Assessments
A. **Redundancy Changes** – Remove duplicate nav components between `layouts/AppShell.jsx` and `layouts/DashboardShell.jsx`; unify notification drawers. Centralise header rendering inside a new `frontend-reactjs/src/components/navigation/AppTopBar.jsx` so badges, presence indicators, monetisation shortcuts, and language selector logic originate from one component tree. The drawer experience should live in `AppNotificationPanel.jsx`, consumed by both learner and admin shells, with analytics fired via `frontend-reactjs/src/lib/analytics.js`.

B. **Strengths to Keep** – Keep concise nav labels, avatar quick menu, and responsive collapse patterns that mimic Skool simplicity. Preserve the deterministic route structure so query caching, breadcrumbs, and deep links continue to work during SSR/CSR transitions, and maintain the avatar status dot and quick-switch menu learners already rely on for class hopping.

C. **Weaknesses to Remove** – Reduce icon inconsistency, improve keyboard focus order, and eliminate redundant breadcrumbs when sidebar already signals context. Map keyboard focus to the order defined in `navigation/routes.js` so screen reader announcements match visual hierarchy, and wire skip links to land inside the main content landmarks. Harmonise tooltip labels with localisation strings to avoid mismatched copy between keyboard and pointer users.

D. **Sesing and Colour Review Changes** – Use the primary indigo for active states, neutral slate backgrounds, and 1px dividers; ensure hover/focus outlines meet contrast guidelines. Introduce semantic colour tokens (`--nav-active`, `--nav-muted`, `--nav-alert`) referenced by both CSS modules and Tailwind utilities so dark-mode and high-contrast variants stay unified. Apply 16px minimum target sizes and 12px spacing rhythm to align with accessibility heuristics.

E. **Improvements & Justification Changes** – Introduce a shared navigation primitive, add personalization for pinning sections, and integrate monetisation badges (ads manager, payouts) to highlight revenue features. Persist pinned links through `UserPreferenceController.updateNavigation` so the shell reflects learner, instructor, or owner priorities automatically, and surface campaign slots that hydrate from `AdsCampaignModel` so monetisation real estate can be rotated without code pushes.

F. **Change Checklist Tracker** – Completion 55%; remaining tasks include: implementing unified analytics events for navigation impressions, adding focus-trap tests for drawers, and seeding demo data for notification categories. No database migrations required beyond user preference extensions; ensure design tokens match the shared set in `styles/tokens.css`.

G. **Full Upgrade Plan & Release Steps** – Build shared nav components, refactor layouts to consume them, audit keyboard navigation, update theme tokens, and release after responsive QA. Sequence: (1) land `AppTopBar` + `AppSidebar` with shared contexts, (2) migrate dashboard and marketing shells, (3) run accessibility sweeps (axe + manual), (4) document personalization controls in `docs/navigation.md`, and (5) ship with announcement banner toggled via feature flags for gradual rollout.

## 2. Marketing site surfaces

### Experience outline
- **Homepage** – Hero with video/image, social proof, pricing CTA, and feature highlights.
- **Landing pages** – Courses, Communities, Tutors marketing sections emphasising benefits with imagery and simple copy.
- **Conversion paths** – Inline forms for waitlists/demo requests and persistent CTA ribbon.

### Assessments
A. **Redundancy Changes** – Combine hero/pitch components reused across marketing pages; centralise testimonial sliders. Drive all hero sections from `frontend-reactjs/src/components/marketing/PrimaryHero.jsx` so video/image slots and CTA ribbons stay in sync.

B. **Strengths to Keep** – Maintain storytelling layout, accessible typography, and balanced white space reminiscent of Skool landing pages.

C. **Weaknesses to Remove** – Replace missing imagery placeholders, optimise video hero for low bandwidth, and reduce heavy animations. Compress assets with the utilities in `frontend-reactjs/src/lib/media.js` and offer static fallbacks for constrained devices.

D. **Sesing and Colour Review Changes** – Use warm neutral backgrounds, highlight CTAs with primary indigo, and ensure gradient overlays keep text legible.

E. **Improvements & Justification Changes** – Add responsive image sets, integrate case-study cards, and embed monetisation callouts (ads revenue, tutor earnings) to align with business goals. Route CMS content through `ContentController.listMarketingBlocks` so marketing teams can run experiments without redeploying code.

F. **Change Checklist Tracker** – Completion 45%; run lighthouse/perf tests; no database updates; ensure marketing CMS data seeded.

G. **Full Upgrade Plan & Release Steps** – Refactor shared marketing components, compress media, add alt-text library, wire analytics funnels, and publish with updated assets.

## 3. Authentication and onboarding

### Experience outline
- **Login/register** – Minimal forms with social login buttons, passwordless option, and CTA to explore communities.
- **Onboarding wizard** – Collects role intent, interest tags, and invites to communities or tutors.
- **Verification** – Inline MFA prompts and email confirmation banners.

### Assessments
A. **Redundancy Changes** – Consolidate forms across login/register/instructor onboarding; reuse validation schemas. Share `frontend-reactjs/src/components/auth/AuthForm.jsx` and `frontend-reactjs/src/utils/validation/auth.js` so error messaging and autofill hints match.

B. **Strengths to Keep** – Preserve quick entry, role-specific messaging, and progress indicator.

C. **Weaknesses to Remove** – Reduce field duplication, surface password requirements early, and improve error states for MFA. Display dynamic hints driven by `AuthController.passwordPolicy` so users know which requirements remain unmet.

D. **Sesing and Colour Review Changes** – Keep backgrounds light, highlight progress bar with primary gradient, and ensure inputs have clear focus outlines.

E. **Improvements & Justification Changes** – Add inline social proof, dynamic copy per persona, and auto-save onboarding responses for continuity. Persist interim answers through `LearnerDashboardController.bootstrapProfile` so returning users resume the wizard seamlessly.

F. **Change Checklist Tracker** – Completion 50%; authentication tests required; no schema changes; ensure onboarding preferences seeded.

G. **Full Upgrade Plan & Release Steps** – Create shared form kit, integrate identity analytics, refine error messaging, test across devices, and roll out with new onboarding copy.

## 4. Learner dashboard experience

### Experience outline
- **Overview cards** – Progress, upcoming sessions, recommendations, and monetisation tips.
- **Feed snapshot** – Community highlights and instructor announcements.
- **Quick actions** – Resume course, join live session, book tutor, upload assignment.

### Assessments
A. **Redundancy Changes** – Merge cards duplicated in DashboardHome and LearnerCourses; unify progress widget. Feed both from `frontend-reactjs/src/components/dashboard/LearnerProgressCard.jsx` to keep metrics aligned with backend services.

B. **Strengths to Keep** – Maintain at-a-glance clarity, role-specific CTAs, and friendly tone.

C. **Weaknesses to Remove** – Address mismatched card heights, avoid data overload, and add skeleton states for slow connections. Use the suspense wrappers already built in `frontend-reactjs/src/components/loaders/SkeletonPanel.jsx` for a cohesive loading story.

D. **Sesing and Colour Review Changes** – Use neutral panels with primary highlights for actions, ensure charts follow accessible palette, and keep ads callouts unobtrusive.

E. **Improvements & Justification Changes** – Add learner goals widget, integrate micro-surveys, and include revenue-focused banners where appropriate. Trigger surveys through `LearnerFeedbackController` so feedback routes to analytics automatically.

F. **Change Checklist Tracker** – Completion 50%; tests for dashboard data queries; ensure analytics events; no schema updates required.

G. **Full Upgrade Plan & Release Steps** – Consolidate widgets, add skeleton loaders, refine layout breakpoints, test data states, and release alongside marketing messaging.

## 5. Courses and learning modules

### Experience outline
- **Course list** – Card grid with thumbnail, instructor, ratings, price, progress.
- **Course viewer** – Sidebar navigation, video player, resources panel, discussion thread.
- **Assessments** – Quiz modal, assignment uploader, certificate preview.

### Assessments
A. **Redundancy Changes** – Replace separate card variants across Courses, Explorer, and Dashboard with a unified component. Standardise on `frontend-reactjs/src/components/course/CourseCard.jsx` so filtering, ratings, and monetisation ribbons stay consistent.

B. **Strengths to Keep** – Preserve simple navigation, inline transcripts, and progress tracking.

C. **Weaknesses to Remove** – Address missing media previews on lessons, harmonise quiz UI, and improve responsive handling of resources panel. Preload lesson thumbnails using metadata from `CourseLessonModel` to prevent blank states on slow connections.

D. **Sesing and Colour Review Changes** – Keep viewer neutral with primary accent for active lessons, ensure video controls match theme, and maintain accessible quiz colour coding.

E. **Improvements & Justification Changes** – Add download manager, provide lesson preview thumbnails, and integrate upsell badges (tutor support, community). Connect upsell badges to `MonetizationCatalogItemModel` entries so promos update automatically when bundles change.

F. **Change Checklist Tracker** – Completion 45%; tests for viewer navigation; ensure preview assets seeded; schema updates for previews if needed.

G. **Full Upgrade Plan & Release Steps** – Build unified course card, refactor viewer layout, enhance quiz component, test on mobile/desktop, and release with instructor guide.

## 6. Communities and social engagement

### Experience outline
- **Community hub** – Hero banner, description, upcoming events, pinned posts.
- **Feed** – Virtualised list with posts, polls, media galleries, and ads placements.
- **Membership controls** – Join/leave buttons, invite modal, role badges.

### Assessments
A. **Redundancy Changes** – Merge feed item renderers across community and global feed; centralise membership modals. Adopt `frontend-reactjs/src/components/community/CommunityFeedList.jsx` as the singular renderer and reuse the membership modal defined in `CommunityJoinModal.jsx`.

B. **Strengths to Keep** – Keep friendly copy, simple filters (All, Announcements, Questions), and inline composer.

C. **Weaknesses to Remove** – Improve media handling, add poll preview images, and prevent overlapping badges. Cache poll assets via `CommunityPostModel` metadata and align badge stacking with the `z-index` tokens defined in `styles/tokens.css`.

D. **Sesing and Colour Review Changes** – Use soft neutral backgrounds, accent badges with secondary colour, and ensure reaction buttons meet contrast rules.

E. **Improvements & Justification Changes** – Introduce shared composer, add drag-and-drop media previews, and integrate community monetisation banners. Drive monetisation banners from `CommunityPaywallTierModel` so offers respect entitlements without manual configuration.

F. **Change Checklist Tracker** – Completion 40%; tests for feed pagination; ensure media storage ready; no schema change besides preview metadata.

G. **Full Upgrade Plan & Release Steps** – Implement shared feed primitives, enhance composer, test moderation tooling, and ship with community rollout.

## 7. Live experiences and support

### Experience outline
- **Live classrooms** – Countdown lobby, stage view with chat, reaction bar, and attendance list.
- **Support lounge** – Ticket submission, knowledge base, live chat fallback.
- **Event replays** – Card grid with thumbnails and tags.

### Assessments
A. **Redundancy Changes** – Unify chat components between live sessions and support lounge; share countdown timer. Mount both experiences on `frontend-reactjs/src/components/live/LiveChatPanel.jsx` and `CountdownTimer.jsx` so feature updates propagate everywhere.

B. **Strengths to Keep** – Maintain calm lobby, clear host controls, and follow-up checklist.

C. **Weaknesses to Remove** – Provide offline fallback for video, reduce clutter in chat panel, and add accessibility captions toggle. Ensure captions leverage the transcript service in `LiveClassroomModel` and persist preferences for future sessions.

D. **Sesing and Colour Review Changes** – Darken stage background, highlight controls with secondary accent, and ensure chat bubbles maintain contrast.

E. **Improvements & Justification Changes** – Add adaptive bitrate controls, integrate knowledge base suggestions, and support session tagging for analytics. Show proactive knowledge base cards by querying the Edulure Search API with the ticket subject before agents respond.

F. **Change Checklist Tracker** – Completion 35%; tests for realtime fallback; ensure knowledge base seeded; schema updates for replay metadata.

G. **Full Upgrade Plan & Release Steps** – Refactor shared chat, add adaptive video toggles, integrate KB surfaces, run live QA, and roll out with facilitator playbook.

## 8. Field services concierge

### Experience outline
- **Concierge dashboard** – Summary of onsite requests, status chips, and technician assignments.
- **Booking flow** – Learner selects time slot, service type, and location.
- **Follow-up** – Post-visit report, satisfaction survey, upsell suggestions.

### Assessments
A. **Redundancy Changes** – Combine booking UI with tutor/live scheduling components; reuse status chips. Render concierge bookings with the same `ScheduleGrid.jsx` and `StatusChip.jsx` primitives used across the platform.

B. **Strengths to Keep** – Maintain clarity of status, map previews, and quick contact options.

C. **Weaknesses to Remove** – Reduce copy complexity, ensure offline availability, and streamline form steps. Provide offline caching via service workers so field staff can access itineraries when connectivity drops.

D. **Sesing and Colour Review Changes** – Use neutral backgrounds, highlight statuses with consistent palette, and keep map overlays legible.

E. **Improvements & Justification Changes** – Add route previews, integrate upsell prompts, and automate reminders. Pull map imagery from lightweight static tiles and store preference data in `FieldServiceOrderModel` for follow-up offers.

F. **Change Checklist Tracker** – Completion 40%; tests for booking conflicts; ensure location data seeded; schema updates for concierge assignments.

G. **Full Upgrade Plan & Release Steps** – Reuse scheduling primitives, add reminder automation, test offline flows, and release with support training.

## 9. Instructor workspace

### Experience outline
- **Dashboard** – Earnings overview, course status, actionable tasks.
- **Creation studio** – Block-based editor, media uploader, preview mode.
- **Community management** – Member approvals, posts scheduling, monetisation toggles.

### Assessments
A. **Redundancy Changes** – Merge creation studio components with learner assignment editors; share analytics widgets. Move to a single `frontend-reactjs/src/components/creation/BlockEditor.jsx` and reuse `AnalyticsSummaryCard.jsx` for instructor earnings snapshots.

B. **Strengths to Keep** – Maintain autosave drafts, quick stats, and supportive copy.

C. **Weaknesses to Remove** – Reduce navigation depth, improve onboarding tooltips, and surface compliance warnings earlier. Display compliance alerts fed by `GovernanceReviewCycleModel` at the top of each studio panel.

D. **Sesing and Colour Review Changes** – Keep neutral workspace, highlight earnings in secondary colour, and ensure charts readable.

E. **Improvements & Justification Changes** – Add task checklist, embed monetisation guidance, and centralise notifications. Tie checklist completion to `CreationProjectModel` milestones so instructors understand progress at a glance.

F. **Change Checklist Tracker** – Completion 45%; tests for autosave; ensure demo data seeded; no schema changes beyond status flags.

G. **Full Upgrade Plan & Release Steps** – Consolidate editors, add task board, refine analytics, test flows with instructors, and launch with documentation.

## 10. Tutor discovery and bookings

### Experience outline
- **Tutor cards** – Photo, expertise, rating, price, availability indicator.
- **Booking modal** – Schedule picker, session goals, payment summary.
- **Post-session feedback** – Rating slider, tip option, share progress.

### Assessments
A. **Redundancy Changes** – Reuse card layout from courses/community experts; centralise booking modal. Adopt `frontend-reactjs/src/components/tutor/TutorCard.jsx` across catalogue and dashboard, and load the shared `BookingModal.jsx`.

B. **Strengths to Keep** – Maintain friendly bios, quick availability scanning, and integrated chat.

C. **Weaknesses to Remove** – Add video intro placeholders, clarify timezone, and ensure booking confirmation is immediate. Render timezone copy with helpers from `utils/dateTime.js` and reuse skeleton placeholders from the course viewer for tutor intros.

D. **Sesing and Colour Review Changes** – Use light cards with accent badges, highlight price with neutral tokens, and keep CTA buttons consistent.

E. **Improvements & Justification Changes** – Embed trust badges, show dynamic availability, and surface upsell packages. Pull availability directly from `TutorAvailabilitySlotModel` and link upsells to curated bundles in `MonetizationCatalogItemModel`.

F. **Change Checklist Tracker** – Completion 45%; tests for booking flow; ensure tutor profiles seeded; schema updates for intro media.

G. **Full Upgrade Plan & Release Steps** – Create shared tutor card, refine booking modal, add review workflow, test edge cases, and deploy with marketing emails.

## 11. Explorer and catalogue

### Experience outline
- **Explorer grid** – Unified search-driven grid mixing courses, communities, tutors, ebooks.
- **Filters** – Role, price, duration, modality, rating, availability.
- **Preview drawer** – Quick view with summary, media, CTA.

### Assessments
A. **Redundancy Changes** – Replace disparate grids with a single card component; centralise filter chips. Reuse the course card component with entity-specific props and share filter chip logic from `frontend-reactjs/src/components/search/FilterChips.jsx`.

B. **Strengths to Keep** – Maintain simple filtering, quick previews, and ability to favourite items.

C. **Weaknesses to Remove** – Add missing image previews, reduce filter clutter, and improve load states. Preload preview imagery via `ExplorerSearchEventEntityModel` metadata and throttle filter counts to the top five per facet for clarity.

D. **Sesing and Colour Review Changes** – Use neutral grid background, highlight active filters with primary outline, and ensure preview drawer uses consistent typography.

E. **Improvements & Justification Changes** – Integrate Edulure Search facets, add infinite scroll with skeletons, and embed monetisation tags (ads placements, featured). Feed featured badges from `AdsCampaignModel` so sponsored listings are labelled automatically.

F. **Change Checklist Tracker** – Completion 40%; tests for search facets; ensure preview assets; schema updates for favourites if needed.

G. **Full Upgrade Plan & Release Steps** – Build unified explorer component, integrate search provider, refine filters, load test, and release with content refresh.

## 12. Search and media preview experience

### Experience outline
- **Search bar** – Persistent global input with suggestions.
- **Results list** – Mixed entity list with badges, preview thumbnails, rating, price.
- **Preview hover** – Image/video snippet, key metrics, quick actions.

### Assessments
A. **Redundancy Changes** – Merge search components across feed, explorer, dashboards; centralise suggestion logic. Migrate to `frontend-reactjs/src/components/search/GlobalSearchBar.jsx` backed by the provider registry for Edulure Search.

B. **Strengths to Keep** – Fast suggestions, keyboard navigation, and result badges.

C. **Weaknesses to Remove** – Replace missing thumbnails, ensure preview caching, and harmonise badges. Cache thumbnails using `ExplorerSearchDailyMetricModel` digests so repeated queries stay fast.

D. **Sesing and Colour Review Changes** – Use light cards with subtle drop shadow, highlight keywords, and maintain accessible hover states.

E. **Improvements & Justification Changes** – Add media preview pipeline, integrate analytics for search-to-enrollment, and support saved searches. Prefill saved search suggestions from `SavedSearchModel` records and show preview skeletons sourced from the ingestion service.

F. **Change Checklist Tracker** – Completion 35%; tests for preview caching; ensure search metadata seeded; schema updates for saved searches.

G. **Full Upgrade Plan & Release Steps** – Build shared search primitive, connect Edulure Search, add preview media, run relevancy QA, and launch with onboarding tips.

## 13. Communities deep dive

### Experience outline
- **Member directory** – Grid with avatars, roles, online status.
- **Resources** – File library, pinned content, recommended courses.
- **Events** – Calendar list and CTA to join or watch replay.

### Assessments
A. **Redundancy Changes** – Consolidate directories across communities and cohorts; reuse file library component. Use `frontend-reactjs/src/components/community/MemberDirectory.jsx` and `ResourceLibrary.jsx` everywhere to prevent drift.

B. **Strengths to Keep** – Maintain friendly member cards, quick DM buttons, and curated resource list.

C. **Weaknesses to Remove** – Fill missing avatar placeholders, add resource previews, and align event styling with live classrooms. Supply fallback avatars from `UserProfileModel` metadata and reuse event badges from the live classroom UI kit.

D. **Sesing and Colour Review Changes** – Keep backgrounds soft, highlight active members with status dots, and ensure file cards respect contrast.

E. **Improvements & Justification Changes** – Add search/filter for members, integrate suggested connections, and include monetisation prompts (sponsored resources). Insert sponsored resource blocks linked to `CommunityResourceModel` records flagged as paid placements.

F. **Change Checklist Tracker** – Completion 40%; tests for directory filters; ensure avatars seeded; schema updates for sponsor tags.

G. **Full Upgrade Plan & Release Steps** – Build shared directory component, enhance resources view, sync events styling, test responsiveness, and deploy with community announcement.

## 14. Moderation and safety surfaces

### Experience outline
- **Flag queue** – Table of reports with severity, content preview, actions.
- **Review workspace** – Side-by-side content viewer, policy checklist, decision buttons.
- **Outcome logging** – Notes field, follow-up tasks, communication templates.

### Assessments
A. **Redundancy Changes** – Merge moderation queue UI across communities and support; reuse checklist forms. Power both from `frontend-reactjs/src/components/moderation/ModerationQueue.jsx` so severity labels and filters align.

B. **Strengths to Keep** – Maintain clear severity badges, quick assign, and audit trail export.

C. **Weaknesses to Remove** – Improve media preview reliability, ensure actions are undoable, and add keyboard shortcuts. Persist undo stacks via `CommunityPostModerationActionModel` so moderators can revert decisions quickly.

D. **Sesing and Colour Review Changes** – Use high-contrast severity chips, subdued background, and ensure preview frames are consistent.

E. **Improvements & Justification Changes** – Add AI-assisted triage suggestions, integrate policy links, and create reminder system for follow-ups. Surface policy snippets stored in `GovernanceContractModel` and schedule reminder tasks with the internal job scheduler.

F. **Change Checklist Tracker** – Completion 45%; tests for audit logging; ensure moderation metadata seeded; schema updates for AI suggestions if added.

G. **Full Upgrade Plan & Release Steps** – Consolidate moderation UI, add AI hooks, extend audit logging, test permissions, and release with moderator training.

## 15. Admin and operator consoles

### Experience outline
- **Control dashboard** – System health, feature flags, incident list.
- **Revenue console** – Payouts, refunds, ads performance.
- **Integrations hub** – API keys, webhooks, partner apps.

### Assessments
A. **Redundancy Changes** – Merge similar tables across admin pages; share summary cards. Base all dashboards on `frontend-reactjs/src/layouts/AdminShell.jsx` and reuse summary cards defined in `AdminSummaryCard.jsx`.

B. **Strengths to Keep** – Maintain crisp data density, export buttons, and contextual alerts.

C. **Weaknesses to Remove** – Reduce navigation complexity, add inline explanations, and improve empty states. Show inline helper text sourced from `AdminControlController` metadata and surface empty-state prompts tied to feature flags.

D. **Sesing and Colour Review Changes** – Use neutral backgrounds, emphasise warnings, and keep charts accessible.

E. **Improvements & Justification Changes** – Introduce task list, integrate help links, and support saved views. Render saved views from `ReportingPaymentsRevenueDailyView.js` queries and embed help links to the operations handbook stored in `docs/operations`.

F. **Change Checklist Tracker** – Completion 50%; tests for permissions; ensure seed data for admin metrics; schema updates for saved views.

G. **Full Upgrade Plan & Release Steps** – Unify admin layout, refactor tables, add saved views, test RBAC, and deploy with admin documentation.

## 16. Settings, profiles, and personalisation

### Experience outline
- **Profile editor** – Avatar upload, bio, preferences, notification toggles.
- **Account security** – Password, MFA, session management.
- **Personalisation** – Interests, learning goals, ad preferences.

### Assessments
A. **Redundancy Changes** – Merge duplicate settings forms across learner/instructor dashboards; reuse toggles. Drive both from `frontend-reactjs/src/components/settings/SettingsLayout.jsx`.

B. **Strengths to Keep** – Maintain autosave feedback, preview panel, and inline guidance.

C. **Weaknesses to Remove** – Improve image cropping, reduce tab sprawl, and fix inconsistent notifications. Adopt the cropper from `components/media/AvatarCropper.jsx` and condense sections using accordions.

D. **Sesing and Colour Review Changes** – Keep neutral panel, highlight important toggles, and ensure error states are accessible.

E. **Improvements & Justification Changes** – Add avatar cropper, integrate recommended content preview, and expose ad preference toggles. Pull recommendations from `LearnerSystemPreferenceModel` and display ad toggles referencing Edulure Ads data usage statements.

F. **Change Checklist Tracker** – Completion 45%; tests for preference saving; ensure defaults seeded; schema updates for ad preferences.

G. **Full Upgrade Plan & Release Steps** – Build shared settings components, add cropping tool, integrate preview, test flows, and release with onboarding email.

## 17. Accessibility and responsiveness

### Experience outline
- **Accessibility** – WCAG 2.1 AA focus, ARIA labeling, reduced motion.
- **Responsiveness** – Breakpoints for mobile/tablet/desktop with consistent behaviours.
- **Performance** – Lazy loading, skeleton screens, offline-friendly caching for core views.

### Assessments
A. **Redundancy Changes** – Eliminate duplicate breakpoint definitions; centralise accessibility helpers. Maintain a single breakpoint map in `styles/tokens.css` and reuse `frontend-reactjs/src/utils/a11y.js` utilities across components.

B. **Strengths to Keep** – Maintain global skip links, typography scale, and reduced motion toggles.

C. **Weaknesses to Remove** – Address oversized bundles, ensure focus traps exist for modals, and refine keyboard navigation. Apply dynamic imports for heavy dashboards and audit focus traps via the shared `Dialog` primitive.

D. **Sesing and Colour Review Changes** – Apply accessible colour tokens, ensure high-contrast mode works, and audit dark theme.

E. **Improvements & Justification Changes** – Add design tokens for spacing/colour, implement responsive grid system, and build automated accessibility checks. Integrate axe CI into `npm run test:accessibility` and document responsive behaviour in `docs/design-system/README.md`.

F. **Change Checklist Tracker** – Completion 40%; tests for a11y/perf; no schema changes; ensure responsive tokens seeded in design system.

G. **Full Upgrade Plan & Release Steps** – Consolidate tokens, run axe/lighthouse audits, optimise bundles, test devices, and release with accessibility statement.
