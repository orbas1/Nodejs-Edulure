# Logic flows

This reference maps Edulure's end-to-end logic in a Skool-meets-Udemy shape. Each numbered flow walks through the backend controllers, database layers, services, and React surfaces that turn a user action into a result while keeping the runtime lightweight (frontend, backend, database). Every section provides an outline followed by assessments labelled A–G: redundancy changes, strengths, weaknesses, styling considerations, improvement plans, change checklists, and a release-ready upgrade sequence.

## 1. Platform setup orchestration

### Flow outline
- **Bootstrap status check** – `SetupController.getStatus` publishes orchestrator readiness, cached run state, and default task sequences so admins understand whether the lite stack (web + internal schedulers) is healthy before running anything.【F:backend-nodejs/src/controllers/SetupController.js†L1-L56】
- **Automated run submission** – `SetupController.startRun` validates selected tasks and hands the payload to `SetupOrchestratorService.startRun`, which sequences environment provisioning, configuration hydration, and seed installation without separate worker binaries.【F:backend-nodejs/src/controllers/SetupController.js†L22-L53】【F:backend-nodejs/src/services/SetupOrchestratorService.js†L1-L180】
- **Progress streaming** – The orchestrator emits checkpoints and persists logs so `frontend-reactjs/src/pages/Setup.jsx` can render cards, retry buttons, and quick-start toggles that default to the lite preset (web, internal jobs, Edulure Search).【F:frontend-reactjs/src/pages/Setup.jsx†L1-L220】
- **Task recovery** – Failed tasks surface remediation hints and allow reruns without reinitialising the stack.

### Assessments
A. **Redundancy Changes** – Remove duplicate polling loops between setup timeline widgets and admin overview cards by consolidating on a single SSE/WebSocket channel with back-off polling as a fallback. Reuse the `useSetupProgress` hook that currently powers `frontend-reactjs/src/pages/Setup.jsx` inside `frontend-reactjs/src/pages/admin/Operations.jsx` so both surfaces depend on the same subscription plumbing and `setup.routes.js` endpoint payloads.

B. **Strengths to Keep** – Keep the modular task registry, checkpoint persistence, and idempotent rerun design that already fits low-load production while enabling diagnostics.

C. **Weaknesses to Remove** – Improve failure categorisation, re-run preset awareness, and automatic recovery so users are not forced to refresh the browser. Persist the last-known error envelope in `SetupOrchestratorService.state` and expose structured keys (`taskId`, `command`, `exitCode`) so the frontend can stage contextual guidance rather than generic failure banners.

D. **Sesing and Colour Review Changes** – Align progress gradients with the primary palette (`#4338ca → #6366f1`), ensure warning toasts use accessible amber tokens, and normalise card shadows to keep the quick-start wizard calm.

E. **Improvements & Justification Changes** – Implement push-based status streaming, append heartbeat metadata to `/setup/status`, and expose preset-aware rerun buttons. This clarifies system health, reduces load, and matches the simplified deployment story. Extending `scripts/dev-stack.mjs` to emit lifecycle webhooks lets admin analytics panels subscribe for audit history without inventing another polling path.

F. **Change Checklist Tracker** – Completion level 60%; integration tests for SSE and preset resolvers pending; structured failure codes required; confirm DB connectivity before each task; no migrations; lite preset seeds only demo data; schema unchanged; setup run model stores preset + heartbeat timestamps.

G. **Full Upgrade Plan & Release Steps** – Extend `SetupOrchestratorService` with an event emitter, enrich the status endpoint with heartbeat/preset data, refactor `Setup.jsx` for push updates, add preset rerun buttons, and ship behind a feature flag after smoke tests. Document the behaviour in `README.md` and `EDULURE_GUIDE.md` so newcomers run `npm run dev:stack` without misconfiguring optional services.

## 2. Operational services footprint (worker, realtime, search)

### Flow outline
- **Background jobs** – Schedulers for ingestion, reminders, telemetry, and integrations run inside `backend-nodejs/src/server.js`, activated by preset flags so lite deployments only enable essentials.【F:backend-nodejs/src/server.js†L1-L220】
- **Realtime gateway** – WebSocket namespaces (feed, classrooms, chat) mount on the same HTTP server, sharing authentication middleware and supporting Redis pub/sub when present.【F:backend-nodejs/src/servers/realtimeServer.js†L1-L200】
- **Search layer** – Edulure Search replaces Meilisearch with Postgres-powered adapters providing full-text queries, trigram matching, and media metadata sourced from materialised views refreshed by jobs in `backend-nodejs/src/jobs/search`.

### Assessments
A. **Redundancy Changes** – Remove duplicate environment parsing between worker/realtime binaries and consolidate configuration loading, logging, and health endpoints inside the unified backend server. Fold `servers/workerService.js` and `servers/realtimeServer.js` bootstrap flags into a shared helper so `server.js` and `src/bin/stack.js` depend on the same configuration contract.

B. **Strengths to Keep** – Preserve explicit scheduler registration, readiness checks, and modular adapters so scaling back to multi-process deployments remains possible if load increases.

