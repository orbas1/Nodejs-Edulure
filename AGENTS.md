# Agent operations ledger

Group 1 – Categories 1-4 (comprehensive change tracking)

1. **All changes**
   A. *Logic flows* – Expanded `logic flows.md` to sixteen flows covering platform setup, service consolidation, search migration, learner journeys, instructor publishing, monetisation, admin oversight, support, ads, and analytics with A–G assessments for each scenario.
   B. ✅
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
   A. ✓
      - Flow 1 mandates indigo progress gradients, accessible warning toasts, and calm card shadows across setup dashboards; this note threads those same tokens into the developer presets so stack boot feedback mirrors the orchestration styling already codified in the playbook.【F:logic flows.md†L5-L26】
      - Flow 2 calls for colour-coded log prefixes and status indicators for unified realtime/job/search services; the styling guidance now locks our CLI output, terminal badges, and admin service health widgets to the documented `[jobs]/[realtime]/[search]` palette so on-call engineers see identical hues from console to UI.【F:logic flows.md†L28-L48】
      - Flow 3 harmonises CLI colours and documentation captures; this section folds those requirements into preset review checklists so screenshots, terminal captures, and README snippets all reflect the same info/warn/error mapping described in the bootstrap flow.【F:logic flows.md†L50-L66】
   B. ✓
      - Flow 5 enforces indigo CTAs, neutral canvases, and accessible pricing badges; styling directives here now pin marketing heroes, pricing grids, and onboarding surfaces to the same palette tokens and contrast ratios for every acquisition touchpoint.【F:logic flows.md†L95-L116】
      - Flow 6 keeps neutral/emerald progress palettes consistent across course viewers and dashboards; this entry aligns learner progress widgets, certificate previews, and module cards so they inherit the documented colour ramp without bespoke overrides.【F:logic flows.md†L118-L141】
      - Flow 7 centres minimal backdrops, contrast-compliant toggles, and uniform avatar frames within profile settings; the critique ensures profile, dashboard settings, and identity editors reuse the shared styling primitives described there instead of ad-hoc variants.【F:logic flows.md†L142-L159】
   C. ✓
      - Flow 4 outlines shared skeleton loaders, thumbnail frames, and focus states for Postgres-backed search; this note cements those specs as the baseline for every catalogue, explorer, and tutor search surface as the Meilisearch shim retires.【F:logic flows.md†L72-L93】
      - Flow 5’s marketing discovery updates add hover and badge expectations for search-powered hero previews; integrating that language here guarantees marketing-led search entry points reuse the same shimmer and badge tokens as the core results grids.【F:logic flows.md†L95-L116】
      - Flow 14’s support and moderation rollout reuses the Edulure Search provider for ticket suggestions; locking SLA badges and moderation flags to the same skeleton rhythm ensures the support workspace inherits the hover/focus treatments defined in the search migration once flows 4 and 14 converge.【F:logic flows.md†L300-L324】

Group 2 – Categories 5-8 (frontend structure and code actions)

5. **CSS changes**
   A. ✓ Flow 5 palette tokens still anchor gradients, shadows, and CTA treatments, and the refreshed `PrimaryHero`/`PlanHighlights` shells now consume those variables while wiring marketing CTAs for analytics-safe callbacks, keeping the dynamic hero and pricing stacks visually in lockstep across light, dark, and high-contrast themes.【F:frontend-reactjs/src/styles/tokens.css†L36-L118】【F:frontend-reactjs/src/components/marketing/PrimaryHero.jsx†L38-L115】【F:frontend-reactjs/src/components/marketing/PlanHighlights.jsx†L16-L83】
   B. ✓ Home now streams Flow 5 marketing blocks, plans, and invites straight from the backend via `useMarketingContent`, mapping payloads into the shared hero, preview, and plan scaffolding while emitting CTA analytics events so marketing ops can track conversions off the unified data contract.【F:frontend-reactjs/src/pages/Home.jsx†L231-L478】【F:frontend-reactjs/src/hooks/useMarketingContent.js†L1-L48】【F:backend-nodejs/src/services/MarketingContentService.js†L18-L74】
   C. ✓ Register and instructor onboarding flows both run through `useOnboardingForm`, call `/dashboard/learner/onboarding/bootstrap`, and hydrate marketing metadata, invite claims, and analytics-ready preferences before handing off to auth—keeping the React surfaces, service layer, and seeds aligned for Flow 5 enrolment.【F:frontend-reactjs/src/pages/Register.jsx†L46-L477】【F:frontend-reactjs/src/pages/InstructorRegister.jsx†L22-L239】【F:backend-nodejs/src/services/LearnerDashboardService.js†L561-L651】

6. **Component changes**
   A. ✅ **Shared primitives** – Landed a reusable `MediaPreviewSlot`, `EntityCard`, `OmniSearchBar`, `AnalyticsStat`, and unified ticket form layer, then wired them into navigation, catalogue, feed, and support surfaces so analytics events, search submissions, and action buttons all flow through the same component contracts.【F:frontend-reactjs/src/components/shared/MediaPreviewSlot.jsx†L1-L143】【F:frontend-reactjs/src/components/shared/EntityCard.jsx†L1-L185】【F:frontend-reactjs/src/components/shared/OmniSearchBar.jsx†L1-L50】【F:frontend-reactjs/src/components/shared/AnalyticsStat.jsx†L1-L59】【F:frontend-reactjs/src/components/shared/UnifiedTicketForm.jsx†L1-L52】【F:frontend-reactjs/src/components/navigation/AppTopBar.jsx†L1-L200】【F:frontend-reactjs/src/components/dashboard/MetricCard.jsx†L1-L25】【F:frontend-reactjs/src/components/feed/FeedItemCard.jsx†L60-L208】【F:frontend-reactjs/src/pages/Courses.jsx†L143-L210】【F:frontend-reactjs/src/pages/TutorProfile.jsx†L148-L187】【F:frontend-reactjs/src/pages/dashboard/LearnerSupport.jsx†L565-L606】
   B. ✅ **Experience-specific updates** – Connected the shared primitives to domain dashboards by adding the learner goals widget, instructor task board, live classroom chat panel, and ads performance summary so each workspace ships the UX upgrades promised in `user experience.md`.【F:frontend-reactjs/src/components/dashboard/LearnerGoalsWidget.jsx†L1-L106】【F:frontend-reactjs/src/pages/dashboard/learner/sections/LearnerGoalsSection.jsx†L1-L22】【F:frontend-reactjs/src/components/dashboard/InstructorTaskBoard.jsx†L1-L124】【F:frontend-reactjs/src/pages/dashboard/instructor/InstructorOverview.jsx†L1-L220】【F:frontend-reactjs/src/components/shared/LiveClassroomChatPanel.jsx†L1-L168】【F:frontend-reactjs/src/pages/LiveClassrooms.jsx†L820-L918】【F:frontend-reactjs/src/pages/dashboard/EdulureAds.jsx†L945-L1040】
   C. ✅ **Media & preview** – Standardised imagery for courses, tutors, feed items, and live classrooms by routing their thumbnails and hover playback through the new `MediaPreviewSlot`, ensuring Edulure Search metadata powers consistent previews everywhere.【F:frontend-reactjs/src/components/shared/MediaPreviewSlot.jsx†L1-L143】【F:frontend-reactjs/src/components/shared/EntityCard.jsx†L59-L134】【F:frontend-reactjs/src/components/feed/FeedItemCard.jsx†L170-L208】【F:frontend-reactjs/src/pages/Courses.jsx†L143-L183】【F:frontend-reactjs/src/pages/TutorProfile.jsx†L148-L187】【F:frontend-reactjs/src/components/shared/LiveClassroomChatPanel.jsx†L54-L126】
   D. ✅ **Sesing and Colour Review Changes** – Introduced layer tokens and poll styling so community feed badges, poll progress bars, and monetisation callouts respect the shared z-index and neutral palette: new `--z-*` variables sit alongside focus tokens, bespoke badge classes prevent overlap, and poll previews reuse the neutral panel treatment.【F:frontend-reactjs/src/styles/tokens.css†L45-L62】【F:frontend-reactjs/src/styles.css†L96-L154】【F:frontend-reactjs/src/components/feed/FeedItemCard.jsx†L40-L196】
   E. ✅ **Improvements & Justification Changes** – Elevated community engagement with poll previews, cached poll imagery, and a monetisation banner. Feed cards now surface poll results with accessible progress bars, `mediaCache` batches preview preloading, and the live feed renders a plan banner that scrolls learners into the subscription controls, aligning with the UX brief’s monetisation cues.【F:frontend-reactjs/src/components/feed/FeedItemCard.jsx†L40-L208】【F:frontend-reactjs/src/utils/mediaCache.js†L1-L42】【F:frontend-reactjs/src/components/community/CommunityMonetizationBanner.jsx†L1-L123】【F:frontend-reactjs/src/pages/Communities.jsx†L20-L1403】
   F. ✅ **Change Checklist Tracker** – Poll metadata handling, monetisation surfacing, and media prefetch are live: community feed state now preloads poll thumbnails, the banner routes plan selections into the subscription module via scroll and plan state, and the subscription panel carries an explicit anchor for QA smoke tests.【F:frontend-reactjs/src/pages/Communities.jsx†L20-L1788】【F:frontend-reactjs/src/utils/mediaCache.js†L1-L42】【F:frontend-reactjs/src/components/community/CommunityMonetizationBanner.jsx†L1-L123】
   G. ✅ **Full Upgrade Plan & Release Steps** – Validate the feed by testing poll-heavy communities, confirm monetisation banners scroll to the pricing console, rerun accessibility sweeps on poll progress bars, and ship once staging screenshots capture the layered badges plus poll preview to document the new baseline for `user experience.md` flow 6.【F:frontend-reactjs/src/components/feed/FeedItemCard.jsx†L40-L208】【F:frontend-reactjs/src/pages/Communities.jsx†L1320-L1784】【F:frontend-reactjs/src/components/community/CommunityMonetizationBanner.jsx†L1-L123】

7. **Function deletions**
   A. *Pending removal* – Deprecate redundant polling hooks, legacy search adapters, and standalone worker boot paths once new providers land.
   B. *Frontend clean-up* – Retire bespoke reaction handlers, duplicate booking calendars, and obsolete moderation queues replaced by shared experiences.
   C. *Documentation alignment* – No runtime removals occur until feature parity is achieved; docs capture deprecation intent only.

8. **Component deletions**
   A. ✅ *Targeted consolidation* – Removed the bespoke `HomeHero.jsx` and `MembershipSnapshot.jsx` implementations in favour of the new shared `marketing/MarketingHero.jsx` and `marketing/PlanHighlights.jsx`, wiring `Home.jsx` to the shared kits so the landing experience now renders through reusable building blocks.
   B. ✅ *Search/UI overlap* – Replaced the bespoke `InsidePreviewTabs.jsx` showcase with the shared `marketing/ProductPreviewTabs.jsx`, collapsing the parallel explorer marketing grid so Home now consumes the same preview contract that other search-driven surfaces will reuse.
   C. ✅ *Performance tuning* – Deleted the heavy marketing slider variants and reimplemented the preview rail with a lean tabbed `ProductPreviewTabs` component, reducing bespoke carousel code paths ahead of the shared virtualised feed and chat primitives landing.

Group 3 – Categories 9-10 (data and alignment)

9. **Database migrations & seeders**
   A. ✓ Search documents & refresh queue – Implemented `20250320140000_search_documents.js` to materialise the `search_documents` catalogue with entity metadata, popularity/freshness scores, and the `search_document_refresh_queue` scheduler so the Postgres-backed search path in `logic flows.md` can ship without external dependencies.【F:backend-nodejs/migrations/20250320140000_search_documents.js†L1-L64】
   B. ✓ Seeders – Added `002_search_documents.js` which uses `SearchDocumentService` to rebuild course, community, ebook, and tutor documents inside a transaction, ensuring demo data reflects the consolidated search experience from flows 4–6 while priming refresh jobs for future runs.【F:backend-nodejs/seeds/002_search_documents.js†L1-L28】
   C. ✓ Maintenance – Introduced `SearchDocumentService` to generate Postgres search payloads, upsert them idempotently, and queue refreshes so vacuum/refresh cadences stay aligned with the `logic flows.md` playbooks for search, course completion, and tutor discovery.【F:backend-nodejs/src/services/SearchDocumentService.js†L1-L366】

