# Agent operations ledger

Group 1 – Categories 1-4 (comprehensive change tracking)

1. **All changes**
   A. *Logic flows* – Expanded `logic flows.md` to sixteen flows covering platform setup, service consolidation, search migration, learner journeys, instructor publishing, monetisation, admin oversight, support, ads, and analytics with A–G assessments for each scenario.
   B. *User experience* – Rewrote `user experience.md` so every surface from navigation through accessibility carries the same A–G analysis, detailing component requirements, styling, imagery, monetisation hooks, and rollout plans.
   C. *Enablement docs* – Ledger now mirrors the updated documentation, emphasising the simplified runtime (frontend, backend, database) and the Edulure-first search/realtime stack.

2. **Redundancies**
   A. *Logic flows* – Documented duplicate schedulers, onboarding forms, feed renderers, and booking components that should consolidate into shared primitives to keep the low-load footprint lean.
   B. *User experience* – Flagged repeated card patterns, search widgets, moderation queues, and settings forms requiring unification for clarity and maintainability.
   C. *Cross-cutting* – Highlighted overlapping analytics widgets, checkout modals, and scheduling tools slated for convergence once shared kits are implemented.

3. **New implementations**
   A. *Logic flows* – Outlined Edulure Search provider, in-process realtime, learner certificate automation, tutor booking orchestration, and ads pacing analytics as upcoming builds.
   B. *User experience* – Introduced shared navigation, marketing hero system, course cards, media previews, tutor booking modals, moderation workspace, and accessibility tokens.
   C. *Operational guidance* – Reinforced one-command stack usage, preset toggles, and internalised service expectations across docs.

4. **Styling changes**
   A. *Logic flows-derived guidance* – Prescribed structured logging colours, staging gradients, and CLI theming that align with calmer developer ergonomics.
   B. *User experience critiques* – Detailed palette adjustments, contrast rules, thumbnail framing, and ad disclosure treatments across all surfaces.
   C. *Search experience* – Set hover preview, skeleton loader, and badge styling expectations for the Edulure Search redesign.

Group 2 – Categories 5-8 (frontend structure and code actions)

5. **CSS changes**
   A. *Token strategy* – Require shared spacing/colour tokens, responsive breakpoints, and motion preferences referenced in the UX blueprint.
   B. *Media scaffolding* – Mandate thumbnail ratios, hover previews, and skeleton loaders for courses, communities, tutors, and search results.
   C. *Form surfaces* – Align padding, focus outlines, and gradient usage across onboarding, checkout, and admin forms.

6. **Component changes**
   A. *Shared primitives* – Build unified navigation, hero, course/tutor cards, feed items, search bar, ticket forms, and analytics widgets noted in both docs.
   B. *Experience-specific updates* – Ship learner goals widget, instructor task board, community directory, live classroom chat, and ads campaign builder improvements.
   C. *Media & preview* – Deliver reusable media preview slots with thumbnails, hover video, and fallback illustrations powered by Edulure Search metadata.

7. **Function deletions**
   A. *Pending removal* – Deprecate redundant polling hooks, legacy search adapters, and standalone worker boot paths once new providers land.
   B. *Frontend clean-up* – Retire bespoke reaction handlers, duplicate booking calendars, and obsolete moderation queues replaced by shared experiences.
   C. *Documentation alignment* – No runtime removals occur until feature parity is achieved; docs capture deprecation intent only.

8. **Component deletions**
   A. *Targeted consolidation* – Remove extra hero banners, dashboard cards, and marketing sliders after shared kits go live.
   B. *Search/UI overlap* – Eliminate parallel explorer grids and tutor cards once the new unified components replace them.
   C. *Performance tuning* – Sunset heavy carousel variants and duplicated chat widgets when virtualised lists and shared chat land.

Group 3 – Categories 9-10 (data and alignment)

9. **Database migrations & seeders**
   A. *Migrations* – Plan Postgres search indexes/views, achievements tables, booking availability, ads pacing, compliance checklists, and analytics aggregates referenced in the flows.
   B. *Seeders* – Populate demo courses, communities, tutors, campaigns, incidents, and accessibility tokens to back the UX demos.
   C. *Maintenance* – Schedule vacuum/refresh jobs for search views, analytics tables, and ticket escalations to keep internal services responsive.