C. **Weaknesses to Remove** – Retire the Meilisearch dependency, prevent double warmups, and mitigate event-loop blocking by isolating heavy jobs behind cooperative schedulers. Batch long-running ingestion tasks through `AssetIngestionJobModel` checkpoints and enforce concurrency caps to avoid starving classroom websocket loops.

D. **Sesing and Colour Review Changes** – Standardise structured log prefixes (`[jobs]`, `[realtime]`, `[search]`) with consistent ANSI colours; ensure dashboard indicators use accessible success/error tokens when reflecting internal service health.

E. **Improvements & Justification Changes** – Introduce a provider registry (`searchProviders.js`), add Postgres search adapters, and bundle realtime + jobs into the main server with preset toggles. This keeps operations simple while maintaining observability. Instrument the consolidated services with the metrics utilities in `config/metrics.js` so admin dashboards can display job lag and socket utilisation.

F. **Change Checklist Tracker** – Completion level 45%; add provider selection tests and realtime auth coverage; centralise search error handling; build Postgres indexes/materialised views; create migrations and seeders for search documents; extend schema for scheduler checkpoints; add ORM models for search docs.

G. **Full Upgrade Plan & Release Steps** – Ship migrations for indexes/views, implement provider registry defaulting to Edulure Search, refactor job bootstrap into `server.js`, embed realtime namespaces, run regression tests, and deprecate external service docs after validation. Update `docker-compose.yml` comments to signal that external worker/realtime containers are optional for lite deployments.

## 3. Unified stack bootstrap options

### Flow outline
- **Developer convenience** – `scripts/dev-stack.mjs` provisions the database, seeds lite data, and launches backend + frontend concurrently with preset-aware flags and structured logs.【F:scripts/dev-stack.mjs†L1-L170】
- **Backend stack entrypoint** – `backend-nodejs/src/bin/stack.js` reads `SERVICE_TARGET` and presets, starting web, jobs, realtime, and media orchestration inside a single Node process suitable for production lite deployments.【F:backend-nodejs/src/bin/stack.js†L1-L120】
- **Production mirroring** – `npm run start:stack --workspace backend-nodejs -- --preset=full` mirrors staging/production boots without nodemon, keeping one backend container.

### Assessments
A. **Redundancy Changes** – De-duplicate restart logic between the monorepo script and backend bin by centralising supervisor utilities and signal handling in a shared helper. Align `scripts/dev-stack.mjs` child-process handling with `backend-nodejs/src/bin/stack.js` so they both rely on a new `scripts/lib/processSupervisor.mjs` abstraction that formats lifecycle events consistently.

B. **Strengths to Keep** – Maintain the one-command workflow, health-gated frontend startup, and preset toggles reflecting the simplified platform footprint.

C. **Weaknesses to Remove** – Prevent all schedulers from running by default, reduce combined log noise, and avoid cascading restarts when a child process exits unexpectedly. Adopt preset-aware defaults that keep telemetry and monetisation jobs paused until the corresponding feature flags in `config/featureFlags.js` activate.

D. **Sesing and Colour Review Changes** – Harmonise CLI output colours (info blue, success green, warn amber, error red) and update README screenshots to reflect calmer layouts.

E. **Improvements & Justification Changes** – Add preset parsing (`lite`, `full`, `ads-analytics`), restructure logs as NDJSON for optional forwarding, and allow targeted restarts per subsystem. This keeps startup reliable and debuggable. Tying each process handle to the readiness probes already exported from `server.js` allows health dashboards in `frontend-reactjs/src/pages/admin/Operations.jsx` to surface green/yellow/red states without additional API shape changes.

F. **Change Checklist Tracker** – Completion level 70%; smoke tests for preset propagation pending; handle spawn failures gracefully; ensure migrations run automatically; no new migrations; lite seed installs minimal demo data; schema unchanged; models unaffected.

G. **Full Upgrade Plan & Release Steps** – Refactor supervisor utilities into `scripts/lib/processSupervisor.mjs`, implement preset parser, switch to NDJSON logging with optional pretty-print, add targeted restart commands, document workflow, and run end-to-end smoke tests.

## 4. Search service substitution playbook

### Flow outline
- **Current state** – Meilisearch clients instantiate via `createSearchConfiguration`, expecting external hosts and API keys in `backend-nodejs/src/config/searchConfig.js`.
- **Desired state** – Edulure Search operates entirely within Postgres, exposing REST endpoints through existing controllers (`CatalogueController`, `ExplorerController`, `SearchController` shim) without new ports.【F:backend-nodejs/src/controllers/CatalogueController.js†L1-L160】【F:backend-nodejs/src/controllers/ExplorerController.js†L1-L120】
- **Index lifecycle** – Materialised views and trigger-based refreshes keep search documents in sync for courses, communities, tutors, tickets, ebooks, and ads inventory.
- **Frontend integration** – Shared hooks in `frontend-reactjs/src/hooks/useSearch.js` feed list components on Courses, Communities, Explorer, Tutors, and Ebooks pages with thumbnails and media previews.