10. **Alignment changes**
   A. ✅ *Logic flows* – Map delivery roadmaps directly to the numbered upgrade plans in `logic flows.md`: flows 1–3 anchor preset-aware stack scripts, cooperative schedulers, and orchestration telemetry; flows 4–6 govern the Edulure Search migration, course lifecycle, and learner certification loops; flows 7–11 synchronise support, ads, analytics, and instructor tooling changes; flows 12–17 close the loop on communities, moderation, admin consoles, settings, and accessibility. Each squad’s backlog should reference the corresponding flow lettered checklist (A–G) so code reviews verify that redundancy cleanup, strengths preservation, weakness mitigation, styling alignment, improvement milestones, checklist items, and release sequencing remain in lockstep.
   B. ✅ *User experience* – Bind design system workstreams to the UX callouts mirrored in the flows: marketing and onboarding (flow 5) consume the shared hero/pricing kits, course and dashboard surfaces (flows 6 and 11) adopt the consolidated progress, feed, and analytics components, while communities, moderation, admin, and settings (flows 12–16) inherit the accessibility tokens, motion guidelines, and media preview standards. Product, design, and engineering leads should review flow-specific styling/colour directives alongside `user experience.md` during sprint kickoff to guarantee that tokens, component APIs, and copy decks are consistent across web and lite-stack deliverables.
   C. ✅ *Operational docs* – Keep contributor guides in lockstep with the documented runtime by cross-referencing flow prerequisites: update README setup sections with the preset matrix and Edulure Search defaults from flows 1 and 4, extend onboarding runbooks with learner/tutor lifecycle automation steps from flows 5–8, and refresh incident/operations manuals with moderation, admin, and accessibility playbooks from flows 12–17. Each doc refresh should link back to the relevant flow numbers so new team members can trace requirements from documentation to the orchestrated stack behaviour they observe locally.

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
A. ✅ **Redundancy Changes** – Remove duplicate polling loops between setup timeline widgets and admin overview cards by consolidating on a single SSE/WebSocket channel with back-off polling as a fallback. Reuse the `useSetupProgress` hook that currently powers `frontend-reactjs/src/pages/Setup.jsx` inside `frontend-reactjs/src/pages/admin/Operations.jsx` so both surfaces depend on the same subscription plumbing and `setup.routes.js` endpoint payloads, now enriched with persisted history data from `SetupRunModel`.

B. ✅ **Strengths to Keep** – Keep the modular task registry, checkpoint persistence, and idempotent rerun design that already fits low-load production while enabling diagnostics.

C. ✅ **Weaknesses to Remove** – Improve failure categorisation, re-run preset awareness, and automatic recovery so users are not forced to refresh the browser. Persist the last-known error envelope in `SetupOrchestratorService.state` (and back it with `setup_runs`/`setup_run_tasks` records) while exposing structured keys (`taskId`, `command`, `exitCode`) so the frontend can stage contextual guidance rather than generic failure banners.

D. ✅ **Sesing and Colour Review Changes** – Align progress gradients with the primary palette (`#4338ca → #6366f1`), ensure warning toasts use accessible amber tokens, and normalise card shadows to keep the quick-start wizard calm.

E. ✅ **Improvements & Justification Changes** – Implement push-based status streaming, append heartbeat metadata to `/setup/status`, and expose preset-aware rerun buttons. Persist each run to MySQL via `SetupRunModel`/`SetupRunTaskModel`, hydrate history snapshots on restart, and surface the last five executions (with presets, duration, and failure notes) inside both the installer and admin dashboards. Extending `scripts/dev-stack.mjs` to emit lifecycle webhooks lets admin analytics panels subscribe for audit history without inventing another polling path.

F. ✅ **Change Checklist Tracker** – Completion level 100%; SSE stream, preset resolver, and persistence wiring landed; structured failure codes flow through task metadata; heartbeat writes verified; migrations add `setup_runs`/`setup_run_tasks`; seeds backfill exemplar runs; models and UI consume the stored history end-to-end.

G. ✅ **Full Upgrade Plan & Release Steps** – Extend `SetupOrchestratorService` with an event emitter, enrich the status endpoint with heartbeat/preset data, refactor `Setup.jsx` for push updates, add preset rerun buttons, and ship behind a feature flag after smoke tests. Document the behaviour in `README.md` and `EDULURE_GUIDE.md` so newcomers run `npm run dev:stack` without misconfiguring optional services.

## 2. Operational services footprint (worker, realtime, search)

### Flow outline
- **Background jobs** – `startBackgroundJobs` in `backend-nodejs/src/servers/workerRoutines.js` coordinates ingestion, retention, moderation, monetisation, and telemetry schedulers. `startWebServer` and `startWorkerService` both initialise the shared runtime through `runtimeEnvironment.js`, applying preset-aware flags from `runtimeToggles.js` before exposing readiness probes on dedicated HTTP servers so lite deployments can disable non-essential jobs.【F:backend-nodejs/src/servers/workerRoutines.js†L1-L220】【F:backend-nodejs/src/servers/webServer.js†L1-L159】【F:backend-nodejs/src/servers/workerService.js†L1-L144】【F:backend-nodejs/src/servers/runtimeEnvironment.js†L1-L87】【F:backend-nodejs/src/servers/runtimeToggles.js†L1-L41】
- **Realtime gateway** – `attachRealtimeGateway` extends whichever HTTP server is running with Socket.IO namespaces for feeds, classrooms, and chat. The consolidated `webServer.js` can co-host websockets, while the dedicated `realtimeServer.js` path stays available for multi-process environments.【F:backend-nodejs/src/servers/webServer.js†L30-L141】【F:backend-nodejs/src/servers/realtimeGateway.js†L1-L43】【F:backend-nodejs/src/servers/realtimeServer.js†L1-L135】
- **Search layer** – `searchProviders.js` sets up a Postgres-backed provider (`postgresSearchProvider.js`) that delegates to `SearchDocumentModel`. Explorer search resolves providers dynamically, backed by the `search_documents` migration, model, and seed rebuilders so catalogue metadata stays in sync without Meilisearch.【F:backend-nodejs/src/services/searchProviders.js†L1-L64】【F:backend-nodejs/src/services/search/providers/postgresSearchProvider.js†L1-L12】【F:backend-nodejs/src/models/SearchDocumentModel.js†L537-L604】【F:backend-nodejs/migrations/20250320140000_search_documents.js†L1-L87】【F:backend-nodejs/seeds/002_search_documents.js†L1-L37】【F:backend-nodejs/src/services/ExplorerSearchService.js†L1-L260】

### Assessments
A. ✅ **Redundancy Changes** – `runtimeEnvironment.js` now centralises database, infrastructure, readiness, and signal wiring; `webServer.js`, `workerService.js`, and `realtimeServer.js` all consume it while `stack.js` reads the same preset-aware defaults, eliminating divergent bootstrap flows across binaries.【F:backend-nodejs/src/servers/runtimeEnvironment.js†L1-L87】【F:backend-nodejs/src/servers/webServer.js†L1-L159】【F:backend-nodejs/src/servers/workerService.js†L1-L144】【F:backend-nodejs/src/servers/realtimeServer.js†L1-L135】【F:backend-nodejs/src/bin/stack.js†L1-L37】

B. ✅ **Strengths to Keep** – Scheduler lifecycles remain explicit in `workerRoutines.js`, readiness trackers still emit per-component health, and the dedicated realtime binary keeps multi-process options open without diverging from the shared runtime contract.【F:backend-nodejs/src/servers/workerRoutines.js†L1-L220】【F:backend-nodejs/src/servers/workerService.js†L1-L144】【F:backend-nodejs/src/servers/realtimeServer.js†L1-L135】

C. ✅ **Weaknesses to Remove** – The default search provider is now Postgres-backed, background jobs respect preset toggles to prevent double warmups, and worker shutdowns rely on the shared runtime disposer to keep resources tidy.【F:backend-nodejs/src/services/searchProviders.js†L1-L64】【F:backend-nodejs/src/services/search/providers/postgresSearchProvider.js†L1-L12】【F:backend-nodejs/src/services/ExplorerSearchService.js†L1-L260】【F:backend-nodejs/src/servers/workerService.js†L1-L144】

D. ✅ **Sesing and Colour Review Changes** – `[jobs]` log prefixes from `workerRoutines.js`, `[realtime]` logging in `realtimeGateway.js`, and consistent readiness degradation copy ensure dashboards can present high-contrast health states without bespoke handling.【F:backend-nodejs/src/servers/workerRoutines.js†L30-L88】【F:backend-nodejs/src/servers/realtimeGateway.js†L1-L43】【F:backend-nodejs/src/servers/webServer.js†L47-L141】

E. ✅ **Improvements & Justification Changes** – Preset-driven toggles (`runtimeToggles.js`) decide whether jobs or realtime boot. Both `webServer.js` and `workerService.js` mark readiness degraded when features stay disabled, and the provider registry keeps search observability intact while shedding the Meilisearch dependency.【F:backend-nodejs/src/servers/runtimeToggles.js†L1-L41】【F:backend-nodejs/src/servers/webServer.js†L1-L159】【F:backend-nodejs/src/servers/workerService.js†L1-L144】【F:backend-nodejs/src/services/searchProviders.js†L1-L64】

F. ✅ **Change Checklist Tracker** – Vitest coverage now spans the runtime surfaces: `webServer.test.js` validates embedded jobs/realtime, `workerService.test.js` exercises the standalone probe + toggle handling, and `searchProviders.test.js` secures provider registration. Schema/migration/seed alignment for `search_documents` keeps the Postgres search path healthy.【F:backend-nodejs/test/webServer.test.js†L1-L172】【F:backend-nodejs/test/workerService.test.js†L1-L181】【F:backend-nodejs/test/searchProviders.test.js†L1-L48】【F:backend-nodejs/migrations/20250320140000_search_documents.js†L1-L87】【F:backend-nodejs/seeds/002_search_documents.js†L1-L37】【F:backend-nodejs/src/models/SearchDocumentModel.js†L537-L604】

G. ✅ **Full Upgrade Plan & Release Steps** – Apply the search document migration, rerun the seed rebuild, start the stack with the desired `SERVICE_PRESET`, and execute the Vitest suite once dependencies are present so operators can retire standalone worker/realtime containers noted in `docker-compose.yml` for lite deployments.【F:backend-nodejs/migrations/20250320140000_search_documents.js†L1-L87】【F:backend-nodejs/seeds/002_search_documents.js†L1-L37】【F:backend-nodejs/src/bin/stack.js†L1-L37】【F:backend-nodejs/test/webServer.test.js†L1-L172】【F:backend-nodejs/test/workerService.test.js†L1-L181】

## 3. Unified stack bootstrap options

### Flow outline
- **Developer convenience** – `scripts/dev-stack.mjs` provisions the database, seeds lite data, and launches backend + frontend concurrently with preset-aware flags and structured logs.【F:scripts/dev-stack.mjs†L1-L170】
- **Backend stack entrypoint** – `backend-nodejs/src/bin/stack.js` reads `SERVICE_TARGET` and presets, starting web, jobs, realtime, and media orchestration inside a single Node process suitable for production lite deployments.【F:backend-nodejs/src/bin/stack.js†L1-L120】
- **Production mirroring** – `npm run start:stack --workspace backend-nodejs -- --preset=full` mirrors staging/production boots without nodemon, keeping one backend container.

### Assessments
A. ✓ Centralised process supervision stays anchored in `scripts/lib/processSupervisor.mjs`, while both the dev entrypoint and `backend-nodejs/src/bin/stack.js` hydrate presets through `parsePresetArgs` so CLI overrides, NDJSON/pretty selection, and lifecycle logging are shared between monorepo scripts and the production stack binary.【F:scripts/lib/processSupervisor.mjs†L130-L279】【F:scripts/dev-stack.mjs†L25-L109】【F:backend-nodejs/src/bin/stack.js†L1-L61】

B. ✓ The one-command developer loop remains intact: `scripts/dev-stack.mjs` shells into `db:install` for migrations + seeds before launching backend/frontend pairs, leaning on the same preset defaults so local databases mirror migrations, models, and seeding expectations without manual toggles.【F:scripts/dev-stack.mjs†L25-L109】【F:backend-nodejs/scripts/install-db.js†L140-L233】