10. **Alignment changes**
   A. *Logic flows* – Sync engineering tasks with preset-aware stack scripts, cooperative schedulers, learner lifecycle automation, and ads monetisation updates.
   B. *User experience* – Ensure design, engineering, and ops teams implement the shared component kits, styling tokens, and accessibility roadmap captured in the UX guide.
   C. *Operational docs* – Keep README/setup guidance pointing to the simplified stack, emphasising Edulure Search and internal realtime so new contributors follow the correct path.

---

# Logic flows.md (reference copy)

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
- **Profile viewing/editing** – `frontend-reactjs/src/pages/Profile.jsx` queries `UserController.getProfile` and `LearnerDashboardController.getPreferences` to show avatar, bio, goals, and notification settings.【F:backend-nodejs/src/controllers/UserController.js†L1-L160】
- **Avatar and media uploads** – `MediaUploadController.createUpload` issues signed URLs for avatars/banner images; frontend uses dropzones shared with community branding.
- **Preferences & goals** – `LearnerDashboardController.updatePreferences` stores interests, learning pace, and monetisation preferences, feeding personalised recommendations in dashboard/home feeds.
- **Security settings** – `AuthController.updatePassword` and `IdentityVerificationController` handle password resets, MFA toggles, and identity confirmation.

### Assessments
A. **Redundancy Changes** – Merge duplicate settings panels between Profile page and DashboardSettings; reuse notification toggles across learner/instructor surfaces. Drive both surfaces from `frontend-reactjs/src/components/settings/SettingsLayout.jsx` and hydrate the same preferences endpoint to avoid diverging states.

B. **Strengths to Keep** – Maintain inline validation, autosave feedback, and preview panes so learners can quickly see updates.

C. **Weaknesses to Remove** – Improve error states for uploads, surface avatar cropping, and reduce the number of tabs required to reach key settings. Add upload retry metadata to the `MediaUploadController` responses so the UI can gracefully recover when background workers throttle conversions.

D. **Sesing and Colour Review Changes** – Keep profile backgrounds minimal, ensure toggles meet contrast guidelines, and adopt consistent avatar frames (120px circle) with neutral drop shadows.

E. **Improvements & Justification Changes** – Introduce unified settings layout, add image cropping/preview, and present recommendation controls with clear monetisation context (ads preferences, upsell settings). Surfacing `LearnerSystemPreferenceModel` flags next to Edulure Ads toggles reassures users about data usage and encourages opt-in for monetised surfaces.

F. **Change Checklist Tracker** – Completion 45%; tests for preference persistence needed; ensure media storage handles fallback; no new migrations; models updated to include personalization fields; verify seeds include sample settings.

G. **Full Upgrade Plan & Release Steps** – Build shared settings components, add upload cropping utilities, extend preference schema, add tests, and roll out with migration to populate defaults.

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


# User experience.md (reference copy)

# User experience

This blueprint defines how Edulure should feel: Skool-style community energy paired with Udemy-grade course depth, wrapped in monetisation-ready surfaces that still run comfortably on a lightweight stack. Each numbered section lists the experience outline followed by assessments A–G covering redundancies, strengths, weaknesses, styling/colour, improvements with justification, a change checklist, and a release sequence.

## 1. Global shell and navigation

### Experience outline
- **Header bar** – Compact top navigation with logo, primary tabs (Feed, Courses, Communities, Tutors, Library), quick-create button, and avatar menu.
- **Sidebar** – Contextual nav on dashboards with role-aware sections (Learner, Instructor, Admin) and collapsible groups.
- **Notifications & quick actions** – Bell icon reveals notifications; plus button surfaces create actions for posts, courses, events.
- **Responsive behaviour** – Mobile collapses nav into bottom tab bar with floating action button for creation.

### Assessments
A. **Redundancy Changes** – Remove duplicate nav components between `layouts/AppShell.jsx` and `layouts/DashboardShell.jsx`; unify notification drawers. Centralise header rendering inside `frontend-reactjs/src/components/navigation/TopBar.jsx` so badges, presence indicators, and monetisation shortcuts stay aligned.

B. **Strengths to Keep** – Keep concise nav labels, avatar quick menu, and responsive collapse patterns that mimic Skool simplicity.

C. **Weaknesses to Remove** – Reduce icon inconsistency, improve keyboard focus order, and eliminate redundant breadcrumbs when sidebar already signals context. Map keyboard focus to the order defined in `navigation/routes.js` so screen reader announcements match visual hierarchy.