### Assessments
A. **Redundancy Changes** – Remove duplicate search adapters and consolidate query builders so the codebase references one shared interface regardless of provider. Deprecate `frontend-reactjs/src/hooks/useMeiliSearch.js` in favour of a provider-agnostic `useSearchProvider` hook that resolves to the Postgres-powered implementation by default.

B. **Strengths to Keep** – Retain query highlighting, facet filtering, and analytics instrumentation already implemented in frontend hooks and backend controllers.

C. **Weaknesses to Remove** – Prevent inconsistent pagination across surfaces, mitigate stale indexes, and ensure thumbnail metadata is available offline. Schedule `ExplorerSearchDailyMetricModel` refreshes after every bulk import and expose delta timestamps so the UI can display freshness badges.

D. **Sesing and Colour Review Changes** – Align skeleton loaders and thumbnail frames across results, adopt consistent focus outlines, and keep hover states subtle for reduced motion users.

E. **Improvements & Justification Changes** – Introduce Postgres search views, unify search service API, and implement shared media preview metadata. This eliminates external dependencies while preserving functionality. Backfill preview assets using the ingestion pipeline that already feeds `ContentAssetModel` so course, tutor, and community results always show imagery even without manual uploads.

F. **Change Checklist Tracker** – Completion level 40%; requires migrations for indexes/views; add unit tests for query builders; implement seeding for search documents; ensure schema includes preview assets; update models for search entities.

G. **Full Upgrade Plan & Release Steps** – Create migrations for search documents, implement `EdulureSearchProvider`, refactor controllers to use provider interface, update frontend hooks to request preview metadata, test relevancy, and release with fallback toggles.

## 5. Learner acquisition to enrollment

### Flow outline
- **Marketing discovery** – Visitors land on `frontend-reactjs/src/pages/Home.jsx` and `Marketing` surfaces pulling hero, testimonials, and pricing content from `ContentController.listMarketingBlocks` and CMS-backed repositories.【F:frontend-reactjs/src/pages/Home.jsx†L1-L220】【F:backend-nodejs/src/controllers/ContentController.js†L1-L200】
- **Account creation** – Registration flows run through `AuthController.register`, storing identities via `UserModel` and `IdentityVerificationController` when MFA or document checks are required.【F:backend-nodejs/src/controllers/AuthController.js†L1-L180】
- **Onboarding** – `frontend-reactjs/src/pages/Register.jsx` collects role intent (learner/instructor) and optional community invites, posting to `LearnerDashboardController.bootstrapProfile`.
- **Plan selection** – Checkout surfaces in `frontend-reactjs/src/pages/Courses.jsx` and `dashboard/DashboardHome.jsx` call `PaymentController.createCheckoutSession` to enrol learners in subscriptions or one-off purchases.【F:backend-nodejs/src/controllers/PaymentController.js†L1-L200】

### Assessments
A. **Redundancy Changes** – Remove duplicated hero/CTA components between Home, Courses, and Communities marketing pages; centralise onboarding forms shared between Register and BecomeInstructor flows. Refactor to the shared `frontend-reactjs/src/components/marketing/PrimaryHero.jsx` and wire the same schema validators declared in `frontend-reactjs/src/utils/validation/onboarding.js`.

B. **Strengths to Keep** – Keep narrative storytelling, minimal form steps, and role-aware onboarding that invites learners directly into communities upon signup.

C. **Weaknesses to Remove** – Address inconsistent pricing tiles, reduce friction from optional steps that feel mandatory, and streamline email verification messaging. Ensure `PaymentController.createCheckoutSession` returns contextual upsell descriptors so the frontend can explain when an add-on (e.g. community bundle) is optional.

D. **Sesing and Colour Review Changes** – Use the primary indigo palette for CTAs, keep backgrounds neutral, and ensure pricing cards follow an accessible contrast ratio with badges for best value.

E. **Improvements & Justification Changes** – Introduce shared marketing layout, inline plan comparisons, and contextual upsells to communities/tutors that support monetisation without overwhelming new users. Pair each CTA with analytics events logged via `frontend-reactjs/src/lib/analytics.js` to measure conversion from Skool-style social proof to Udemy-style catalogue purchase.

F. **Change Checklist Tracker** – Completion 55%; requires marketing component refactors, analytics validation for conversion funnels, no schema changes, but ensure seeding includes sample plans and invites.

G. **Full Upgrade Plan & Release Steps** – Build shared hero/pricing components, refactor Register/BecomeInstructor forms to share schema, integrate analytics events, run A/B tests on CTA copy, and launch with updated marketing assets.

## 6. Course consumption and completion

### Flow outline
- **Course discovery** – Learners browse `frontend-reactjs/src/pages/Courses.jsx`, fed by `CourseController.listCourses` with tagging, rating, and progress metadata.【F:backend-nodejs/src/controllers/CourseController.js†L1-L220】
- **Enrollment gating** – `CourseController.enroll` verifies purchase entitlement before adding the learner to course rosters and provisioning modules.
- **Learning workspace** – `dashboard/CourseViewer.jsx` consumes module/lesson APIs, streaming video via `MediaUploadController` signed URLs and tracking progress through `LearnerProgressService`.
- **Completion & certification** – `DashboardAssessments.jsx` triggers quiz submissions handled by `DashboardController.submitAssessment`; completion posts to `AchievementsService` and notifies `LearnerDashboardController` for certificate generation.