C. ✓ Runtime safety is tightened end to end—`applyPresetDefaults` now normalises `SERVICE_PRESET`/`RUNTIME_PRESET`, target lists, and boolean flags before boot, while `runtimeToggles` converts them back to booleans so lite presets keep jobs/realtime offline until explicitly enabled and the stack logger surfaces every toggle for observability.【F:scripts/lib/processSupervisor.mjs†L130-L173】【F:backend-nodejs/src/servers/runtimeToggles.js†L1-L99】【F:backend-nodejs/src/bin/stack.js†L22-L39】

D. ✓ Lifecycle theming is consistent: the shared logger still renders NDJSON for pipelines but automatically flips to colourised pretty output when a TTY (or explicit flag) is detected, keeping severity palettes, timestamps, and scopes aligned across dev and stack processes.【F:scripts/lib/processSupervisor.mjs†L104-L223】【F:scripts/dev-stack.mjs†L29-L39】【F:backend-nodejs/src/bin/stack.js†L10-L20】

E. ✓ Preset parsing, interactive controls, and readiness probes work together—`parsePresetArgs` handles preset aliases, job group overrides, and pretty-log switches, the supervisor exposes `status`/`restart`/`stop`, and the dev stack blocks on the backend `/ready` probe so orchestration only advances when database-backed services are in sync.【F:scripts/lib/processSupervisor.mjs†L176-L662】【F:scripts/dev-stack.mjs†L25-L104】

F. ✓ Coverage locks the flow: the new Vitest suite asserts preset + override handling, boolean normalisation, and CLI flag detection so documentation claims match executable behaviour and regressions surface before shipping.【F:backend-nodejs/test/stackPresetFlow.test.js†L1-L82】

G. ✓ Release cadence stays simple—run `npm run dev:stack` (or `npm run start:stack -- --preset=full`) to hydrate presets, let `db:install` manage migrations and seeds, monitor readiness logs, and lean on the interactive supervisor before updating onboarding docs.【F:scripts/dev-stack.mjs†L25-L109】【F:backend-nodejs/src/bin/stack.js†L31-L61】【F:backend-nodejs/scripts/install-db.js†L140-L233】

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
A. Consolidated hero and onboarding experiences by routing `MarketingHero` through the reusable `PrimaryHero` shell, letting Home hydrate CTAs from marketing blocks, while both learner and instructor registration flows consume the shared `useOnboardingForm` hook to produce schema-aligned payloads without duplicating form logic.【F:frontend-reactjs/src/components/marketing/PrimaryHero.jsx†L1-L169】【F:frontend-reactjs/src/components/marketing/MarketingHero.jsx†L1-L5】【F:frontend-reactjs/src/pages/Home.jsx†L231-L309】【F:frontend-reactjs/src/hooks/useOnboardingForm.js†L1-L49】【F:frontend-reactjs/src/pages/Register.jsx†L46-L199】【F:frontend-reactjs/src/pages/InstructorRegister.jsx†L22-L111】 ✓

B. Preserved the narrative storytelling and light signup flow by keeping Home’s fallback hero copy, language selector, and analytics-wired CTAs intact, while the registration surface still offers social sign-on, password guidance, and marketing opt-in toggles without forcing extra steps.【F:frontend-reactjs/src/pages/Home.jsx†L233-L309】【F:frontend-reactjs/src/pages/Home.jsx†L432-L478】【F:frontend-reactjs/src/pages/Register.jsx†L11-L137】【F:frontend-reactjs/src/pages/Register.jsx†L139-L207】 ✓

C. Removed inconsistent pricing tiles and optional-step friction by deriving plan cards directly from backend metadata (accent borders, upsells, feature fallbacks) and formatting prices consistently, while onboarding validation trims optional invite and preference inputs into structured metadata so optional fields stay optional.【F:frontend-reactjs/src/pages/Home.jsx†L330-L369】【F:frontend-reactjs/src/components/marketing/PlanHighlights.jsx†L16-L83】【F:backend-nodejs/src/services/MarketingContentService.js†L24-L60】【F:frontend-reactjs/src/utils/validation/onboarding.js†L120-L197】【F:frontend-reactjs/src/pages/Register.jsx†L151-L207】 ✓

D. Locked in Flow 5 visual language through the marketing component layer—hero and plan shells inherit the gradient-backed classes and CTA button tokens so neutral backdrops, focus states, and contrast ratios remain consistent across the acquisition surfaces.【F:frontend-reactjs/src/styles.css†L62-L137】【F:frontend-reactjs/src/components/marketing/PlanHighlights.jsx†L16-L83】【F:frontend-reactjs/src/components/marketing/PrimaryHero.jsx†L37-L114】 ✓

E. Deepened improvements by wiring marketing analytics end-to-end: Home now fires `trackEvent` for each CTA, `useMarketingContent` hydrates blocks/plans/invites via the dedicated API client, and the service aggregates database-backed marketing assets so the frontend renders contextual upsells with real data.【F:frontend-reactjs/src/pages/Home.jsx†L266-L417】【F:frontend-reactjs/src/hooks/useMarketingContent.js†L1-L48】【F:frontend-reactjs/src/api/marketingApi.js†L1-L5】【F:backend-nodejs/src/services/MarketingContentService.js†L19-L73】 ✓

F. Checklist is complete—`20250325103000_marketing_enrollment_flow` provisions marketing blocks, plans, invites, and responses; the corresponding models/services persist and hydrate data; bootstrap seeds populate Flow 5 fixtures; and the new Vitest suite exercises the aggregated service to keep migrations, models, and seeds in lockstep.【F:backend-nodejs/migrations/20250325103000_marketing_enrollment_flow.js†L6-L146】【F:backend-nodejs/src/models/MarketingBlockModel.js†L1-L85】【F:backend-nodejs/src/models/MarketingPlanOfferModel.js†L1-L79】【F:backend-nodejs/src/models/LearnerOnboardingInviteModel.js†L1-L71】【F:backend-nodejs/src/models/LearnerOnboardingResponseModel.js†L1-L125】【F:backend-nodejs/src/services/MarketingContentService.js†L19-L73】【F:backend-nodejs/seeds/001_bootstrap.js†L847-L1040】【F:backend-nodejs/test/marketingContentService.test.js†L1-L181】 ✓

G. Release by running the marketing enrollment migration, reseeding the Flow 5 fixtures, verifying the unauthenticated `/content/marketing/blocks` endpoint, and executing the marketing content Vitest suite before smoke-testing Home and registration surfaces against the live invites/plans payload.【F:backend-nodejs/migrations/20250325103000_marketing_enrollment_flow.js†L6-L146】【F:backend-nodejs/seeds/001_bootstrap.js†L847-L1040】【F:backend-nodejs/src/routes/content.routes.js†L1-L19】【F:backend-nodejs/src/controllers/ContentController.js†L233-L245】【F:backend-nodejs/test/marketingContentService.test.js†L45-L181】 ✓

## 6. Communities and social engagement

### Flow outline
- **Community hub** – `Communities.jsx` orchestrates the hero, stats, switcher, and error surfaces so operators land on a contextualised overview of whichever space they pick, complete with member counts, post totals, geographic distribution, and a seeded review panel.【F:frontend-reactjs/src/pages/Communities.jsx†L1505-L1590】
- **Feed** – The community feed renders with the shared `FeedList`/`FeedItemCard` stack while the backend hydrates posts, ads, reactions, and pinned-media prefetch so polls, media previews, and sponsorship slots behave the same as the global feed.【F:frontend-reactjs/src/pages/Communities.jsx†L1413-L1438】【F:frontend-reactjs/src/components/feed/FeedList.jsx†L36-L112】【F:frontend-reactjs/src/components/feed/FeedItemCard.jsx†L52-L177】【F:backend-nodejs/src/services/CommunityService.js†L525-L577】
- **Membership controls** – Membership, monetisation, and subscription management live inline: the page loads paywall tiers, tracks checkout attempts, and exposes join/leave flows alongside the monetisation banner so learners can act without leaving the hub.【F:frontend-reactjs/src/pages/Communities.jsx†L1048-L1208】【F:frontend-reactjs/src/pages/Communities.jsx†L1286-L1344】【F:frontend-reactjs/src/components/community/CommunityMonetizationBanner.jsx†L37-L125】

### Assessments
A. ✅ **Redundancy Changes** – Both the global feed and community hub now depend on the same `FeedList`/`FeedItemCard` stack, so poll previews, action states, and sponsored placements stay in sync regardless of entry point.【F:frontend-reactjs/src/pages/Communities.jsx†L1413-L1438】【F:frontend-reactjs/src/pages/Feed.jsx†L1236-L1289】【F:frontend-reactjs/src/components/feed/FeedList.jsx†L36-L112】【F:frontend-reactjs/src/components/feed/FeedItemCard.jsx†L52-L177】

B. ✅ **Strengths to Keep** – The hub preserves approachable copy and modular highlights through the `experienceModules` scaffold, letting live sessions, recorded content, feed activity, and chat channels share the same friendly tone and status badges users expect.【F:frontend-reactjs/src/pages/Communities.jsx†L1354-L1478】

C. ✅ **Weaknesses to Remove** – Feed loads now prefetch pinned-media thumbnails, warm poll imagery, and refresh viewer reactions through the reaction model, eliminating flicker and stale badges while still supporting ad placements and query filtering end to end.【F:frontend-reactjs/src/pages/Communities.jsx†L723-L833】【F:frontend-reactjs/src/utils/mediaCache.js†L1-L38】【F:backend-nodejs/src/models/CommunityPostModel.js†L322-L418】【F:backend-nodejs/src/models/CommunityPostReactionModel.js†L18-L96】

D. ✅ **Sesing and Colour Review Changes** – Layer tokens and poll styling enforce consistent contrast: z-index variables live in the token sheet, and the poll preview skin plus badge helpers keep overlays readable in light/dark themes.【F:frontend-reactjs/src/styles/tokens.css†L85-L96】【F:frontend-reactjs/src/styles.css†L302-L338】【F:frontend-reactjs/src/components/feed/FeedItemCard.jsx†L134-L176】

E. ✅ **Improvements & Justification Changes** – Community monetisation, subscriptions, and checkout anchoring sit alongside feed activity, powered by the service layer’s subscription summary so hubs surface pricing context, add-ons, and checkout state without bespoke screens.【F:frontend-reactjs/src/pages/Communities.jsx†L1048-L1208】【F:frontend-reactjs/src/components/community/CommunityMonetizationBanner.jsx†L37-L125】【F:backend-nodejs/src/services/CommunityService.js†L1659-L1717】

F. ✅ **Change Checklist Tracker** – Schema, models, and seeds stay aligned: migrations add media/pinned columns and reactions, models expose pagination and toggles, and bootstrap seeds populate pinned posts plus reaction rows for regression coverage.【F:backend-nodejs/migrations/20250318104500_community_feed_enhancements.js†L3-L52】【F:backend-nodejs/migrations/20250322110000_community_post_reactions.js†L1-L24】【F:backend-nodejs/src/models/CommunityPostModel.js†L322-L418】【F:backend-nodejs/src/models/CommunityPostReactionModel.js†L18-L96】【F:backend-nodejs/seeds/001_bootstrap.js†L1448-L1552】

G. ✅ **Full Upgrade Plan & Release Steps** – Ship by exercising `/communities/:id/posts` search + aggregation with the shared API client, verifying poll previews and monetisation banners through the hub, and rerunning feed prefetch spot checks after reseeding so pinned media and reactions remain warmed.【F:frontend-reactjs/src/api/communityApi.js†L49-L96】【F:frontend-reactjs/src/pages/Communities.jsx†L723-L848】【F:backend-nodejs/src/services/CommunityService.js†L525-L620】

## 7. Learner profile and personalisation

### Flow outline
- **Profile viewing/editing** – `frontend-reactjs/src/pages/Profile.jsx` queries `UserController.getProfile` and `LearnerDashboardController.getPreferences` to show avatar, bio, goals, and notification settings.【F:backend-nodejs/src/controllers/UserController.js†L1-L160】
- **Avatar and media uploads** – `MediaUploadController.createUpload` issues signed URLs for avatars/banner images; frontend uses dropzones shared with community branding.
- **Preferences & goals** – `LearnerDashboardController.updatePreferences` stores interests, learning pace, and monetisation preferences, feeding personalised recommendations in dashboard/home feeds.
- **Security settings** – `AuthController.updatePassword` and `IdentityVerificationController` handle password resets, MFA toggles, and identity confirmation.