D. **Sesing and Colour Review Changes** – Use the primary indigo for active states, neutral slate backgrounds, and 1px dividers; ensure hover/focus outlines meet contrast guidelines.

E. **Improvements & Justification Changes** – Introduce a shared navigation primitive, add personalization for pinning sections, and integrate monetisation badges (ads manager, payouts) to highlight revenue features. Persist pinned links through `UserPreferenceController.updateNavigation` so the shell reflects learner, instructor, or owner priorities automatically.

F. **Change Checklist Tracker** – Completion 55%; tests for focus management needed; no database changes; ensure analytics events update; assets share tokens.

G. **Full Upgrade Plan & Release Steps** – Build shared nav components, refactor layouts to consume them, audit keyboard navigation, update theme tokens, and release after responsive QA.

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
A. ✅
   - Routed login (`frontend-reactjs/src/pages/Login.jsx`), learner registration (`frontend-reactjs/src/pages/Register.jsx`), and instructor onboarding (`frontend-reactjs/src/pages/InstructorRegister.jsx`) through the shared `frontend-reactjs/src/components/auth/AuthForm.jsx` renderer so every flow consumes the same submission lifecycle and error surface.
   - Normalised validation by moving email/password/persona rules into `frontend-reactjs/src/utils/validation/auth.js`, replacing per-page schema fragments and keeping MFA, passwordless, and invite fields in sync.
   - Standardised backend interactions so the three experiences hit the same authentication endpoints with consistent payload shapes, reducing prior divergence in `login`, `register`, and onboarding draft submissions.

B. ✅
   - Preserved the minimal, single-column card layout across the three pages via `AuthCard` while layering on progress indicators, social sign-on, and persona copy without increasing cognitive load.
   - Kept the immediate post-submit MFA messaging by threading status banners from each page into `AuthForm`'s shared status slot, ensuring returning users still complete multi-factor setup without extra navigation.
   - Retained accessibility affordances such as keyboard-order alignment and descriptive helper text established in earlier iterations of the flows.

C. ✅
   - Added the backend `GET /auth/password-policy` handler in `backend-nodejs/src/controllers/AuthController.js` and surfaced the requirements via `frontend-reactjs/src/pages/Register.jsx` so users see unmet criteria tick down live while typing.
   - Reworked the login MFA branch to differentiate between required, invalid, and not-yet-configured states, mapping each `AuthService` error code to a dedicated helper banner with actionable copy.
   - Elevated field-level validation by showing friendly inline errors for password, MFA, and persona choices instead of generic toasts, removing the prior ambiguity around failed submissions.

D. ✅
   - Unified colour tokens across the auth surfaces by adopting `AuthForm`'s primary/emerald classes for progress bars, checklist chips, and MFA alerts, matching the palette documented in `styles/tokens.css`.
   - Applied consistent focus outlines and rounded container styling to every input and checkbox rendered through `AuthForm`, eliminating the mismatched borders previously seen between login and register.
   - Balanced supporting typography with muted slate text classes while keeping CTAs in the indigo primary family so visual hierarchy remains clear regardless of persona selection.

E. ✅
   - Introduced persona messaging blocks in `frontend-reactjs/src/pages/Register.jsx` that swap headlines and descriptions based on the learner/instructor toggle, pairing the copy with dynamic illustration hooks.
   - Persisted onboarding drafts through `LearnerDashboardController.getOnboardingDraft` and `LearnerDashboardService.saveOnboardingDraft`, enabling auto-save intervals that restore field values and persona context on reload.
   - Embedded optional community invite and interest capture directly into the shared form configuration, letting the onboarding wizard pre-populate recommendations immediately after account creation.

F. ✅
   - Shared validation suites are live with automated test coverage still to be authored; manual QA verified login, registration, and instructor onboarding flows end-to-end.
   - No database schema changes were required because drafts live in existing learner preference blobs; lite/demo seeds continue to unlock personas and interests for showcase environments.
   - Outstanding work tracks adding jest/unit coverage for validators and service persistence plus integration tests around the password policy endpoint.

G. ✅
   - Completed delivery of the shared auth form, password policy API, onboarding draft persistence, persona messaging, and MFA refinements.
   - Next rollout steps focus on expanding analytics instrumentation, adding automated coverage, and running responsive QA across devices before marketing announces the refreshed onboarding journey.
   - Support documentation updates are scheduled after the QA round so success teams can reference the new flows and draft recovery behaviour.

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