### Assessments
A. **Redundancy Changes** – Consolidate module navigation components reused in CourseViewer, LearnerCourses, and DashboardHome; remove duplicate progress tracking hooks. Migrate all lesson completion tracking to the shared `useLearnerProgress` hook backed by `backend-nodejs/src/services/LearnerProgressService.js` so dashboards reflect a single source of truth.

B. **Strengths to Keep** – Retain progress persistence, offline-capable lesson caching, and contextual discussion threads linking to community chats.

C. **Weaknesses to Remove** – Resolve inconsistent quiz result messaging, improve handling of large media assets on low bandwidth, and tighten certificate issuance automation. Ensure `CourseAssignmentModel` submissions trigger asynchronous grading jobs only when required, preventing UI stalls during uploads.

D. **Sesing and Colour Review Changes** – Use calm neutrals for lesson background, highlight active module with primary accents, ensure quiz feedback uses supportive greens/ambers, and keep certificate previews printable.

E. **Improvements & Justification Changes** – Introduce shared progress bar components, compress media previews, and automate certificate generation with templated backgrounds to reduce support load. Render certificate previews in `frontend-reactjs/src/components/certification/CertificatePreview.jsx` using brand tokens so learners perceive the reward immediately after passing.

F. **Change Checklist Tracker** – Completion 50%; tests needed for module navigation and certificate issuance; ensure database tracks lesson completions; migrations for achievements table may be required; seeders for sample courses/certificates; update models for achievements.

G. **Full Upgrade Plan & Release Steps** – Build shared course navigation primitives, refactor progress hooks, implement certificate templates, add tests covering progress/completion, and release alongside documentation updates.

## 7. Learner profile and personalisation

### Flow outline
- **Profile viewing/editing** – `frontend-reactjs/src/pages/Profile.jsx` loads identity data via `UserController.getProfile` and consumes the bundled settings payload from `LearnerDashboardController.getPersonalisationSettings`, while the companion `getNotificationSettings` endpoint exposes the latest toggle state through the shared `SettingsLayout`. First-load hydration creates default rows so dashboard and profile surfaces stay in sync for brand-new learners.【F:frontend-reactjs/src/pages/Profile.jsx†L720-L804】【F:backend-nodejs/src/controllers/LearnerDashboardController.js†L504-L644】
- **Avatar and media uploads** – `MediaUploadController.createUpload` continues to issue signed URLs for profile assets while the profile surface reuses the shared dropzone components to keep branding consistent across learner and community experiences.【F:backend-nodejs/src/controllers/MediaUploadController.js†L1-L200】
- **Preferences & goals** – `LearnerDashboardController.updatePersonalisationSettings` writes learning pace, recommendation, and monetisation choices through `LearnerSystemPreferenceModel` and the paired notification/security models seeded with defaults that inform dashboard recommendations.【F:backend-nodejs/src/services/LearnerDashboardService.js†L810-L910】
- **Security settings** – `LearnerDashboardController.updateSecuritySettings` coordinates `LearnerSecuritySettingModel` and `UserModel` to enforce MFA preferences, device alerts, and session expiries that the profile UI surfaces after each acknowledgement.【F:backend-nodejs/src/services/LearnerDashboardService.js†L912-L998】

### Assessments
A. **Redundancy Changes** – Consolidate settings fetches into `LearnerDashboardService.getLearnerSettingsBundle` so profile and dashboard surfaces share toggle primitives, caching, and optimistic updates instead of duplicating API wiring.【F:backend-nodejs/src/services/LearnerDashboardService.js†L956-L964】

B. **Strengths to Keep** – Preserve inline validation, autosave feedback, and confirmation toasts while extending acknowledgement metadata so the UI continues to reassure learners when changes land.【F:frontend-reactjs/src/pages/Profile.jsx†L960-L1080】

C. **Weaknesses to Remove** – Normalise boolean and enum inputs, guard metadata serialisation, and seed defaults so throttled uploads or malformed payloads cannot corrupt learner preferences. Wrapped personalisation merges in helper functions to bound learning pace values and accessibility toggles.【F:backend-nodejs/src/services/LearnerDashboardService.js†L62-L220】【F:backend-nodejs/src/models/LearnerSecuritySettingModel.js†L1-L216】

D. **Sesing and Colour Review Changes** – Maintain the neutral settings canvas while reusing `ToggleField` styles to keep focus outlines, contrast, and spacing aligned across new notification and security sections.【F:frontend-reactjs/src/components/settings/ToggleField.jsx†L1-L60】