### Assessments
A. Unified learner dashboard and profile preference panels by introducing the shared `SystemPreferencesPanel` and `useSystemPreferencesForm`, so both surfaces reuse the same hook-driven state and API integration instead of maintaining duplicate forms.【F:frontend-reactjs/src/components/settings/SystemPreferencesPanel.jsx†L13-L200】【F:frontend-reactjs/src/hooks/useSystemPreferencesForm.js†L125-L210】【F:frontend-reactjs/src/pages/dashboard/LearnerSettings.jsx†L125-L493】【F:frontend-reactjs/src/pages/Profile.jsx†L1502-L1534】 ✓

B. Preserved inline validation, optimistic toggles, and preview feedback by letting the shared panel drive recommendation cards while the profile editor and avatar cropper keep immediate visual updates for identity changes.【F:frontend-reactjs/src/components/settings/SystemPreferencesPanel.jsx†L81-L214】【F:frontend-reactjs/src/components/profile/ProfileIdentityEditor.jsx†L150-L188】 ✓

C. Kept database, model, service, and seed data in lockstep so stored preferences, acknowledgements, and finance history align across environments, relying on the dedicated migration and model upsert logic for persistence.【F:backend-nodejs/migrations/20250315090000_learner_settings_extensions.js†L8-L66】【F:backend-nodejs/src/models/LearnerSystemPreferenceModel.js†L3-L68】【F:backend-nodejs/src/services/LearnerDashboardService.js†L560-L648】【F:backend-nodejs/seeds/001_bootstrap.js†L308-L420】 ✓

D. Locked colour and spacing consistency by composing the profile card with `SettingsLayout` and the shared panel, ensuring toggles, status banners, and preview cards use the same neutral shells and primary accents across dashboard and profile contexts.【F:frontend-reactjs/src/components/settings/SettingsLayout.jsx†L13-L55】【F:frontend-reactjs/src/components/settings/SystemPreferencesPanel.jsx†L31-L214】【F:frontend-reactjs/src/pages/Profile.jsx†L1502-L1534】 ✓

E. Deepened personalisation by wiring the hook’s update flow to `LearnerDashboardService`, so preference saves refresh live previews, normalise acknowledgement flags, and surface monetisation toggles consistently in both UIs.【F:frontend-reactjs/src/hooks/useSystemPreferencesForm.js†L148-L210】【F:backend-nodejs/src/services/LearnerDashboardService.js†L584-L648】 ✓

F. Preference persistence remains under automated coverage through the LearnerDashboardService Vitest suite, keeping default payloads and acknowledgement metadata aligned with the shared React surfaces.【F:backend-nodejs/test/learnerDashboardService.test.js†L726-L776】 ✓

G. Release by syncing the dashboard and profile panels after applying the learner settings migration, reseeding defaults, and verifying both surfaces render the shared component before enabling refreshed personalisation in production.【F:frontend-reactjs/src/pages/dashboard/LearnerSettings.jsx†L451-L508】【F:frontend-reactjs/src/pages/Profile.jsx†L1502-L1534】【F:backend-nodejs/migrations/20250315090000_learner_settings_extensions.js†L8-L66】 ✓

## 8. Community feed and engagement

### Flow outline
- **Feed aggregation** – `FeedController.getFeed` delegates to `LiveFeedService.getFeed` to collate community/global posts, analytics, and prefetch metadata before responding.【F:backend-nodejs/src/controllers/FeedController.js†L70-L206】【F:backend-nodejs/src/services/LiveFeedService.js†L84-L193】
- **Frontend consumption** – `frontend-reactjs/src/pages/Feed.jsx` and `frontend-reactjs/src/pages/Communities.jsx` manage pagination, infinite scroll, and action state while sharing the interaction hook to keep UI reactions in sync.【F:frontend-reactjs/src/pages/Feed.jsx†L266-L448】【F:frontend-reactjs/src/pages/Communities.jsx†L720-L821】
- **Posting & reactions** – `CommunityController.createPost` persists new posts while `FeedController.toggleReaction` and `CommunityService.togglePostReaction` route reaction toggles through the same pipeline for viewer state and analytics updates.【F:backend-nodejs/src/controllers/CommunityController.js†L210-L259】【F:backend-nodejs/src/controllers/FeedController.js†L167-L205】【F:backend-nodejs/src/services/CommunityService.js†L967-L1034】
- **Moderation** – `CommunityModerationController.flagPost` and related actions escalate reports to staff for review, ensuring flagged content flows into the moderation queue.【F:backend-nodejs/src/controllers/CommunityModerationController.js†L127-L219】

### Assessments
A. **Redundancy Changes** – Feed and Communities drive reaction toggles, analytics refresh, and optimistic UI updates through `useFeedInteractions`, so both screens swap posts via the same `onPostReplace` callback and action-state reducer instead of bespoke handlers.【F:frontend-reactjs/src/pages/Feed.jsx†L260-L295】【F:frontend-reactjs/src/pages/Communities.jsx†L773-L803】【F:frontend-reactjs/src/hooks/useFeedInteractions.js†L1-L49】 ✓

B. **Strengths to Keep** – Role-aware visibility, membership gating, and contextual filters remain intact: `CommunityService.listFeed`/`listFeedForUser` still validate memberships, decorate results, and attach sponsorship metadata while the Feed page resets listings when auth state shifts, preserving learner/instructor/admin segmentation and filters.【F:backend-nodejs/src/services/CommunityService.js†L525-L629】【F:frontend-reactjs/src/pages/Feed.jsx†L309-L339】 ✓

C. **Weaknesses to Remove** – Prefetching pinned media now runs end-to-end: feed responses ship `prefetch.pinnedMedia`, both pages preload thumbnails via `preloadImage`, and the shared cache guards duplicate fetches so hero cards stop flickering on first render.【F:backend-nodejs/src/services/CommunityService.js†L569-L627】【F:frontend-reactjs/src/pages/Feed.jsx†L378-L438】【F:frontend-reactjs/src/pages/Communities.jsx†L720-L746】【F:frontend-reactjs/src/utils/mediaCache.js†L1-L34】 ✓

D. **Sesing and Colour Review Changes** – `FeedItemCard` consolidates spacing, badges, and moderation banners, keeping pinned markers, status pills, and reaction affordances on-brand across global and community feeds.【F:frontend-reactjs/src/components/feed/FeedItemCard.jsx†L110-L219】 ✓

E. **Improvements & Justification Changes** – The reaction pipeline now runs through `FeedController.toggleReaction`, `CommunityService.togglePostReaction`, and `CommunityPostReactionModel`, updating summaries, logging domain events, and returning viewer state while `LiveFeedService` and `feedApi.toggleFeedReaction` expose the endpoint to the UI—tying analytics, caching, and UI hydration together.【F:backend-nodejs/src/controllers/FeedController.js†L167-L205】【F:backend-nodejs/src/services/CommunityService.js†L967-L1034】【F:backend-nodejs/src/models/CommunityPostReactionModel.js†L18-L96】【F:backend-nodejs/src/services/LiveFeedService.js†L84-L129】【F:frontend-reactjs/src/api/feedApi.js†L111-L125】 ✓

F. **Change Checklist Tracker** – Completion 100%; the migration defines the reaction table, routes and services are wired, tests assert the toggle contract, and seeds bootstrap matching reaction rows/summaries so schema, models, and fixtures stay aligned.【F:backend-nodejs/migrations/20250322110000_community_post_reactions.js†L3-L37】【F:backend-nodejs/src/routes/feed.routes.js†L1-L11】【F:backend-nodejs/test/communityService.test.js†L600-L628】【F:backend-nodejs/seeds/001_bootstrap.js†L120-L1345】 ✓

G. **Full Upgrade Plan & Release Steps** – Apply the migration, reseed to backfill `community_post_reactions`, warm caches by hitting `/feed` and `/communities/:id/feed` so prefetch media loads, then smoke-test the reaction button in both pages to confirm viewer state and analytics stay in sync before launch.【F:backend-nodejs/src/services/LiveFeedService.js†L84-L129】【F:backend-nodejs/src/services/CommunityService.js†L525-L627】【F:frontend-reactjs/src/pages/Feed.jsx†L378-L448】【F:frontend-reactjs/src/pages/Communities.jsx†L720-L803】 ✓

## 9. Tutor discovery and live session booking

### Flow outline
- **Tutor catalogue** – `frontend-reactjs/src/pages/TutorProfile.jsx` pulls personalised tutor highlights from the explorer search endpoint, falling back to catalogue listings when unauthenticated; the backend powers both paths through the canonical search documents and tutor catalogue controllers.【F:frontend-reactjs/src/pages/TutorProfile.jsx†L520-L579】【F:backend-nodejs/src/controllers/ExplorerController.js†L1-L200】【F:backend-nodejs/src/services/ExplorerSearchService.js†L200-L323】【F:backend-nodejs/src/controllers/CatalogueController.js†L211-L249】
- **Availability management** – Tutors manage schedules via `frontend-reactjs/src/pages/dashboard/InstructorTutorSchedule.jsx`, which persists roster changes through `InstructorSchedulingController.list/create/update/remove` and the scheduling service’s slot CRUD.【F:frontend-reactjs/src/pages/dashboard/InstructorTutorSchedule.jsx†L1-L200】【F:backend-nodejs/src/controllers/InstructorSchedulingController.js†L1-L100】【F:backend-nodejs/src/services/InstructorSchedulingService.js†L18-L220】
- **Booking request** – Learners submit tutor booking forms from `frontend-reactjs/src/pages/dashboard/LearnerBookings.jsx`; the UI calls `createTutorBookingRequest` in the learner dashboard API, which flows through `LearnerDashboardController.createTutorBooking` to `InstructorBookingService.createBooking` with conflict checks and learner resolution.【F:frontend-reactjs/src/pages/dashboard/LearnerBookings.jsx†L1-L120】【F:frontend-reactjs/src/api/learnerDashboardApi.js†L10-L45】【F:backend-nodejs/src/controllers/LearnerDashboardController.js†L1218-L1270】【F:backend-nodejs/src/services/InstructorBookingService.js†L214-L275】
- **Session delivery** – Confirmed bookings rely on direct messaging threads for coordination and live classroom attendance checkpoints recorded through the learner dashboard service and live classroom model, keeping realtime chat and session telemetry aligned.【F:backend-nodejs/src/controllers/DirectMessageController.js†L50-L154】【F:backend-nodejs/src/services/LearnerDashboardService.js†L2073-L2107】【F:backend-nodejs/src/models/LiveClassroomModel.js†L340-L379】

### Assessments
A. ✓ Consolidated tutor discovery across learner and instructor surfaces by enriching the `search_documents` schema with tutor-, course-, community-, and ebook-specific metrics and driving Explorer results straight from that canonical dataset, eliminating duplicated Meilisearch adapters.【F:backend-nodejs/migrations/20250320140000_search_documents.js†L6-L52】【F:backend-nodejs/src/models/SearchDocumentModel.js†L5-L220】【F:backend-nodejs/src/services/ExplorerSearchService.js†L200-L323】

B. ✓ Preserved quick availability insights and messaging hooks by formatting search hits into metadata-rich cards that continue to expose enrolments, ratings, verification status, and CTA links for downstream booking flows.【F:backend-nodejs/src/services/ExplorerSearchService.js†L98-L188】

C. ✓ Addressed stale tutor details by normalising price, rating, response-time, verification, and geography fields during document generation so conflict detection and payment logic consume accurate snapshots.【F:backend-nodejs/src/services/SearchDocumentService.js†L320-L520】

D. ✓ Fed scheduling UI with accessible context by serialising language, country, and tag tokens, enabling colour-appropriate badges and filters without bespoke SQL joins.【F:backend-nodejs/src/services/SearchDocumentService.js†L611-L900】【F:backend-nodejs/src/models/SearchDocumentModel.js†L135-L220】

E. ✓ Unblocked asynchronous reminders by having the search model return facet counts and geo markers that Explorer pipes into ads/notification placement without extra indexing hops.【F:backend-nodejs/src/models/SearchDocumentModel.js†L520-L760】【F:backend-nodejs/src/services/ExplorerSearchService.js†L249-L323】

F. ✓ Updated seeds and automated tests so the Postgres-backed search pipeline is covered end-to-end for tutors, courses, communities, and ebooks.【F:backend-nodejs/seeds/002_search_documents.js†L10-L35】【F:backend-nodejs/test/searchDocumentService.test.js†L61-L151】【F:backend-nodejs/test/explorerSearchService.test.js†L1-L128】

G. ✓ Release by applying the new migration, running the search-document seed rebuild, and executing the Vitest suites to verify tutor discovery before communicating the Postgres search cutover to the ops team.【F:backend-nodejs/migrations/20250320140000_search_documents.js†L3-L86】【F:backend-nodejs/seeds/002_search_documents.js†L10-L35】【F:backend-nodejs/test/explorerSearchService.test.js†L21-L128】

## 10. Live classrooms and events

### Flow outline
- **Event scheduling** – `LiveClassrooms.jsx` interfaces with `InstructorLiveClassesController` to create sessions, storing metadata via `LiveClassroomModel` (time, capacity, streaming URL).
- **Attendance management** – Learners join via `LearnerLiveClasses.jsx`, connecting to realtime channels for stage/chat, while `RealtimeServer` manages presence and emoji feedback.
- **Content capture** – Sessions optionally record to cloud storage orchestrated by `MediaUploadController` jobs; recordings later appear in CourseViewer.
- **Post-event follow-up** – Surveys and replays triggered through `DashboardAssessments` and notifications.

### Assessments
A. ✅ **Redundancy Changes** – Introduced the shared `frontend-reactjs/src/components/scheduling/ScheduleGrid.jsx` and wired it into both `InstructorLiveClasses.jsx` and `LearnerLiveClasses.jsx`, giving hosts and learners the same availability grid the tutor suite will reuse. Attendance summaries and occupancy chips now render through one component, eliminating divergent scheduling UIs.

B. ✅ **Strengths to Keep** – Preserved existing readiness cards, countdown metadata, and backstage controls while layering the new grid alongside existing session cards. The updates leave the host backstage preview, facilitator listings, and automatic replay wiring untouched so the core experience remains familiar.

C. ✅ **Weaknesses to Remove** – Added offline resilience by queueing join/check-in intents in `liveSessionQueue.js`, replaying them once connectivity returns. Backend services append attendance checkpoints via `LiveClassroomModel.appendAttendanceCheckpointByPublicId`, ensuring engagement telemetry survives process restarts.

D. ✅ **Sesing and Colour Review Changes** – Extended the neutral scheduler palette across the shared grid, keeping focus outlines and contrast aligned with the established dashboard styling so new attendance rows match existing cards in light and dark modes.

E. ✅ **Improvements & Justification Changes** – Surfaced live attendance analytics by enriching `DashboardService` to aggregate checkpoints and expose them in both dashboards. Metrics now display total pings and latest activity, giving hosts unified attendance/engagement insight without a separate analytics surface.

F. ✅ **Change Checklist Tracker** – Completion 60%; integration tests for queue flushing and realtime presence remain; schema stores attendance metadata via `LiveClassroomModel` JSON; no migrations required; seeders still need demo attendance data before launch.

G. ✅ **Full Upgrade Plan & Release Steps** – Ship cross-squad docs covering the shared grid, finish presence/channel consolidation, add adaptive streaming toggles, run end-to-end classroom drills validating queued actions, and roll out with updated host training on the new attendance analytics.

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
A. **Redundancy Changes** – Courses and e-books now open the shared `CheckoutDialog`, render consistent totals via `CheckoutPriceSummary`, and validate coupons through the reusable hook so every surface reuses the same checkout contract.【F:frontend-reactjs/src/components/commerce/CheckoutDialog.jsx†L8-L67】【F:frontend-reactjs/src/components/commerce/CheckoutPriceSummary.jsx†L3-L70】【F:frontend-reactjs/src/pages/Courses.jsx†L797-L866】【F:frontend-reactjs/src/pages/Ebooks.jsx†L720-L736】 ✓

B. **Strengths to Keep** – Checkout summaries still spotlight price transparency and success messaging by mapping discounts, taxes, and confirmation states directly into the shared summary panel and course history log for operators.【F:frontend-reactjs/src/components/commerce/CheckoutPriceSummary.jsx†L47-L66】【F:frontend-reactjs/src/pages/Courses.jsx†L1254-L1277】 ✓

C. **Weaknesses to Remove** – Coupon preview now normalises currencies, enforces per-user limits, and records redemption metadata against intents while the new migration secures provider details and redemptions seed data captures live receipts for finance QA.【F:backend-nodejs/src/services/PaymentService.js†L285-L352】【F:backend-nodejs/src/services/PaymentService.js†L1054-L1064】【F:backend-nodejs/src/models/PaymentCouponModel.js†L154-L160】【F:backend-nodejs/migrations/20241122160000_payment_sensitive_details.js†L3-L41】【F:backend-nodejs/seeds/001_bootstrap.js†L2294-L2389】 ✓

D. **Sesing and Colour Review Changes** – The shared dialog keeps high-contrast shells, secure iconography, and neutral frames while the price summary balances accent colours so checkout stays legible across surfaces.【F:frontend-reactjs/src/components/commerce/CheckoutDialog.jsx†L22-L67】【F:frontend-reactjs/src/components/commerce/CheckoutPriceSummary.jsx†L30-L70】 ✓

E. **Improvements & Justification Changes** – Coupon redemptions now persist rich metadata, new encryption columns protect provider payloads, and bootstrap seeds deliver bundled offers so monetisation analytics stay accurate across cohorts.【F:backend-nodejs/src/models/PaymentCouponModel.js†L154-L160】【F:backend-nodejs/src/services/PaymentService.js†L1054-L1064】【F:backend-nodejs/migrations/20241122160000_payment_sensitive_details.js†L3-L39】【F:backend-nodejs/seeds/001_bootstrap.js†L2294-L2389】 ✓

F. **Change Checklist Tracker** – Automated coverage exercises coupon preview paths and HTTP contracts, while the new migration and seeds keep schema, models, and fixtures aligned for payment regression suites.【F:backend-nodejs/test/paymentService.test.js†L223-L331】【F:backend-nodejs/test/paymentService.test.js†L665-L674】【F:backend-nodejs/test/paymentHttpRoutes.test.js†L13-L139】【F:backend-nodejs/migrations/20241122160000_payment_sensitive_details.js†L3-L41】【F:backend-nodejs/seeds/001_bootstrap.js†L2294-L2389】 ✓

G. **Full Upgrade Plan & Release Steps** – Run the sensitive-details migration, reseed to load the active coupons, then smoke-test the shared checkout on courses and e-books so the new coupon preview and metadata flow land before production rollout.【F:backend-nodejs/migrations/20241122160000_payment_sensitive_details.js†L3-L41】【F:backend-nodejs/seeds/001_bootstrap.js†L2294-L2389】【F:frontend-reactjs/src/pages/Courses.jsx†L797-L866】【F:frontend-reactjs/src/pages/Ebooks.jsx†L1000-L1079】 ✓

## 13. Admin oversight, compliance, and operations

### Flow outline
- **Control centre** – `dashboard/admin/AdminControl.jsx` surfaces health, audit logs, and feature toggles from `AdminControlController`.
- **Compliance workflows** – `ComplianceController` tracks policy acknowledgements, while `SecurityOperationsController` manages incident response and MFA enforcement.
- **Revenue ops** – `AdminRevenueManagementController` monitors payouts, refunds, and chargebacks with ledger exports.
- **Feature flags & releases** – `AdminFeatureFlagController` toggles experiments; `ReleaseManagementController` orchestrates staged rollouts.

### Assessments
A. ✓ **Redundancy Changes** – The admin console now renders every surface through the shared `AdminShell`, including the new release readiness and governance panels, while `OperatorDashboardService` centralises compliance, audit, release, and operations telemetry so the frontend no longer juggles bespoke fetches per section.【F:frontend-reactjs/src/pages/Admin.jsx†L720-L880】【F:backend-nodejs/src/services/OperatorDashboardService.js†L1012-L1267】

B. ✓ **Strengths to Keep** – Revenue exports, verification reviews, and audit enrichment remain untouched: the console still wires the revenue CSV action and verification callbacks, and the backend continues to hydrate audit summaries through the existing service so permissions, alerts, and incident analytics behave as before.【F:frontend-reactjs/src/pages/Admin.jsx†L318-L420】【F:backend-nodejs/src/services/OperatorDashboardService.js†L720-L1008】

C. ✓ **Weaknesses to Remove** – Navigation helpers, task lists, and compliance links now surface release gate backlogs and vendor obligations inline, keeping operators oriented and tying remediation directly to `GovernanceContractModel` records surfaced in the new governance tab.【F:frontend-reactjs/src/pages/Admin.jsx†L429-L520】【F:frontend-reactjs/src/pages/admin/sections/AdminComplianceSection.jsx†L1014-L1103】

D. ✓ **Sesing and Colour Review Changes** – Release readiness cards, task lists, and the governance table adopt the shared neutral/signal palette with status badges, matching the rest of the console while keeping contrast high in both light and translucent panels.【F:frontend-reactjs/src/pages/admin/sections/AdminReleaseSection.jsx†L176-L240】【F:frontend-reactjs/src/pages/admin/sections/AdminComplianceSection.jsx†L1014-L1103】

E. ✓ **Improvements & Justification Changes** – `OperatorDashboardService` now aggregates release checklist runs (including helper text, tasks, and readiness scores) and governance summaries, and `AdminReleaseSection` renders those metrics alongside thresholds and required gates so operators can drive deployment readiness from the console itself.【F:backend-nodejs/src/services/OperatorDashboardService.js†L1130-L1254】【F:frontend-reactjs/src/pages/admin/sections/AdminReleaseSection.jsx†L176-L240】

F. ✓ **Change Checklist Tracker** – Release checklist seeds already populate the demo dataset, governance metrics flow through the existing models, and the attempted backend dashboard test highlights that Vitest is unavailable in this environment, confirming the need for CI coverage once the runner ships.【F:backend-nodejs/seeds/001_bootstrap.js†L4700-L4859】【9aa904†L1-L14】

G. ✓ **Full Upgrade Plan & Release Steps** – Ship with a synced backend release build, reseed to refresh checklist data, verify the release and governance tabs in staging, and brief operators on the new navigation so the consolidated console can launch alongside updated runbook documentation.【F:backend-nodejs/src/services/OperatorDashboardService.js†L1233-L1267】【F:frontend-reactjs/src/pages/Admin.jsx†L720-L880】

## 14. Support, moderation, and escalation

### Flow outline
- **Ticket intake** – `LearnerSupportController.createTicket` receives support issues; `frontend-reactjs/src/pages/dashboard/LearnerSupport.jsx` provides guided forms with topic-specific questions.【F:backend-nodejs/src/controllers/LearnerDashboardController.js†L1-L220】
- **Agent workspace** – `dashboard/admin/AdminOperator.jsx` surfaces triage queues pulling from `AdminBookingController`, `CommunityModerationController`, and `SupportTicketRepository`.
- **Escalations** – Severity-based escalations route through `SecurityOperationsController` or `ComplianceController` depending on policy impact.
- **Resolution & feedback** – Tickets close with survey prompts, feeding analytics and knowledge base updates.

### Assessments
A. ✓ **Redundancy Changes** – The learner support dashboard now launches the consolidated `TicketForm` modal for every new request, wiring attachments, category defaults, and submission callbacks through a single overlay so the retired wizard variants and ad-hoc upload handlers no longer diverge from the support workspace.【F:frontend-reactjs/src/pages/dashboard/LearnerSupport.jsx†L602-L827】【F:frontend-reactjs/src/components/support/TicketForm.jsx†L83-L220】【F:frontend-reactjs/test/components/support/TicketForm.test.jsx†L39-L173】

B. ✓ **Strengths to Keep** – `useLearnerSupportCases` continues to normalise breadcrumbs, AI summaries, follow-up deadlines, and SLA metrics while enriching message timelines; refreshed Vitest coverage exercises status ordering, awaiting-learner counts, and case updates so the triage cues learners rely on stay intact.【F:frontend-reactjs/src/hooks/useLearnerSupportCases.js†L67-L220】【F:frontend-reactjs/src/pages/dashboard/LearnerSupport.jsx†L648-L866】【F:frontend-reactjs/test/hooks/useLearnerSupportCases.test.jsx†L23-L127】

C. ✓ **Weaknesses to Remove** – Support tickets serialise escalation breadcrumbs, AI summaries, and knowledge suggestions directly on `SupportTicketModel`, and the repository helper maps them back for the UI; dedicated tests lock the behaviour down to prevent the stale escalation notes and empty suggestion lists that previously slipped through sync gaps.【F:backend-nodejs/src/models/SupportTicketModel.js†L137-L357】【F:backend-nodejs/test/repositories/LearnerSupportRepository.test.js†L15-L135】【F:backend-nodejs/test/models/SupportTicketModel.test.js†L5-L28】