E. **Improvements & Justification Changes** – Ship dedicated notification and security tables via `20250329091500_learner_profile_settings.js`, update models, and seed realistic defaults so recommendation, communication, and MFA toggles remain auditable across sessions.【F:backend-nodejs/migrations/20250329091500_learner_profile_settings.js†L1-L44】【F:backend-nodejs/seeds/001_bootstrap.js†L1900-L2058】

F. **Change Checklist Tracker** – Completion 100%; migrations applied, models normalise booleans, seeds populate learner defaults, and controller endpoints sanitise payloads ahead of follow-up automated preference tests.【F:backend-nodejs/src/controllers/LearnerDashboardController.js†L504-L660】

G. **Full Upgrade Plan & Release Steps** – Apply migration, re-run seeds, validate Profile.jsx renders bundled settings, and execute personalisation/notification/security updates through the new endpoints before announcing the unified settings contract.【F:backend-nodejs/src/routes/dashboard.routes.js†L48-L69】

## 8. Community feed and engagement

### Flow outline
- **Feed aggregation** – `FeedController.list` aggregates posts, announcements, and course updates, storing denormalised timelines in Redis/Postgres for quick fetches.【F:backend-nodejs/src/controllers/FeedController.js†L1-L180】
- **Frontend consumption** – `frontend-reactjs/src/pages/Feed.jsx` and `dashboard/LearnerSocial.jsx` use virtualised lists, infinite scroll, and reaction buttons to keep experiences light.
- **Posting & reactions** – `CommunityController.createPost` handles text/media uploads; `CommunityEngagementController.toggleReaction` stores likes, while `CommunityChatController` powers comment threads.
- **Moderation** – `CommunityModerationController.flagContent` and `AdminModeration dashboards` capture reports and escalate to staff.

### Assessments
A. **Redundancy Changes** – Consolidate feed item renderers across Feed, Communities, and DashboardHome; unify reaction handlers and analytics events. Leverage `frontend-reactjs/src/components/feed/FeedList.jsx` and `frontend-reactjs/src/components/feed/Composer.jsx` as the single implementation so moderation hooks and ads slots operate identically.

B. **Strengths to Keep** – Preserve role-aware feeds (learner/instructor/admin), contextual filters, and inline composer with autosave drafts.

C. **Weaknesses to Remove** – Reduce flicker during infinite scroll, provide better empty states, and handle media ratio mismatches. Prefetch pinned content through `CommunityPostModel` queries that include `mediaAssetId` fields, letting the client reuse cached responses instead of issuing redundant fetches.

D. **Sesing and Colour Review Changes** – Standardise card spacing, ensure reaction buttons use subdued gradients, and keep community badges consistent across light/dark themes.

E. **Improvements & Justification Changes** – Build shared feed primitives, integrate caching for media thumbnails, and extend moderation metadata to include context for reports. Logging feed impression events with `CommunityGrowthExperimentModel` data keeps the monetisation engine calibrated without adding bespoke analytics code paths.

F. **Change Checklist Tracker** – Completion 50%; requires component consolidation, caching improvements, and moderation analytics; no schema changes beyond feed denormalisation tables; update seeders with example posts.

G. **Full Upgrade Plan & Release Steps** – Implement shared feed components, refactor reaction hooks, improve empty states, add moderation dashboards, and deploy after load testing virtualised lists.

## 9. Tutor discovery and live session booking

### Flow outline
- **Tutor catalogue** – `frontend-reactjs/src/pages/TutorProfile.jsx` and `Explorer` surfaces query `InstructorBookingController.listTutors` for availability, expertise, and pricing.【F:backend-nodejs/src/controllers/InstructorBookingController.js†L1-L200】
- **Availability management** – Tutors manage schedules via `dashboard/InstructorTutorSchedule.jsx`, posting updates to `InstructorSchedulingController.updateAvailability`.
- **Booking request** – Learners submit booking forms from `dashboard/LearnerBookings.jsx`; backend validates conflicts and creates sessions with `InstructorBookingController.createBooking`.
- **Session delivery** – When the booking starts, realtime channels from `DirectMessageController` and `LiveClassrooms` coordinate messaging/video; session summaries stored via `LearnerSupportController.logSession`.

### Assessments
A. **Redundancy Changes** – Combine booking components across learner/instructor dashboards; unify calendar widgets and timezone handling. Extract a shared `frontend-reactjs/src/components/scheduling/ScheduleGrid.jsx` used by both dashboards and connect it to the same timezone helpers in `frontend-reactjs/src/utils/dateTime.js`.

B. **Strengths to Keep** – Maintain quick availability checks, pre-session questionnaires, and integrated messaging.

C. **Weaknesses to Remove** – Improve failure handling for double bookings, provide clearer timezone context, and ensure payment holds release automatically if tutors decline. Wrap booking creation in a database transaction touching `TutorAvailabilitySlotModel` and `TutorBookingModel` so rollback is guaranteed when a conflict occurs.

D. **Sesing and Colour Review Changes** – Use calm neutrals for scheduler backgrounds, highlight confirmed sessions with primary badges, and keep error states accessible.