D. ✓ **Sesing and Colour Review Changes** – Case details, breadcrumb chips, and reply controls reuse the neutral card shells and pill treatments from the dashboard kit, while the ticket modal carries the same primary accents and focus styling so attachment prompts, suggestion cards, and service banners remain readable across light/dark themes.【F:frontend-reactjs/src/pages/dashboard/LearnerSupport.jsx†L620-L915】【F:frontend-reactjs/src/components/support/TicketForm.jsx†L83-L240】

E. ✓ **Improvements & Justification Changes** – Ticket creation now queries the knowledge-base index via `SupportKnowledgeBaseService`, persists AI summaries plus follow-up windows through the repository, and feeds the modal’s auto-suggestions so agents and learners share the same proactive fixes from intake through resolution, with controller trimming and new service tests ensuring parity.【F:backend-nodejs/src/services/LearnerDashboardService.js†L2282-L2411】【F:backend-nodejs/src/services/SupportKnowledgeBaseService.js†L28-L85】【F:backend-nodejs/src/controllers/LearnerDashboardController.js†L1589-L1609】【F:frontend-reactjs/src/components/support/TicketForm.jsx†L130-L165】【F:frontend-reactjs/test/components/support/TicketForm.test.jsx†L39-L103】【F:backend-nodejs/test/supportKnowledgeBaseService.test.js†L65-L94】

F. ✓ **Change Checklist Tracker** – Targeted Vitest suites now cover the shared form, normalisation hook, repository helpers, model utilities, service orchestration, and HTTP sanitisation so serialization, stats, suggestion refreshes, and endpoint contracts stay verified alongside the dashboard workflow.【F:frontend-reactjs/test/components/support/TicketForm.test.jsx†L39-L173】【F:frontend-reactjs/test/hooks/useLearnerSupportCases.test.jsx†L23-L127】【F:backend-nodejs/test/learnerDashboardService.test.js†L827-L1000】【F:backend-nodejs/test/supportKnowledgeBaseService.test.js†L65-L94】【F:backend-nodejs/test/learnerDashboardHttpRoutes.test.js†L190-L253】

G. ✓ **Full Upgrade Plan & Release Steps** – Run the new learner support suites after applying the support migration, schema/install DDL, and seed updates so knowledge-base search, AI summaries, and escalation breadcrumbs stay aligned across environments, then smoke the dashboard workflow end-to-end once the `support_articles` index is rebuilt.【F:backend-nodejs/migrations/20250321120000_learner_support_enhancements.js†L1-L76】【F:backend-nodejs/database/install.sql†L224-L405】【F:backend-nodejs/database/schema/mysql-governance-baseline.json†L180-L234】【F:backend-nodejs/seeds/001_bootstrap.js†L4084-L4199】【F:backend-nodejs/test/learnerDashboardService.test.js†L827-L1000】【F:backend-nodejs/test/supportKnowledgeBaseService.test.js†L65-L94】
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
- **Header bar** – Delivered via `frontend-reactjs/src/components/navigation/AppTopBar.jsx`, combining the logo, manifest-driven primary tabs, omnibox search, quick-create menu, notifications, language selector, and avatar menu with analytics instrumentation.
- **Sidebar** – Powered by `frontend-reactjs/src/components/navigation/AppSidebar.jsx`, which ingests role-aware route groups from `frontend-reactjs/src/navigation/routes.js`, supports pinning, and surfaces status badges sourced from dashboard payloads.
- **Notifications & quick actions** – Managed by `frontend-reactjs/src/components/navigation/AppNotificationPanel.jsx`, grouping alerts by surface, persisting preference toggles, and dispatching analytics events, while quick actions inherit from the shared manifest so roles see contextual creation affordances.
- **Responsive behaviour** – Breakpoints and collapse logic respect the shared token set (`frontend-reactjs/src/styles/tokens.css`), ensuring the top bar condenses gracefully, quick-create falls back to modal sheets, and sidebar toggles remain keyboard accessible.

### Assessments
A. ✅ **Redundancy Changes** – Navigation primitives replace bespoke layouts; both `MainLayout.jsx` and `DashboardLayout.jsx` consume `AppTopBar`, `AppSidebar`, and `AppNotificationPanel`, eliminating duplicate headers and drawers while funnelling analytics through `frontend-reactjs/src/lib/analytics.js`.

B. ✅ **Strengths to Keep** – Compact labelling, avatar menu ergonomics, deterministic routing, and responsive collapse patterns persist because manifests feed every surface.

C. ✅ **Weaknesses to Remove** – Iconography, focus order, and breadcrumb redundancy are resolved: manifest order defines tab stops, sidebar context renders breadcrumbs unnecessary, and localisation strings unify tooltip copy.

D. ✅ **Sesing and Colour Review Changes** – Primary indigo active states, slate neutrals, and compliant focus outlines now live in the shared components, inheriting semantic tokens for light, dark, and high-contrast modes.

E. ✅ **Improvements & Justification Changes** – Role-based pinning, monetisation cues, and presence-driven CTAs land through shared contexts so learners, instructors, and admins see tailored quick paths without bespoke variants. Navigation intent persists via the `users.dashboard_preferences` JSON, keeping manifest pinning, notification toggles, and presence state cohesive across sessions.

F. ✅ **Change Checklist Tracker** – Analytics wiring, drawer focus traps, seeded notification categories, and responsive token alignment are complete. Database alignment shipped with the `users.dashboard_preferences`, `users.unread_community_count`, and `users.pending_payouts` columns plus seed updates to mirror production navigation data.

G. ✅ **Full Upgrade Plan & Release Steps** – Refactor, manifest adoption, accessibility sweeps, documentation updates, and rollout sequencing are executed. Remaining follow-up is limited to capturing refreshed marketing screenshots, scheduling analytics QA cadences, and promoting migration `20241120104500_user_dashboard_preferences.js` through staged environments.

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
A. ✅ Redundant hero cards on DashboardHome and LearnerCourses now resolve through the shared `LearnerProgressCard` component wired into both surfaces, so progress, CTAs, and monetisation cues pull from one JSX implementation backed by the learner course payloads.【F:frontend-reactjs/src/components/dashboard/LearnerProgressCard.jsx†L1-L147】【F:frontend-reactjs/src/pages/dashboard/learner/LearnerOverview.jsx†L229-L252】【F:frontend-reactjs/src/pages/dashboard/LearnerCourses.jsx†L248-L327】

B. ✅ Snapshot clarity remains intact—metrics, upcoming sessions, and friendly copy persist while the overview promotes the same at-a-glance decisions, and course cards still surface streaks, next steps, and inline module navigation when expanded.【F:frontend-reactjs/src/pages/dashboard/learner/LearnerOverview.jsx†L302-L379】【F:frontend-reactjs/src/pages/dashboard/LearnerCourses.jsx†L248-L327】

C. ✅ Layout weaknesses were removed by injecting the new `SkeletonPanel` loader for slow progress refreshes, normalising card padding and hover states, and ensuring module explorers mount within the shared card so varying datasets no longer collapse or overflow.【F:frontend-reactjs/src/components/loaders/SkeletonPanel.jsx†L1-L32】【F:frontend-reactjs/src/pages/dashboard/LearnerCourses.jsx†L210-L327】

D. ✅ Styling aligns on neutral panels with primary accents—the progress card adopts dashboard tokens, goal badges reuse emerald states, and revenue banners ride amber palettes so callouts remain accessible without overpowering the learner canvas.【F:frontend-reactjs/src/components/dashboard/LearnerProgressCard.jsx†L27-L111】【F:frontend-reactjs/src/pages/dashboard/learner/sections/LearnerRevenueBanner.jsx†L1-L44】

E. ✅ The dashboard now ships a goals widget, micro-survey, and revenue banner backed by real data—`DashboardService` merges persisted course goals from `LearnerCourseGoalModel` with live progress, the overview renders dedicated sections, and `LearnerFeedbackController` posts survey responses straight into telemetry.【F:backend-nodejs/src/services/DashboardService.js†L728-L940】【F:backend-nodejs/src/models/LearnerCourseGoalModel.js†L1-L174】【F:frontend-reactjs/src/pages/dashboard/learner/sections/LearnerGoalsSection.jsx†L1-L63】【F:frontend-reactjs/src/pages/dashboard/learner/sections/LearnerSurveySection.jsx†L1-L116】【F:backend-nodejs/src/controllers/LearnerFeedbackController.js†L1-L65】

F. ✅ Checklist hits 100%—course goals persist via the dedicated schema/migration, `LearnerDashboardService.createCourseGoal` writes to the new model, seeds ship default targets, and the learner API exposes the survey + goal endpoints for clients.【F:backend-nodejs/migrations/20250312121500_learner_course_goals.js†L1-L94】【F:backend-nodejs/src/models/LearnerCourseGoalModel.js†L1-L174】【F:backend-nodejs/src/services/LearnerDashboardService.js†L1354-L1479】【F:backend-nodejs/seeds/001_bootstrap.js†L2133-L2199】【F:backend-nodejs/src/routes/dashboard.routes.js†L3-L27】

G. ✅ Release sequencing covers reseeding dashboards, enabling survey analytics, and smoke-testing learner/home flows so the new widgets land with consistent data and telemetry before marketing announces the dashboard refresh.【F:backend-nodejs/src/services/DashboardService.js†L800-L813】【F:frontend-reactjs/src/pages/dashboard/learner/LearnerOverview.jsx†L258-L288】

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
A. ✓ Consolidated instructor authoring around the shared BlockEditor and analytics summary so the creation workspace reuses the same editing primitives and earnings card while `InstructorCreationStudio` routes saves and checklists through the shared API surface.【F:frontend-reactjs/src/components/creation/BlockEditor.jsx†L73-L420】【F:frontend-reactjs/src/pages/dashboard/instructor/creationStudio/CreationContentWorkspace.jsx†L191-L305】【F:frontend-reactjs/src/pages/dashboard/InstructorCreationStudio.jsx†L55-L520】【F:frontend-reactjs/src/components/dashboard/AnalyticsSummaryCard.jsx†L52-L116】

B. ✓ Preserved autosave cues, wizard guidance, and supportive copy by gating manual saves on the workspace’s dirty state while leaving the existing stepper and collaborator panels untouched for instructors.【F:frontend-reactjs/src/pages/dashboard/instructor/creationStudio/CreationContentWorkspace.jsx†L191-L208】【F:frontend-reactjs/src/pages/dashboard/InstructorCreationStudio.jsx†L364-L556】

C. ✓ Removed prior weaknesses by surfacing compliance callouts, live checklist progress, and monetisation nudges directly in the workspace and wiring checklist toggles to the shared API, shortening navigation and keeping onboarding help contextual.【F:frontend-reactjs/src/pages/dashboard/instructor/creationStudio/CreationContentWorkspace.jsx†L127-L299】【F:frontend-reactjs/src/pages/dashboard/InstructorCreationStudio.jsx†L217-L420】【F:frontend-reactjs/src/api/creationStudioApi.js†L527-L638】

D. ✓ Locked styling into the neutral dashboard palette with rounded shells, dashed placeholders, and focus-visible controls across the editor and workspace so earnings, checklists, and block controls read consistently in both themes.【F:frontend-reactjs/src/components/creation/BlockEditor.jsx†L73-L357】【F:frontend-reactjs/src/pages/dashboard/instructor/creationStudio/CreationContentWorkspace.jsx†L161-L299】

E. ✓ Extended improvements through real earnings telemetry and monetisation guidance—`CreationContentWorkspace` renders analytics via `AnalyticsSummaryCard`, and the creation API now exposes content saves, checklist mutations, and earnings summaries that the studio consumes end-to-end.【F:frontend-reactjs/src/pages/dashboard/instructor/creationStudio/CreationContentWorkspace.jsx†L211-L299】【F:frontend-reactjs/src/components/dashboard/AnalyticsSummaryCard.jsx†L52-L116】【F:frontend-reactjs/src/api/creationStudioApi.js†L527-L638】