E. **Improvements & Justification Changes** – Introduce shared scheduling primitives, expand notifications, and add asynchronous workflows for tutor acceptance to reduce friction. Expose booking lifecycle events to the notifications service powering `DirectMessageModel` threads so learners receive consistent reminders across web and mobile.

F. **Change Checklist Tracker** – Completion 40%; tests needed for booking conflicts; ensure database stores session logs; migrations for availability tables may exist; update seeders with tutor availability; adjust models for booking states.

G. **Full Upgrade Plan & Release Steps** – Build shared calendar components, refactor booking controllers for transactional integrity, add notifications, test acceptance flows, and release with communications plan.

## 10. Live classrooms and events

### Flow outline
- **Event scheduling** – `LiveClassrooms.jsx` interfaces with `InstructorLiveClassesController` to create sessions, storing metadata via `LiveClassroomModel` (time, capacity, streaming URL).
- **Attendance management** – Learners join via `LearnerLiveClasses.jsx`, connecting to realtime channels for stage/chat, while `RealtimeServer` manages presence and emoji feedback.
- **Content capture** – Sessions optionally record to cloud storage orchestrated by `MediaUploadController` jobs; recordings later appear in CourseViewer.
- **Post-event follow-up** – Surveys and replays triggered through `DashboardAssessments` and notifications.

### Assessments
A. **Redundancy Changes** – Merge event scheduling UI with tutor calendars; unify presence tracking with chat features. Reuse the shared scheduling grid and channel adapters powering tutor bookings so host dashboards and learner calendars stay consistent.

B. **Strengths to Keep** – Keep countdown timers, backstage preview for hosts, and automatic replay publishing.

C. **Weaknesses to Remove** – Improve fallback for unstable networks, reduce CPU impact of redundant animation, and tighten permissions for backstage controls. Persist attendance checkpoints in `LiveClassroomModel` and buffer analytics events so restarts do not lose engagement telemetry.

D. **Sesing and Colour Review Changes** – Use darkened stage backgrounds, highlight host controls with secondary accents, and keep chat bubbles legible on both light/dark themes.

E. **Improvements & Justification Changes** – Add adaptive bitrate streaming, provide low-bandwidth toggles, and display unified analytics (attendance, engagement). Sync recordings with `ContentAssetModel` so replay cards automatically surface thumbnails and duration metadata.

F. **Change Checklist Tracker** – Completion 35%; tests for presence/resume flows needed; ensure schema tracks live session metrics; migrations for analytics tables; seeders for demo events; update models for live sessions.

G. **Full Upgrade Plan & Release Steps** – Integrate scheduling UI, refactor realtime presence, add adaptive streaming options, build analytics dashboards, and launch with host training.

## 11. Instructor course authoring and publishing

### Flow outline
- **Ideation** – `dashboard/InstructorCourseCreate.jsx` uses `CreationStudioController` to spin up course shells, store outlines, and assign collaborators.【F:backend-nodejs/src/controllers/CreationStudioController.js†L1-L200】
- **Content upload** – Modules and lessons upload via `MediaUploadController` and `CourseController.createLesson`; assets processed by background jobs inside the backend runtime.
- **Pricing & monetisation** – `InstructorPricing.jsx` posts to `AdminMonetizationController.setCoursePricing` for plan alignment and revenue share configuration.
- **Publishing** – `InstructorCourseManage.jsx` triggers `CourseController.publishCourse`, which validates completeness, compliance, and marketing assets before exposing the course in catalogue feeds.

### Assessments
A. **Redundancy Changes** – Collapse duplicate lesson editors between CreationStudio and CourseManage; reuse pricing forms across course and live event offerings. Base both authoring flows on `frontend-reactjs/src/components/creation/BlockEditor.jsx` and centralise pricing schemas in `frontend-reactjs/src/utils/validation/pricing.js`.

B. **Strengths to Keep** – Maintain autosave drafts, collaborative comments, and preview links for QA reviewers.

C. **Weaknesses to Remove** – Reduce lag in media uploads, add clearer status indicators (draft, in review, published), and ensure compliance checklists are surfaced early. Emit progress events from the ingestion jobs in `backend-nodejs/src/jobs/mediaIngestion` so instructors see real-time status in the studio.

D. **Sesing and Colour Review Changes** – Keep creation surfaces neutral with accent highlights for callouts, ensure form labels remain high contrast, and align preview cards with learner view styling.

E. **Improvements & Justification Changes** – Implement shared block editor, background upload queue status, and compliance gating to reduce support escalations. Tie compliance gating to `GovernanceReviewCycleModel` records so publishing waits on required approvals without manual spreadsheets.

F. **Change Checklist Tracker** – Completion 45%; tests for autosave and publishing workflow needed; ensure schema stores draft states; migrations for compliance flags; seeders include sample instructor assets; update models for review states.

G. **Full Upgrade Plan & Release Steps** – Build shared editors, implement status indicators, add compliance gating, test end-to-end publishing, and launch with instructor comms.

## 12. Monetisation and checkout