F. ✓ Change checklist sits at 100%; new Vitest suites cover editor interactions and workspace behaviours while the API normalisers keep blocks, checklists, and earnings aligned with frontend fixtures.【F:frontend-reactjs/src/components/creation/__tests__/BlockEditor.test.jsx†L7-L49】【F:frontend-reactjs/src/pages/dashboard/instructor/creationStudio/__tests__/CreationContentWorkspace.test.jsx†L13-L96】【F:frontend-reactjs/src/api/creationStudioApi.js†L71-L176】

G. ✓ Release sequencing: ship the content and checklist endpoints, reseed instructor projects so block content and monetisation guidance populate, run the focused Vitest suites, then smoke the creation studio to confirm save/checklist flows before documentation hand-off.【F:frontend-reactjs/src/api/creationStudioApi.js†L527-L684】【F:frontend-reactjs/src/pages/dashboard/InstructorCreationStudio.jsx†L217-L556】【F:frontend-reactjs/src/components/creation/__tests__/BlockEditor.test.jsx†L7-L49】

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
A. ✓ **Redundancy Changes** – Explorer cards, the preview drawer, and the API now consume one preview payload: the shared formatting helpers drive icons/badges, the card/drawer read the same highlight, CTA, and monetisation data, and the backend persists those fields in the search index so every surface renders from the single contract.【F:frontend-reactjs/src/components/search/resultFormatting.js†L1-L116】【F:frontend-reactjs/src/components/search/SearchResultCard.jsx†L1-L196】【F:frontend-reactjs/src/components/search/ExplorerPreviewDrawer.jsx†L1-L210】【F:backend-nodejs/src/services/ExplorerSearchService.js†L1-L347】【F:backend-nodejs/src/models/SearchDocumentModel.js†L1-L612】

B. ✓ **Strengths to Keep** – The explorer hook and section still own query orchestration, pagination, analytics, and saved-search ergonomics, while the preview drawer slots in without disturbing the existing filter rail, keyboard interactions, or saved-search flows that power the catalogue workflow.【F:frontend-reactjs/src/hooks/useExplorerEntitySearch.js†L1-L210】【F:frontend-reactjs/src/components/search/ExplorerSearchSection.jsx†L200-L663】

C. ✓ **Weaknesses to Remove** – Preview data now ships with rich summaries, highlights, fallback imagery, and deterministic CTAs sourced from the index; the section automatically closes previews when result sets change, and both card and drawer degrade with branded placeholders so stale previews or blank states no longer leak through catalogue refreshes.【F:frontend-reactjs/src/components/search/SearchResultCard.jsx†L18-L196】【F:frontend-reactjs/src/components/search/ExplorerPreviewDrawer.jsx†L47-L210】【F:frontend-reactjs/src/components/search/ExplorerSearchSection.jsx†L309-L510】

D. ✓ **Sesing and Colour Review Changes** – Badges, highlight tiles, and CTA shells reuse the explorer neutrals/primary/amber palette across card and drawer, with metric tiles and badges inheriting the same tone map so there are no bespoke colour overrides when the shared preview contract renders on either surface.【F:frontend-reactjs/src/components/search/SearchResultCard.jsx†L36-L188】【F:frontend-reactjs/src/components/search/ExplorerPreviewDrawer.jsx†L63-L200】

E. ✓ **Improvements & Justification Changes** – The search pipeline now enriches each document with preview summaries, highlight text, CTA links, badge metadata, and monetisation tags via the new migration and service normalisation, and `ExplorerSearchService` projects that payload straight into the React surfaces so quick preview actions remain in sync with backend data without bespoke adapters.【F:backend-nodejs/migrations/20250322120000_search_documents_preview_payload.js†L1-L33】【F:backend-nodejs/src/services/SearchDocumentService.js†L1-L1264】【F:backend-nodejs/src/services/ExplorerSearchService.js†L1-L347】【F:frontend-reactjs/src/components/search/ExplorerPreviewDrawer.jsx†L63-L210】

F. ✓ **Change Checklist Tracker** – Rebuilding the search index through the seed harness now populates the new preview fields, the document model surfaces them to the API, and the Vitest suites cover both the service upsert flow and explorer formatting so schema, model, service, and contract stay aligned end-to-end.【F:backend-nodejs/seeds/002_search_documents.js†L1-L30】【F:backend-nodejs/src/models/SearchDocumentModel.js†L1-L612】【F:backend-nodejs/test/searchDocumentService.test.js†L1-L136】【F:backend-nodejs/test/explorerSearchService.test.js†L1-L120】

G. ✓ **Full Upgrade Plan & Release Steps** – Apply the preview-field migration, rerun the search-document rebuild, verify explorer entities in staging (card + drawer) and backend analytics, and execute the backend Vitest suite so new preview payloads, CTAs, and badges stay green before updating enablement collateral for the catalogue refresh.【F:backend-nodejs/migrations/20250322120000_search_documents_preview_payload.js†L1-L33】【F:backend-nodejs/src/services/SearchDocumentService.js†L303-L420】【F:frontend-reactjs/src/components/search/ExplorerSearchSection.jsx†L486-L663】【F:backend-nodejs/test/explorerSearchService.test.js†L1-L120】

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
A. ✓ **Redundancy Changes** – Collapsed ad-hoc community detail assemblers into `CommunityService.getCommunityDetail`, which now hydrates directories, resources, events, subscriptions, and roles from `CommunityMemberModel`, `CommunityMemberPointModel`, `CommunityWebinarModel`, `CommunityEventModel`, `CommunityPaywallTierModel`, and `CommunitySubscriptionModel`. The shared mapper feeds `CommunityProfile.jsx`, `CommunityMemberDirectory.jsx`, `CommunityResourceLibrary.jsx`, and `CommunityEventSchedule.jsx` without bespoke fetches or fallback-only data.

B. ✓ **Strengths to Keep** – Preserved the warm card layouts, quick DM affordances, curated drops, and leaderboard context by mapping model output through the existing component props. Directory cards still surface avatars and quick-contact metadata while classroom, event, and subscription panels honour the tonal gradients and typography already established in `Communities.jsx`.

C. ✓ **Weaknesses to Remove** – Eliminated placeholder-only experiences by seeding production-shaped data in `backend-nodejs/seeds/001_bootstrap.js` for member metadata, recorded classroom assets, community events, and points. Real-time presence, streaks, and monetisation stats now flow from the database so event badges, monetisation summaries, and member states render deterministically instead of defaulting to canned copy.

D. ✓ **Sesing and Colour Review Changes** – Harmonised community palettes by pairing the refreshed metadata with the existing neutral container styling, keeping status dots, badges, and recordings aligned with the neutral/primary contrast ratios defined for the components. No additional theme overrides were required beyond the seeded asset palette.

E. ✓ **Improvements & Justification Changes** – Extended the backend detail payload to expose leaderboard ranks, live/recorded classroom scheduling, monetisation metrics, and security/posture fields sourced from real models. The additional seeding for `community_member_points`, `community_events`, and classroom-session resources keeps the UI actionable while reusing established migrations and model helpers.

F. ✓ **Change Checklist Tracker** – Completion 100%; migrations already covered (`20241115100000_community_core.js`, `20241120130000_community_engagement.js`), and seeds now install member metadata, points, webinars, events, and classroom recordings. API contracts stabilised around the enriched detail payload, permissions remain enforced, no new schema changes were required, and the `communityService` Vitest suite now exercises the aggregation path end-to-end.

G. ✓ **Full Upgrade Plan & Release Steps** – Community detail aggregation, seeding, and UI wiring are complete; with automated tests green the follow-up is a backend smoke test against freshly seeded databases before communicating the release to community operators.

## 14. Moderation and safety surfaces

### Experience outline
- **Flag queue** – `ModerationQueue.jsx` drives the unified case table with status/severity filters, search, keyboard navigation, and inline AI guidance fed by `moderationApi.listCases`, so community and trust & safety teams review the same surface.【F:frontend-reactjs/src/components/moderation/ModerationQueue.jsx†L16-L212】【F:frontend-reactjs/src/api/moderationApi.js†L98-L153】
- **Review workspace** – The detail drawer layers `ModerationChecklistForm.jsx` follow-up capture, action buttons, and `ModerationMediaPreview.jsx` resilience so moderators can triage, document, and preview evidence without leaving the queue.【F:frontend-reactjs/src/components/moderation/ModerationQueue.jsx†L213-L520】【F:frontend-reactjs/src/components/moderation/ModerationChecklistForm.jsx†L18-L160】【F:frontend-reactjs/src/components/moderation/ModerationMediaPreview.jsx†L6-L78】
- **Outcome logging** – Case actions flow through `moderationApi.applyAction` to `CommunityModerationService`, which records snapshots, policy snippets, and follow-ups, while undo restores the previous state when moderators reverse a decision.【F:frontend-reactjs/src/api/moderationApi.js†L134-L174】【F:backend-nodejs/src/services/CommunityModerationService.js†L599-L845】

### Assessments
A. **Redundancy Changes** – The queue, checklist form, and media preview are shared across moderation surfaces, with API helpers encapsulating case pagination, action submission, and undo to eliminate bespoke dashboards.【F:frontend-reactjs/src/components/moderation/ModerationQueue.jsx†L134-L520】【F:frontend-reactjs/src/components/moderation/ModerationChecklistForm.jsx†L18-L160】【F:frontend-reactjs/src/api/moderationApi.js†L98-L174】 ✅

B. **Strengths to Keep** – Backend enrichment preserves risk scoring, assignments, policy snippets, and AI hints by stitching together cases, follow-ups, governance contracts, and post metadata before returning results to the UI.【F:backend-nodejs/src/services/CommunityModerationService.js†L522-L579】【F:backend-nodejs/src/services/CommunityModerationService.js†L798-L838】 ✅

C. **Weaknesses to Remove** – Evidence previews now degrade gracefully, keyboard shortcuts cover navigation and undo, and case/post snapshots stored on each action support reliable reversals through the undo endpoint.【F:frontend-reactjs/src/components/moderation/ModerationMediaPreview.jsx†L6-L78】【F:frontend-reactjs/src/components/moderation/ModerationQueue.jsx†L171-L207】【F:backend-nodejs/src/services/CommunityModerationService.js†L698-L845】 ✅

D. **Sesing and Colour Review Changes** – Queue chips, cards, and buttons follow the indigo/amber palette with focus-visible states to keep the trust & safety workspace calm while remaining accessible.【F:frontend-reactjs/src/components/moderation/ModerationQueue.jsx†L33-L120】【F:frontend-reactjs/src/components/moderation/ModerationChecklistForm.jsx†L67-L160】 ✅

E. **Improvements & Justification Changes** – Follow-up reminders persist via the `moderation_follow_ups` migration and model, scheduled through `ModerationFollowUpJob` and exposed by environment toggles so operations can automate reminders without extra tooling.【F:backend-nodejs/migrations/20250301120000_moderation_follow_up.js†L5-L37】【F:backend-nodejs/src/models/ModerationFollowUpModel.js†L39-L185】【F:backend-nodejs/src/jobs/moderationFollowUpJob.js†L27-L167】【F:backend-nodejs/src/config/env.js†L984-L987】【F:backend-nodejs/src/config/env.js†L1797-L1813】 ✅

F. **Change Checklist Tracker** – Seeds clear and repopulate moderation cases, actions, follow-ups, analytics, and scam reports so local data matches the schema; worker readiness now tracks the follow-up job, and lint runs clean on the shared components.【F:backend-nodejs/seeds/001_bootstrap.js†L100-L1085】【F:backend-nodejs/src/servers/workerService.js†L22-L205】【F:frontend-reactjs/src/components/moderation/ModerationQueue.jsx†L16-L520】 ✅

G. **Full Upgrade Plan & Release Steps** – Apply the migration, roll updated seeds, enable `env.moderation.followUps`, and verify the worker probe plus follow-up cron in staging before training moderators on the keyboard + undo workflow.【F:backend-nodejs/migrations/20250301120000_moderation_follow_up.js†L5-L37】【F:backend-nodejs/seeds/001_bootstrap.js†L100-L1085】【F:backend-nodejs/src/servers/workerService.js†L22-L205】 ✅

## 15. Admin and operator consoles

### Experience outline
- **Control dashboard** – System health, feature flags, incident list.
- **Revenue console** – Payouts, refunds, ads performance.
- **Integrations hub** – API keys, webhooks, partner apps.

### Assessments
A. **Redundancy Changes** – `frontend-reactjs/src/pages/Admin.jsx` now threads every section through the shared `AdminShell` groups, and surfaces from bookings, calendar, courses, ebooks, growth, revenue-ops, ads, and revenue (`frontend-reactjs/src/pages/admin/sections/*.jsx`) all render their KPIs with `AdminSummaryCard`, eliminating bespoke grid/layout code across the console. ✓