### Flow outline
- **Cart & checkout** – `frontend-reactjs/src/pages/Courses.jsx` and `DashboardHome` integrate with `PaymentController` to create checkout sessions, supporting Stripe or in-house processors.【F:backend-nodejs/src/controllers/PaymentController.js†L1-L200】
- **Entitlements** – `CourseController.enroll`, `CommunityMonetizationController.grantAccess`, and `TutorBookingController.confirmPayment` grant access after payment success.
- **Revenue sharing** – `AdminRevenueManagementController` calculates payouts, while `AdminMonetizationController` sets product pricing and coupons.
- **Ads monetisation** – `AdsController` handles inventory, targeted placements, and Edulure Ads campaigns inserted into feeds/dashboards.

### Assessments
A. **Redundancy Changes** – Combine checkout modals across courses, tutors, communities; unify price card components; ensure coupon validation centralised. Share `frontend-reactjs/src/components/checkout/CheckoutDialog.jsx` and a unified pricing summary component so upsells render consistently.

B. **Strengths to Keep** – Maintain transparent pricing, upsells, and revenue dashboards that align instructor/owner incentives.

C. **Weaknesses to Remove** – Address inconsistent receipt emails, improve refund workflows, and guarantee ads placement respects opt-outs. Link refunds to `PaymentRefundModel` state transitions and ensure ad impressions honour preferences stored in `LearnerSystemPreferenceModel`.

D. **Sesing and Colour Review Changes** – Keep checkout forms clean with high contrast, emphasise secure payment badges, and style ads units with subtle frames that match feed aesthetics.

E. **Improvements & Justification Changes** – Build shared checkout component, integrate ads campaign manager with analytics, and automate payout scheduling. Surface cross-sell data from `MonetizationCatalogItemModel` so owners can launch bundles without manual configuration.

F. **Change Checklist Tracker** – Completion 55%; tests for coupon/proration needed; ensure schema stores ads campaigns and payouts; migrations for payout schedules; seeders for demo offers; update models for ads inventory.

G. **Full Upgrade Plan & Release Steps** – Implement shared checkout flows, refactor monetisation controllers, add payout automation, integrate ads analytics, and release after finance QA.

## 13. Admin oversight, compliance, and operations

### Flow outline
- **Control centre** – `dashboard/admin/AdminControl.jsx` surfaces health, audit logs, and feature toggles from `AdminControlController`.
- **Compliance workflows** – `ComplianceController` tracks policy acknowledgements, while `SecurityOperationsController` manages incident response and MFA enforcement.
- **Revenue ops** – `AdminRevenueManagementController` monitors payouts, refunds, and chargebacks with ledger exports.
- **Feature flags & releases** – `AdminFeatureFlagController` toggles experiments; `ReleaseManagementController` orchestrates staged rollouts.

### Assessments
A. **Redundancy Changes** – Merge overlapping dashboards (control vs operations), unify audit log viewers, and consolidate notification settings. Drive both admin shells from `frontend-reactjs/src/layouts/AdminShell.jsx` and hydrate audit trails through a single `AuditLogController` feed.

B. **Strengths to Keep** – Preserve granular permissions, export capabilities, and real-time alerts for incidents.

C. **Weaknesses to Remove** – Reduce clutter in admin nav, improve cross-linking between compliance issues and remediation tasks, and ensure feature flag context is clear. Link compliance alerts to `GovernanceContractModel` records so operators know which documentation to update.

D. **Sesing and Colour Review Changes** – Use neutral dashboards with status badges (green/yellow/red), ensure tables support high contrast, and provide dark-mode friendly charts.

E. **Improvements & Justification Changes** – Introduce unified admin layout, contextual quick links, and checklist-driven remediation flows to streamline operations. Surface `ReleaseChecklistItemModel` status blocks directly on the admin dashboard to guide release readiness.

F. **Change Checklist Tracker** – Completion 50%; tests for permission gating; ensure schema stores audit events; migrations for compliance checklists; seeders for demo incidents; update models for audit records.

G. **Full Upgrade Plan & Release Steps** – Build consolidated admin shell, refactor controllers for shared filters, add remediation workflows, test permissions, and launch with admin training.

## 14. Support, moderation, and escalation

### Flow outline
- **Ticket intake** – `LearnerSupportController.createTicket` receives support issues; `frontend-reactjs/src/pages/dashboard/LearnerSupport.jsx` provides guided forms with topic-specific questions.【F:backend-nodejs/src/controllers/LearnerDashboardController.js†L1-L220】
- **Agent workspace** – `dashboard/admin/AdminOperator.jsx` surfaces triage queues pulling from `AdminBookingController`, `CommunityModerationController`, and `SupportTicketRepository`.
- **Escalations** – Severity-based escalations route through `SecurityOperationsController` or `ComplianceController` depending on policy impact.
- **Resolution & feedback** – Tickets close with survey prompts, feeding analytics and knowledge base updates.

### Assessments
A. **Redundancy Changes** – Reduce duplicate ticket forms across support and field services; merge moderation queues where possible. Point all request types to `frontend-reactjs/src/components/support/TicketForm.jsx` and reuse queue tables populated by `CommunityPostModerationCaseModel` for unified triage.