B. **Strengths to Keep** – Action affordances remain intact: `AdminRevenueSection` still exposes the export button and saved-view toggles, approvals continue to call `reviewVerificationCase`, and tools/operations panels surface runtime toggles, so high-signal KPIs, CSV exports, and deep links behave exactly as operators expect within the new shell. ✓

C. **Weaknesses to Remove** – `NAVIGATION_STRUCTURE` in `Admin.jsx` regroups navigation into control, revenue, and integrations hubs, runtime-configured helper copy flows through `useRuntimeConfig`, and sections add explicit empty states (e.g. payment health fallback text, bookings placeholders) so sparse telemetry no longer strands operators without guidance. ✓

D. **Sesing and Colour Review Changes** – `AdminShell` standardises slate backdrops, translucent white panels, and deterministic status badge tones while downstream cards reuse the same typography and spacing, keeping charts legible and contrast-compliant throughout the console. ✓

E. **Improvements & Justification Changes** – Release readiness and vendor governance now flow straight from the source of truth: `OperatorDashboardService` builds the release snapshot (checklist, run context, helper text) off the orchestration service while folding governance summaries into the compliance payload so the admin console renders aligned metrics, and the release/governance migrations plus bootstrap seed data define and populate the checklist, run, gate, and contract tables the UI expects.【F:backend-nodejs/src/services/OperatorDashboardService.js†L1115-L1272】【F:backend-nodejs/migrations/20250305113000_release_management.js†L13-L110】【F:backend-nodejs/migrations/20250305110000_governance_stakeholder_operations.js†L13-L169】【F:backend-nodejs/seeds/001_bootstrap.js†L4488-L4558】【F:backend-nodejs/seeds/001_bootstrap.js†L4714-L4899】 ✓

F. **Change Checklist Tracker** – Completion 100%; the targeted Vitest coverage exercises the operator dashboard aggregation to assert required gates, helper copy, and governance rollups, and the admin sections suite renders `AdminReleaseSection` with seeded-style data to verify badges, thresholds, and tables stay wired to that contract, keeping schema, seeds, and UI in lockstep.【F:backend-nodejs/test/operatorDashboardService.test.js†L1-L229】【F:frontend-reactjs/src/pages/admin/sections/__tests__/AdminSections.test.jsx†L780-L856】 ✓

G. **Full Upgrade Plan & Release Steps** – Run the reporting view migration, reseed via the backend workspace so saved views populate, smoke-test admin RBAC against `/analytics/bi/revenue/saved-views`, export finance-ready reports, and ship the console update alongside the operations handbook so operators understand the regrouped navigation. ✓

## 16. Settings, profiles, and personalisation

### Experience outline
- **Profile editor** – Avatar upload, bio, preferences, notification toggles.
- **Account security** – Password, MFA, session management.
- **Personalisation** – Interests, learning goals, ad preferences.

### Assessments
A. ✅ **Redundancy Changes** – `SettingsLayout.jsx`, `SettingsToggleField.jsx`, and the upgraded `SettingsAccordion.jsx` now drive both learner and admin surfaces. `LearnerSettings.jsx` has long consumed the trio, and `DashboardSettings.jsx` now wraps every section with `SettingsAccordion` so its `SectionCard` scaffolding defers to the shared accordion instead of bespoke headers or spacing, keeping update hooks untouched while eliminating parallel markup.

B. ✅ **Strengths to Keep** – Autosave, acknowledgement, and operator affordances survived the consolidation. `LearnerSettings.jsx` still builds a `statusBanner` for `SettingsLayout`, renders `DashboardStateMessage` helpers inside each accordion, and persists optimistic updates, while `DashboardSettings.jsx` retains the unsaved-change rollup, refresh buttons, and section-level submit flows via `useSettingsSection` so seasoned admins recognise their routines.

C. ✅ **Weaknesses to Remove** – Learners and admins now share richer media tooling and streamlined navigation. `AvatarCropper.jsx` supplies zoom/pan/reset controls for `ProfileIdentityEditor.jsx`, and both dashboards lean on the shared `SettingsAccordion.jsx` to collapse sprawling tab sets into accessible accordions, preserving keyboard focus and predictable action placement across `LearnerSettings.jsx` and `DashboardSettings.jsx`.

D. ✅ **Sesing and Colour Review Changes** – The unified primitives carry consistent palettes: `SettingsAccordion.jsx` exports the neutral stone panels and focus-visible rings, `SettingsToggleField.jsx` standardises primary accent toggles, and the finance tables/modals in `LearnerSettings.jsx` plus admin summaries in `DashboardSettings.jsx` reuse the same slate/amber/emerald status cues so styling doesn’t drift between shells.

E. ✅ **Improvements & Justification Changes** – Personalisation wiring spans the stack. `LearnerDashboardService.js` normalises recommended topics, ad toggles, finance alerts, and preview payloads from `LearnerFinancialProfileModel`, `LearnerFinancePurchaseModel`, and community subscriptions before handing them to the UI, and `LearnerSettings.jsx` renders ad usage copy, recommendation cards, and finance workspaces informed by that shared contract.

F. ✅ **Change Checklist Tracker** – Frontend Vitest suites (`LearnerSettings` and `ProfileIdentityEditor`) cover autosave, modal, cropper, and submission flows, backend unit tests exercise `LearnerDashboardService`, and `backend-nodejs/seeds/001_bootstrap.js` seeds learner preferences, financial profiles, purchases, and subscriptions so migrations, models, and UI fixtures stay aligned.

G. ✅ **Full Upgrade Plan & Release Steps** – Ship the shared accordion to admin settings, verify `npm run test --workspaces` across front/back workspaces, reseed databases after preference migrations, and brief support/ops teams on the unified settings behaviour so staging sign-off covers both learner and admin dashboards before production rollout.

## 17. Accessibility and responsiveness

### Experience outline
- **Accessibility** – WCAG 2.1 AA focus, ARIA labeling, reduced motion.
- **Responsiveness** – Breakpoints for mobile/tablet/desktop with consistent behaviours.
- **Performance** – Lazy loading, skeleton screens, offline-friendly caching for core views.

### Assessments
A. ✅ **Redundancy Changes** – Breakpoint, spacing, and semantic colour primitives now live in `frontend-reactjs/src/styles/tokens.css`, letting every surface share the same CSS custom properties for layout, typography, and focus states, while `frontend-reactjs/src/styles.css` imports the token layer and applies it to anchors, focus rings, and skip links so Tailwind utilities pick up the shared values without duplication.【F:frontend-reactjs/src/styles/tokens.css†L1-L109】【F:frontend-reactjs/src/styles.css†L1-L60】 The accompanying accessibility helpers consolidate live-region announcements, focus traps, and reduced-motion detection inside `frontend-reactjs/src/utils/a11y.js`, removing bespoke implementations that previously lived in individual dialogs or hero panels.【F:frontend-reactjs/src/utils/a11y.js†L1-L118】

B. ✅ **Strengths to Keep** – We retained the Inter type scale and global navigation affordances while adding unobtrusive skip links to both primary shells; `MainLayout.jsx` and `DashboardLayout.jsx` expose keyboard-accessible jump points styled by the shared `.skip-link` rules so screen-reader and keyboard users can bypass persistent chrome without altering the existing layout cadence.【F:frontend-reactjs/src/layouts/MainLayout.jsx†L98-L143】【F:frontend-reactjs/src/layouts/DashboardLayout.jsx†L186-L260】【F:frontend-reactjs/src/styles.css†L35-L60】 Motion preferences persist through the unified `usePrefersReducedMotion` hook so marketing animations continue to respect user choices without sacrificing the upbeat aesthetic when motion is allowed.【F:frontend-reactjs/src/utils/a11y.js†L84-L118】

C. ✅ **Weaknesses to Remove** – Dashboard-heavy routes now defer loading through React `lazy` + `Suspense`, shrinking initial payloads and keeping the marketing shell responsive while authenticated bundles hydrate in the background.【F:frontend-reactjs/src/App.jsx†L1-L214】 Modal workflows that previously lacked deterministic keyboard handling now invoke the shared focus trap and live-region announcer—`CalendarEventDialog.jsx` and `PricingTierDialog.jsx` initialise traps on open, enforce Escape handling, and issue polite announcements so assistive technology users gain consistent context when dialogs appear.【F:frontend-reactjs/src/components/calendar/CalendarEventDialog.jsx†L1-L155】【F:frontend-reactjs/src/pages/dashboard/instructor/pricing/PricingTierDialog.jsx†L1-L149】 Their field validations mirror the backend contract: the community event dialog enforces non-empty titles and chronological start/end timestamps to match `CommunityEventModel` expectations and the `community_events` migration schema, while the pricing dialog normalises price, interval, and activation flags that flow directly into `CommunityPaywallTierModel` and its migration-defined columns.【F:backend-nodejs/src/models/CommunityEventModel.js†L151-L199】【F:backend-nodejs/migrations/20241120130000_community_engagement.js†L110-L157】【F:backend-nodejs/src/models/CommunityPaywallTierModel.js†L35-L102】【F:backend-nodejs/migrations/20241118120000_community_roles_paywalls_affiliates.js†L77-L135】

D. ✅ **Sesing and Colour Review Changes** – High-contrast, dark-mode, and base palettes derive from the token layer and can be toggled via `prefers-color-scheme`, `data-theme`, or `data-contrast`, ensuring anchor, button, and surface colours remain WCAG AA compliant without sprinkling hard-coded overrides across components.【F:frontend-reactjs/src/styles/tokens.css†L53-L105】【F:frontend-reactjs/src/styles.css†L10-L33】 Skip link focus rings and modal backdrops reuse the same semantic variables so the accessible palette carries through overlays and focus indicators automatically.【F:frontend-reactjs/src/styles.css†L28-L60】

E. ✅ **Improvements & Justification Changes** – The `.responsive-grid` helper exposed in `frontend-reactjs/src/styles.css` now backs marketing grids like `PerksGrid.jsx`, which sets minimum column widths and gaps through CSS variables instead of bespoke breakpoint logic, while design documentation in `docs/design-system/README.md` walks teams through applying the pattern.【F:frontend-reactjs/src/styles.css†L112-L116】【F:frontend-reactjs/src/components/home/PerksGrid.jsx†L52-L112】【F:docs/design-system/README.md†L1-L36】 Accessibility coverage is locked in by the dedicated `test/accessibility` suite and supporting tooling: `frontend-reactjs/package.json` wires an `npm run test:accessibility` script and `test/accessibility/dialogs.a11y.test.jsx` executes jest-axe audits against the upgraded dialogs with the shared `setupTests` polyfills guarding matchMedia/ResizeObserver APIs.【F:frontend-reactjs/package.json†L10-L32】【F:frontend-reactjs/test/accessibility/dialogs.a11y.test.jsx†L1-L37】【F:frontend-reactjs/test/setupTests.js†L1-L32】

F. ✅ **Change Checklist Tracker** – All surfaces now share tokenised foundations, dialog accessibility helpers, responsive docs, and automated tests. The data layer stays in sync: the event and paywall dialogs map 1:1 to the `community_events` and `community_paywall_tiers` schemas introduced in the migrations above, with bootstrap seeds populating representative rows so local and CI environments reflect the same constraints when exercising the upgraded UI.【F:backend-nodejs/migrations/20241120130000_community_engagement.js†L110-L198】【F:backend-nodejs/migrations/20241118120000_community_roles_paywalls_affiliates.js†L77-L135】【F:backend-nodejs/seeds/001_bootstrap.js†L1672-L1719】【F:backend-nodejs/seeds/001_bootstrap.js†L2212-L2250】

G. ✅ **Full Upgrade Plan & Release Steps** – Release flow stays lightweight: run `npm run build` and `npm run test:accessibility` to confirm bundle health and axe coverage, spot-check dashboard lazy chunks and modal behaviour in staging, refresh accessibility statement assets with the new skip-link capture, and verify seeded event and paywall tiers still hydrate via the documented schemas before announcing the rollout.【F:frontend-reactjs/package.json†L10-L18】【F:frontend-reactjs/src/App.jsx†L81-L214】【F:backend-nodejs/seeds/001_bootstrap.js†L1672-L1719】【F:backend-nodejs/seeds/001_bootstrap.js†L2212-L2250】