B. **Strengths to Keep** – Maintain guided triage, SLA timers, and contextual knowledge base links.

C. **Weaknesses to Remove** – Address inconsistent escalation notes, improve notification cadence, and ensure knowledge base search surfaces relevant fixes. Store escalation breadcrumbs directly on `SupportTicketModel` (to be introduced) so agents see previous actions without scanning chat logs.

D. **Sesing and Colour Review Changes** – Use soft neutrals for ticket cards, highlight SLA breaches with amber/red, and keep moderation flags readable.

E. **Improvements & Justification Changes** – Implement shared ticket schemas, integrate search across tickets/KB, and automate escalations with templated responses. Index resolution articles via the Edulure Search provider so agents receive suggestion chips while typing replies.

F. **Change Checklist Tracker** – Completion 45%; tests for escalation routing; ensure schema stores SLA timestamps; migrations for escalation tables; seeders for demo tickets; update models for ticket states.

G. **Full Upgrade Plan & Release Steps** – Build shared ticket components, refactor controllers for unified schemas, add automation, test escalation flows, and roll out with support training.

## 15. Ads and sponsorship management

### Flow outline
- **Campaign creation** – `dashboard/EdulureAds.jsx` lets admins craft campaigns backed by `AdsController.createCampaign`, storing creatives, targeting, and budget.【F:backend-nodejs/src/controllers/AdsController.js†L1-L200】
- **Placement & delivery** – `FeedController` and `ExplorerController` request eligible ads via `AdsService.selectPlacements`, returning cards styled to match feed aesthetics.
- **Measurement** – `AnalyticsController` records impressions/clicks; results surface in dashboards for owners and advertisers.
- **Compliance** – `GovernanceController` ensures disclosures and opt-outs are honoured, integrating with profile preferences.

### Assessments
A. **Redundancy Changes** – Combine campaign forms across feed and explorer placements; unify creative upload workflows. Base creation on `frontend-reactjs/src/components/ads/CampaignEditor.jsx` and store creatives through the same `MediaUploadController` path used by marketing pages.

B. **Strengths to Keep** – Maintain granular targeting, frequency caps, and easy toggles for campaign status.

C. **Weaknesses to Remove** – Improve preview accuracy, add brand safety controls, and ensure analytics latency is minimal. Validate placements using `AdsCampaignModel` targeting rules before saving so misconfigured campaigns are caught early.

D. **Sesing and Colour Review Changes** – Keep ad frames subtle with disclosure badges, ensure CTA buttons follow brand guidelines, and support dark/light variants.

E. **Improvements & Justification Changes** – Build live previews, integrate opt-out settings, and provide automated pacing recommendations to increase revenue without hurting UX. Surface budget pacing forecasts from `AdsCampaignMetricModel` to highlight when spend deviates from plan.

F. **Change Checklist Tracker** – Completion 40%; tests for targeting logic; schema must store campaign metrics; migrations for pacing tables; seeders for sample campaigns; update models for ads entities.

G. **Full Upgrade Plan & Release Steps** – Implement unified campaign builder, add previews, integrate pacing analytics, test delivery logic, and launch with advertiser onboarding.

## 16. Analytics and reporting

### Flow outline
- **Data capture** – `TelemetryController` and `AnalyticsController` collect events, storing them in warehouse-ready tables and streaming to dashboards.【F:backend-nodejs/src/controllers/TelemetryController.js†L1-L160】
- **Dashboard delivery** – `frontend-reactjs/src/pages/Analytics.jsx` visualises learner progress, revenue, ads performance, and community health via chart components.
- **Export & alerts** – `BusinessIntelligenceController` manages scheduled exports, while `ObservabilityController` sends anomaly alerts to admins.

### Assessments
A. **Redundancy Changes** – Merge analytics widgets duplicated across dashboards; centralise event schemas. Build a single `frontend-reactjs/src/components/analytics/MetricCard.jsx` and `analytics/EventSchemaRegistry.js` so every dashboard reads from the same definitions.

B. **Strengths to Keep** – Preserve real-time dashboards, export scheduling, and role-based access to sensitive data.

C. **Weaknesses to Remove** – Address chart overload, improve performance on large datasets, and clarify definitions (active learner, engaged community). Materialise aggregate views via `ReportingCourseEnrollmentDailyView.js` and `ReportingCommunityEngagementDailyView.js` to avoid heavy joins at request time.

D. **Sesing and Colour Review Changes** – Use consistent chart palettes, provide pattern fills for colour-blind support, and ensure axis labels remain legible.

E. **Improvements & Justification Changes** – Implement shared analytics widget library, optimise queries with materialised views, and document metric definitions. Publish metric glossaries in `docs/analytics/README.md` so stakeholders understand how learner progress maps to monetisation outcomes.

F. **Change Checklist Tracker** – Completion 45%; tests for analytics queries; migrations for aggregate tables; seeders for demo analytics; update models for metrics metadata.

G. **Full Upgrade Plan & Release Steps** – Build shared widget library, optimise queries, document metrics, add QA tests, and roll out with training for stakeholders.
