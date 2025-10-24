1. Part 1 — Logic Flows & End-to-End Analysis
      - ✅ 1.A Identity, Sessions & Profile Security (`controllers/AuthController.js`, `controllers/UserController.js`, `controllers/SecurityOperationsController.js`, `controllers/VerificationController.js`, `services/AuthService.js`, `services/TwoFactorService.js`, `services/EmailVerificationService.js`, `services/SessionRegistry.js`, `models/UserModel.js`, `models/UserSessionModel.js`, `models/TwoFactorChallengeModel.js`)
        1. **Appraisal.** The identity surface spans registration through impersonation safeguards, combining `AuthController.js`, `UserController.js`, and verification flows so a single pipeline enforces password, email, and device hygiene across web and mobile entry points.
        2. **Functionality.** Login, refresh, and logout endpoints mint JWT/refresh tokens, enforce throttling, and hydrate sessions through `SessionRegistry.js` while verification APIs call `EmailVerificationService.js` to issue signed URLs with audit trails in `DomainEventModel.js`. SQL migrations (`001_create_users_table.sql`, `007_identity_onboarding_dashboard.sql`) now provision aligned identity, session, and challenge tables so seeds and runtime models share the same structure across environments.
        3. **Logic Usefulness.** `AuthService.js` centralises hashing, session minting, and event emission so higher-level controllers stay declarative, and `SecurityOperationsController.js` gives responders consistent risk context for escalations.
        4. **Redundancies.** Historical duplication between controller responses and `AuthService` sanitisation is resolved by the shared serializer in `services/serializers/userSerializer.js`, keeping profile, dashboard preferences, and session metadata aligned across identity entry points.
        5. **Placeholders or Stubs.** Security posture exports still stub SIEM adapters; when wiring `DomainEventDispatcherService.js`, ensure downstream connectors enforce encryption-at-rest guarantees.
        6. **Duplicate Functions.** The new serializer removes parallel implementations in `UserService.js` and `AuthService.js`; remaining overlaps like legacy `utils/sessionHelpers.js` should be retired once downstream tests migrate.
        7. **Improvements Needed.** Introduce WebAuthn registration, breached password checks, and device binding so high-risk actions can trigger step-up verification via `TwoFactorService.js`.
        8. **Styling Improvements.** Align notification templates invoked by `MailService.js` with colour tokens in `docs/design-system/tokens.md` and ensure verification states mirror the onboarding UI palette.
        9. **Efficiency Analysis.** Cache password and policy lookups plus role aggregations by pushing them through `DistributedRuntimeCache.js`, reducing repeated reads during sign-in bursts.
        10. **Strengths to Keep.** Role-aware two-factor enforcement, domain events for every sensitive transition, and structured throttling keep the security posture observable and auditable.
        11. **Weaknesses to Remove.** Manual toggles for policy enforcement and cookie flag divergence between REST and GraphQL contexts should be normalised through governance-backed settings.
        12. **Styling & Colour Review.** Refresh verification email gradients and inline badges to meet AA contrast ratios while matching web onboarding states.
        13. **CSS, Orientation & Placement.** Provide JSON layout hints for transactional emails so spacing and iconography stay consistent with the React login forms.
        14. **Text Analysis.** Audit password and MFA copy for clarity, reduce redundant warnings, and link to escalation playbooks maintained by support.
        15. **Change Checklist Tracker.** Extend `qa/security-readiness-checklist.md` with MFA expiry, impersonation audit, and serializer regression tests before each release.
        16. **Full Upgrade Plan & Release Steps.** Stage serializer rollout behind flags, canary new auth flows with secondary JWT keys, run penetration tests, coordinate support comms, and monitor analytics for anomalies before full deploy.
      - ✅ 1.B Learner Onboarding, Dashboard & Feedback (`controllers/DashboardController.js`, `controllers/LearnerDashboardController.js`, `controllers/LearnerFeedbackController.js`, `controllers/SetupController.js`, `services/LearnerDashboardService.js`, `services/LearnerProgressService.js`, `services/SetupOrchestratorService.js`, `models/LearnerOnboardingResponseModel.js`, `models/DashboardWidgetModel.js`)
        1. **Appraisal.** Onboarding forms, setup orchestration, and dashboard APIs collaborate to personalise journeys, merge invite flows, and surface telemetry-backed insights for every learner persona.
        2. **Functionality.** `LearnerDashboardController.js` validates complex payloads, invokes `LearnerDashboardService.js` for wallet, finance, and tutoring operations, while `LearnerProgressService.js` aggregates enrolment progress snapshots consumed by dashboards. The shared SQL migration `007_identity_onboarding_dashboard.sql` seeds aligned course, module, lesson, enrollment, and onboarding tables so progress serializers, seeds, and API payloads stay in lockstep across deployments.
        3. **Logic Usefulness.** Services normalise metadata, merge invite ledgers, and emit acknowledgement references so frontend clients and success teams share consistent state.
        4. **Redundancies.** Layout hints now originate from `buildCourseCardLayoutMetadata` inside `LearnerProgressService.js`, removing the need for React and Flutter clients to maintain diverging grid constants.
        5. **Placeholders or Stubs.** Some onboarding tasks still defer to TODO integrations (billing, HRIS); annotate backlog IDs and enforce deterministic responses until connectors arrive.
        6. **Duplicate Functions.** Layout metadata is centralised in `buildDashboardLayoutFromSummaries`, preventing each widget hydrator from reimplementing card sizing and padding rules.
        7. **Improvements Needed.** Layer cohort benchmarking, persona-driven onboarding paths, and partial form persistence to reduce abandonment.
        8. **Styling Improvements.** API responses now include card padding, aspect ratios, and accent colours so downstream clients can map to design tokens without guesswork.
        9. **Efficiency Analysis.** Continue batching progress queries and prefetching upcoming lessons; reuse the new layout metadata to enable memoised rendering on the client side.
        10. **Strengths to Keep.** Strong Joi validation, audit events for onboarding transitions, and explicit acknowledgement references keep operations reliable and observable.
        11. **Weaknesses to Remove.** Manual CSV feedback exports and static widget registries should be replaced with telemetry warehouse syncs and canonical definitions to avoid drift.
        12. **Styling & Colour Review.** Align sentiment and streak badges with `docs/design-system/components/dashboard.md` to guarantee parity across surfaces.
        13. **CSS, Orientation & Placement.** Grid hints returned alongside course summaries specify column spans and breakpoints, ensuring responsive layouts remain consistent on tablets and phones.
        14. **Text Analysis.** Keep onboarding tooltips under 140 characters, remove jargon, and localise critical copy surfaced through `LearnerOnboardingResponseModel.js`.
        15. **Change Checklist Tracker.** Add onboarding smoke tests, dashboard analytics validation, and layout snapshot checks to the release checklist.
        16. **Full Upgrade Plan & Release Steps.** Ship new widgets behind feature flags, seed staging with anonymised telemetry, conduct usability studies, brief CSMs, and roll out once KPI uplifts are validated.
      - 1.C Courses, Catalogue & Creation Studio (`controllers/CourseController.js`, `controllers/CatalogueController.js`, `controllers/ContentController.js`, `controllers/CreationStudioController.js`, `controllers/ExplorerController.js`, `services/CourseAccessService.js`, `services/CreationStudioService.js`, `services/CreationAnalyticsService.js`, `services/CreationRecommendationService.js`, `models/CourseModel.js`, `models/LessonModel.js`, `models/AssessmentModel.js`)
      - 1.D Community, Events & Programming (`controllers/CommunityController.js`, `controllers/CommunityEngagementController.js`, `controllers/CommunityProgrammingController.js`, `controllers/CommunityOperationsController.js`, `controllers/CommunityMonetizationController.js`, `controllers/CommunityMemberAdminController.js`, `controllers/CommunityModerationController.js`, `controllers/CommunityChatController.js`, `services/CommunityService.js`, `services/CommunityEngagementService.js`, `services/CommunityProgrammingService.js`, `services/CommunityModerationService.js`, `services/CommunityDonationLifecycle.js`, `services/CommunityAffiliateCommissionService.js`, `services/CommunityOperationsService.js`, `models/CommunityModel.js`, `models/CommunityEventModel.js`, `models/CommunityMembershipModel.js`)
      - 1.E Feed, Social Graph & Direct Messaging (`controllers/FeedController.js`, `controllers/SocialGraphController.js`, `controllers/DirectMessageController.js`, `services/LiveFeedService.js`, `services/SocialGraphService.js`, `services/DirectMessageService.js`, `services/SavedSearchService.js`, `models/PostModel.js`, `models/FeedItemModel.js`, `models/SocialGraphModel.js`, `models/DirectMessageThreadModel.js`)
      - 1.F Explorer, Search & Discovery (`controllers/ExplorerController.js`, `controllers/CatalogueController.js`, `controllers/BusinessIntelligenceController.js`, `services/ExplorerSearchService.js`, `services/SearchIngestionService.js`, `services/SearchSuggestionService.js`, `services/ExplorerAnalyticsService.js`, `models/SearchQueryModel.js`)
      - 1.G Commerce, Billing & Monetisation (`controllers/PaymentController.js`, `controllers/AdminMonetizationController.js`, `controllers/AdminRevenueManagementController.js`, `controllers/CommunityMonetizationController.js`, `controllers/EscrowController.js`, `services/PaymentService.js`, `services/MonetizationFinanceService.js`, `services/CommunityDonationLifecycle.js`, `services/EscrowService.js`, `jobs/monetizationReconciliationJob.js`, `models/InvoiceModel.js`, `models/SubscriptionModel.js`, `models/CommunityDonationModel.js`)
      - 1.H Ads, Growth & Content Marketing (`controllers/AdsController.js`, `controllers/AdminAdsController.js`, `controllers/BlogController.js`, `controllers/AdminBlogController.js`, `controllers/EbookController.js`, `controllers/AdminGrowthController.js`, `services/AdsService.js`, `services/AdsPlacementService.js`, `services/MarketingContentService.js`, `models/AdsCampaignModel.js`, `models/BlogPostModel.js`, `models/EbookModel.js`)
      - 1.I Analytics, Intelligence & Telemetry (`controllers/AnalyticsController.js`, `controllers/BusinessIntelligenceController.js`, `controllers/ObservabilityController.js`, `controllers/TelemetryController.js`, `services/TelemetryIngestionService.js`, `services/TelemetryWarehouseService.js`, `services/ExplorerAnalyticsService.js`, `jobs/telemetryWarehouseJob.js`, `models/AnalyticsAlertModel.js`, `models/TelemetryExportModel.js`)
      - 1.J Governance, Compliance & Runtime Control (`controllers/GovernanceController.js`, `controllers/ComplianceController.js`, `controllers/RuntimeConfigController.js`, `controllers/AdminFeatureFlagController.js`, `controllers/AdminControlController.js`, `controllers/AdminAuditLogController.js`, `services/FeatureFlagGovernanceService.js`, `services/GovernanceStakeholderService.js`, `services/ComplianceService.js`, `jobs/dataRetentionJob.js`, `jobs/dataPartitionJob.js`, `models/RuntimeConfigModel.js`, `models/AuditEventModel.js`, `models/PlatformSettingModel.js`)
      - 1.K Integrations, Enablement & Environment Parity (`controllers/AdminIntegrationsController.js`, `controllers/EnablementController.js`, `controllers/IntegrationKeyInviteController.js`, `controllers/EnvironmentParityController.js`, `services/IntegrationOrchestratorService.js`, `services/IntegrationProviderService.js`, `services/EnablementContentService.js`, `services/EnvironmentParityService.js`, `services/IntegrationApiKeyService.js`, `models/IntegrationProviderModel.js`, `models/EnablementGuideModel.js`)
      - 1.L Media, Storage & Asset Pipeline (`controllers/MediaUploadController.js`, `services/AssetIngestionService.js`, `services/AssetService.js`, `services/StorageService.js`, `services/AntivirusService.js`, `models/AssetModel.js`, `models/AssetIngestionJobModel.js`, `models/AssetConversionOutputModel.js`)
      - ✅ 1.M Release, Provider Transition & Platform Settings (`controllers/ReleaseManagementController.js`, `controllers/ProviderTransitionController.js`, `controllers/AdminSettingsController.js`, `services/ReleaseOrchestrationService.js`, `services/ProviderTransitionService.js`, `services/PlatformSettingsService.js`, `models/ReleaseChecklistModel.js`, `models/ProviderTransitionModel.js`, `models/PlatformSettingModel.js`)
      - ✅ 1.N GraphQL Gateway & HTTP Bootstrapping (`graphql/schema.js`, `graphql/router.js`, `server.js`, `servers/websocket.server.js`, `bootstrap/`, `app.js`)
      - ✅ 1.O Repositories, Data Access & Domain Events (`repositories/`, `services/DomainEventDispatcherService.js`, `services/ChangeDataCaptureService.js`, `models/DomainEventModel.js`, `models/JobStateModel.js`)
      - 2.A Marketing, Storytelling & Acquisition (`src/pages/Home.jsx`, `src/pages/About.jsx`, `src/pages/Blog.jsx`, `src/pages/BlogPost.jsx`, `src/pages/Ebooks.jsx`, `src/pages/Terms.jsx`, `src/pages/Privacy.jsx`, `src/components/marketing/`, `src/data/marketing/`)
      - 2.B Authentication, Registration & Setup (`src/pages/Login.jsx`, `src/pages/Register.jsx`, `src/pages/InstructorRegister.jsx`, `src/pages/Setup.jsx`, `src/features/auth/`, `src/components/forms/`)
      - 2.C Learner Dashboard & Insights (`src/pages/dashboard/index.jsx`, `src/pages/dashboard/widgets/*`, `src/components/dashboard/`, `src/hooks/useLearnerDashboard.js`)
      - 2.D Courses, Library & Live Sessions (`src/pages/Courses.jsx`, `src/pages/ContentLibrary.jsx`, `src/pages/LiveClassrooms.jsx`, `src/components/learning/`, `src/components/video/`, `src/hooks/useCoursePlayer.js`)
      - 2.E Community, Events & Messaging (`src/pages/Communities.jsx`, `src/pages/Feed.jsx`, `src/components/community/`, `src/components/chat/`, `src/hooks/useCommunityRealtime.js`)
      - 2.F Analytics, Admin & Operations Dashboards (`src/pages/Analytics.jsx`, `src/pages/admin/index.jsx`, `src/pages/admin/sections/*`, `src/components/admin/`, `src/hooks/useAdminAnalytics.js`)
      - 2.G Commerce, Billing & Profile Management (`src/pages/Profile.jsx`, `src/pages/TutorProfile.jsx`, `src/components/billing/`, `src/hooks/useBillingPortal.js`)
      - 2.H Integrations, Enablement & Invitations (`src/pages/IntegrationCredentialInvite.jsx`, `src/components/integrations/`, `src/hooks/useIntegrationInvite.js`)
      - 2.I Support, Knowledge & Feedback (`src/features/support/`, `src/components/support/`, `src/pages/support/*`, `src/hooks/useSupportLauncher.js`)
      - 2.J Shared Layout, Theming & Component Infrastructure (`src/App.jsx`, `src/layouts/`, `src/styles/`, `src/components/common/`, `src/providers/ThemeProvider.jsx`)
      - 3.A Authentication & Identity Management (`lib/features/auth/`, `lib/services/authentication_service.dart`, `lib/services/secure_storage_service.dart`)
      - 3.B Community Feed & Engagement (`lib/features/feed/`, `lib/features/community_spaces/`, `lib/services/feed_service.dart`, `lib/services/community_service.dart`)
      - ✓ 3.C Lessons, Assessments & Offline Learning (`Edulure-Flutter/lib/services/offline_learning_service.dart`, `Edulure-Flutter/lib/services/content_service.dart`, `Edulure-Flutter/lib/provider/learning/learning_store.dart`, `Edulure-Flutter/lib/screens/content_library_screen.dart`, `Edulure-Flutter/lib/screens/assessments_screen.dart`)
        1. **Appraisal.** `OfflineLearningService` now centralises download progress, assessment queues, and module snapshots, driving `LearningProgressController` so lessons, assessments, and analytics share one state engine.
        2. **Functionality.** `ContentService.downloadAsset` streams progress updates into the offline service, shows live progress in `ContentLibraryScreen`, throttles analytics, and `AssessmentsScreen` introduces an offline submission card with queue visibility, sync controls, and form capture.
        3. **Logic Usefulness.** Stream broadcasts from the offline service update UI, Hive, and analytics simultaneously, while controller-driven progress updates guarantee consistency across modules, logs, and cached snapshots.
        4. **Redundancies.** Manual progress writes in screens/controllers were replaced by `LearningProgressController`, eliminating duplicate persistence logic and aligning with Hive hydration.
        5. **Integration Depth.** Assessment sync now hits `/mobile/learning/downloads|assessments|modules/snapshots` with Dio, updating Hive after the API acknowledges state changes so Annex B6 data stays consistent across devices and seeded tables.
        6. **Duplicate Functions.** Download state, analytics throttling, and progress snapshots moved out of widgets into `OfflineLearningService`, removing bespoke Hive writes and timers.
        7. **Improvements Needed.** Expand retry UX for failed downloads, surface rubric asset metadata once exposed by the API, and add background throttling so remote refreshes don’t overwhelm `/mobile/learning/offline`.
        8. **Styling.** Offline banners, progress bars, and failure panels reuse instructor tokens, hit contrast requirements, and offer responsive padding for phones/tablets.
        9. **Efficiency.** Progress callbacks are throttled (350 ms), analytics pings rate-limited, and Hive lookups cached so queue updates don’t spam disk or logs.
        10. **Strengths to Keep.** Automatic module snapshotting, shared analytics hooks, and transparent queue summaries keep offline flows observable and reliable.
        11. **Weaknesses to Remove.** Rubric messaging still references TODOs; replace with live rubric review once backend manifests land.
        12. **Colour Review.** Ensure orange (rubric), red (failure), and blue-grey (queued) states pass AA contrast and match Annex B6 palette guidance.
        13. **Layout.** Offline status components respect safe areas, wrap gracefully, and avoid layout jumps as queue sizes change across orientations.
        14. **Text.** Copy keeps instructions under 110 characters, explains next steps (“stay online”, “retry once connected”), and avoids jargon.
        15. **Checklist.** QA must validate Hive hydration, throttled analytics, offline submission capture, and module snapshot replication across devices.
        16. **Release Plan.** Ship behind a feature flag, run migration `20250402120000_mobile_offline_learning.js`, seed Annex data, rehearse `/mobile/learning/*` sync flows in staging, update Annex A28/B6 docs, and monitor queue failure telemetry post-launch.
      - ✓ 3.D Instructor Quick Actions & Operations (`Edulure-Flutter/lib/services/instructor_operations_service.dart`, `Edulure-Flutter/lib/screens/instructor_dashboard_screen.dart`, `Edulure-Flutter/lib/services/session_manager.dart`)
        1. **Appraisal.** `InstructorOperationsService` delivers a Hive-backed queue powering new quick actions in `InstructorDashboardScreen`, aligning Annex A29/C4 with offline-friendly operations.
        2. **Functionality.** Contextual sheets capture announcements, attendance, grading, schedule changes, and notes, persist them to `instructor_action_queue`, and attempt immediate sync while the queue card surfaces status, counts, and manual sync.
        3. **Logic Usefulness.** Queue streams keep the dashboard reactive while Dio-backed POST/PATCH/DELETE calls mirror queue→processing→completed/failed transitions against `/mobile/instructor/actions`, keeping Hive and the API aligned.
        4. **Redundancies.** Quick action config, Hive access, and button definitions are centralised—no more duplicated payload assembly across widgets.
        5. **Integration Depth.** Remote sync now relies on the mobile instructor endpoints, propagating backend validation errors into Hive so instructors can retry or amend payloads without losing offline capture.
        6. **Duplicate Functions.** Icons and labels stem from a single `_actions` list, preventing divergence between buttons, notifications, and future surfaces.
        7. **Improvements Needed.** Add retry controls for failed actions, persist audit metadata, and emit telemetry for instructor action throughput.
        8. **Styling.** Buttons reuse tonal/filled variants, queue cards follow dashboard spacing tokens, and status colours map to accessible palette guidance.
        9. **Efficiency.** Queue hydration reuses cached Hive boxes and stream updates, avoiding redundant reads while keeping UI instant.
        10. **Strengths to Keep.** Offline capture, transparent queue states, and modular service architecture keep instructor workflows resilient and testable.
        11. **Weaknesses to Remove.** Feedback currently relies on snackbars—introduce persistent logs or history once backend sync ships.
        12. **Colour Review.** Ensure amber “processing” badges and red failure chips meet AA contrast and align with instructor palette tokens.
        13. **Layout.** Quick action wraps remain responsive, queue cards stretch full width, and padding respects the dashboard’s 8px rhythm.
        14. **Text.** Labels stay under 30 characters, statuses use plain language (“Queued”, “Synced”), and snackbar copy summarises outcome clearly.
        15. **Checklist.** Regression tests should cover queue hydration, sync success/failure paths, stream disposal, and instructor banner visibility.
        16. **Release Plan.** Gate behind feature flags, ensure migrations/seeds have run, validate `/mobile/instructor/actions` flows in staging, add telemetry dashboards, brief enablement teams, and launch once sync reliability meets Annex targets.
      - ✅ 3.E Billing & Subscription Management (`lib/integrations/billing.dart`, `lib/features/billing/`, `lib/services/billing_service.dart`)
      - ✅ 3.F Notifications, Messaging & Support (`lib/features/notifications/`, `lib/features/support/`, `lib/services/push_service.dart`, `lib/services/inbox_service.dart`)
      - ✓ 4.A Community Reminder Job (`communityReminderJob.js`)
      - ✓ 4.B Data Partition Job (`dataPartitionJob.js`)
      - 4.C Data Retention Job (`dataRetentionJob.js`)
      - 4.D Moderation Follow-Up Job (`moderationFollowUpJob.js`)
      - ✓ 4.E Monetization Reconciliation Job (`monetizationReconciliationJob.js`)
        1. **Appraisal.** The reconciliation worker now orchestrates tenant windows end-to-end, wrapping multi-currency ledger comparisons, automatic revenue recognition, and failure recovery so finance can rely on a single scheduled pipeline instead of ad-hoc scripts. 
        2. **Functionality.** `runCycle` invokes `MonetizationFinanceService.runReconciliation` alongside the new `#buildCurrencyBreakdown` helper, then records background job metrics, updates variance history, and cascades alerts through `MonetizationAlertNotificationService` when repeated failures occur. 
        3. **Logic Usefulness.** Each reconciliation now returns `metadata.currencyBreakdown` showing invoiced, recognised, usage, deferred, variance, and basis-point deltas per ISO currency, giving auditors immediate cross-ledger visibility. 
        4. **Redundancies.** Aggregated job metrics via `recordBackgroundJobRun` and shared variance-history updates eliminate the bespoke logging loops previously sprinkled across finance scripts. 
        5. **Placeholders or Stubs.** Currency breakdown currently omits manual journal overrides; extend the helper to ingest adjustment tables before exposing the digest in executive dashboards. 
        6. **Duplicate Functions.** Historical variance tracking consolidates in `MonetizationReconciliationRunModel.updateMetadata`, removing the need for downstream services to maintain their own reconciliation timelines. 
        7. **Improvements Needed.** Add regression coverage for the tenant pause/resume state machine and wire acknowledgement digests into notification payloads so finance can see who triaged the variance. 
        8. **Styling & Logging.** Summary logs now emit `outcome`, `alerts`, window bounds, and tenant counts in a single structured payload, ensuring on-call responders can pivot from Splunk straight into reconciliation metadata. 
        9. **Efficiency Analysis.** Currency aggregation reuses grouped SQL queries across payments, usage, and revenue schedules, while hrtime-based duration tracking feeds Prometheus so slow tenants are surfaced automatically. 
        10. **Strengths to Keep.** Tenant caching, failure backoff, and the finance service’s notification heuristics continue to guard against duplicate sends while adding richer telemetry. 
        11. **Weaknesses to Remove.** Idle tenants still inherit the global recognition window; expose per-tenant overrides once policy storage lands in `PlatformSettingModel`. 
        12. **Telemetry & Alerts.** Failure digests hash trigger, window, and tenant IDs before dispatching high-severity alerts, giving compliance a deterministic breadcrumb trail without leaking sensitive balances. 
        13. **Layout & Metadata.** `varianceHistory` snapshots append the latest variance, severity, acknowledgement count, and truncated currency breakdown, keeping the run record audit-ready. 
        14. **Text & Copy.** Warning logs surface alert severities with actionable copy (“finance alerts”, “paused after repeated failures”), matching the runbook vocabulary in `docs/operations/finance`. 
        15. **Change Checklist Tracker.** Reconciliation releases now require validating Prometheus counters, reviewing `varianceHistory` growth, inspecting alert digests, and confirming paused tenants resume after cooldown. 
        16. **Full Upgrade Plan & Release Steps.** Stage the job with read-only finance review, backfill currency metadata, verify alert delivery in staging, then promote with metrics dashboards and audit acknowledgement walkthroughs. 
      - ✓ 4.F Telemetry Warehouse Job (`telemetryWarehouseJob.js`)
        1. **Appraisal.** The telemetry exporter now encrypts checkpoints, reports backlog pressure, and self-schedules additional flushes so warehouse sinks stay in lockstep with ingestion. 
        2. **Functionality.** `exportPendingEvents` fetches `batchSize + 1` events to detect backlog, compresses payloads, uploads to storage, then seals a checkpoint digest through `DataEncryptionService`. 
        3. **Logic Usefulness.** Summaries include `batchSize`, `hasBacklog`, and a checkpoint preview (last event id/timestamp) so downstream jobs and dashboards can reconcile cursor position without decrypting. 
        4. **Redundancies.** Shared `buildCheckpointDescriptor` removes the brittle JSON snippets formerly scattered across freshness monitors and batch metadata. 
        5. **Placeholders or Stubs.** Backlog detection currently reports “>= batchSize” precision; extend the event model with a lightweight count endpoint before exposing remaining record estimates. 
        6. **Duplicate Functions.** Metrics instrumentation now flows through `recordBackgroundJobRun`, aligning telemetry exports with other queue workers and avoiding bespoke success/failure counters. 
        7. **Improvements Needed.** Layer smoke tests that decrypt checkpoints in CI and assert checksum alignment to catch key-rotation mishaps early. 
        8. **Styling & Logging.** Cycle logs annotate duration, outcome, backlog state, and exported count, mirroring the observability copy used in Annex 12.F so runbooks stay coherent. 
        9. **Efficiency Analysis.** The backpressure scheduler reuses hrtime duration, configurable delay, and capped retry cycles to drain spikes without overwhelming storage or lineage processors. 
        10. **Strengths to Keep.** Compression, lineage auto-recording, freshness checkpoints, and hashed metadata continue to provide durability while integrating securely with the new sealed cursor state. 
        11. **Weaknesses to Remove.** CLI triggers still rely on default delays; expose per-trigger overrides so incident responders can accelerate backlog recovery without editing code. 
        12. **Telemetry & Alerts.** Freshness monitors now store encrypted checkpoint metadata alongside hasBacklog flags, keeping observability dashboards authoritative without leaking raw cursor data. 
        13. **Layout & Metadata.** Batch metadata and summary payloads share the same checkpoint/preview shape, ensuring the warehouse UI, API, and runbooks read identical structures. 
        14. **Text & Copy.** Warning messages (“Telemetry export job paused after repeated failures”, “Scheduled additional telemetry export to drain backlog”) map directly onto ops scripts for clarity. 
        15. **Change Checklist Tracker.** Each release should validate S3 checksum metadata, decrypt sample checkpoints, confirm background job metrics, and review backlog flush logs in staging. 
        16. **Full Upgrade Plan & Release Steps.** Roll out encryption keys, canary the backpressure loop, verify Prometheus counters and freshness dashboards, then brief analytics teams before enabling in production. 
      - ✓ 5.A Identity & Access Schema (`models/UserModel.js`, `models/UserSessionModel.js`, `models/TwoFactorChallengeModel.js`, `models/UserRoleAssignmentModel.js`, `migrations/*user*`)
        1. **Appraisal.** Migration `20250415120000_user_role_assignments.js` introduces `user_role_assignments` with referential integrity, indexes, and update triggers so role governance leaves ad-hoc columns for an auditable table.
        2. **Functionality.** `AuthService.register`, `login`, and `refreshSession` now hydrate assignments through `serializeUserWithAuthorizations` and embed deduped `roles` arrays into JWT payloads while exposing `roleAssignments` in serialized users (`backend-nodejs/src/services/AuthService.js`), and bootstrap seeds reuse `UserRoleAssignmentModel.assign` so fixture identities populate `user_role_assignments` alongside runtime flows.
        3. **Logic Usefulness.** Consumers can interrogate `UserRoleAssignmentModel.listActiveByUser` plus the enriched serializer to drive access reviews, impersonation audits, and UI matrices without custom joins.
        4. **Redundancies.** `normaliseRoleIdentifier`, `buildRoleList`, and serializer helpers consolidate role string handling, eliminating bespoke trimming logic previously scattered across auth flows.
        5. **Placeholders.** `UserRoleAssignmentModel.pruneExpired` is ready for automation but lacks a scheduled job; wire it to background workers so expired assignments close automatically.
        6. **Duplicate Functions.** Assignment creation/upsert logic now lives solely inside `UserRoleAssignmentModel.assign`, replacing repeated role persistence paths across services.
        7. **Improvements Needed.** Build admin APIs/UI to manage assignments, enforce tenant scopes, and mirror changes back into `users.role` until that legacy column can be deprecated.
        8. **Styling Improvements.** Update Annex identity ERDs and handbook callouts with the new assignment table, using accessible palette accents to distinguish scoped vs global roles.
        9. **Efficiency Analysis.** Unique `(user_id, role_key, scope_type, scope_id, revoked_at)` constraint with supporting indexes plus assign upserts prevent duplicates, while JWT role lists reuse cached deduped arrays.
        10. **Strengths to Keep.** Session hashing, two-factor enforcement, and audit events remain untouched while responses/tokens now deliver richer role context for downstream systems.
        11. **Weaknesses to Remove.** Legacy `users.role` can drift from assignments; consider triggers or validation during updates until full migration is complete.
        12. **Styling & Colour Review.** Align identity documentation chips/badges referencing assignments with compliance palette tokens described in Annex A38.
        13. **CSS, Orientation & Placement.** Plan admin matrices showing scope, expiry, metadata, and actor columns based on the serializer’s `roleAssignments` structure.
        14. **Text Analysis.** Refresh onboarding/tooltips to mention aggregated `roles` and assignment provenance so support teams interpret payloads accurately.
        15. **Change Checklist Tracker.** Apply migration `20250415120000_user_role_assignments.js`, backfill roles, confirm JWT `roles` claims via smoke tests, reseed to validate `user_role_assignments` fixtures, and verify serializer output across auth endpoints.
        16. **Full Upgrade Plan & Release Steps.** Migrate, reseed identity fixtures, deploy backend, update docs, and rehearse login/refresh flows to verify assignment metadata before enabling in production.
      - ✓ 5.B Learning Content Schema (`models/CourseModel.js`, `models/LessonModel.js`, `models/ModuleModel.js`, `models/AssessmentModel.js`, `models/CertificateModel.js`, `migrations/*course*`)
        1. **Appraisal.** Migration `20250415121000_course_version_snapshots.js` adds `course_version_snapshots` plus module/lesson `version` columns, giving the content schema a persistent history layer.
        2. **Functionality.** `CourseModel.create` now records an initial snapshot and `updateById` captures diffs/summary entries through `CourseVersionSnapshotModel.recordChange`, providing end-to-end change tracking (`backend-nodejs/src/models/CourseModel.js`), with `backend-nodejs/seeds/001_bootstrap.js` calling `CourseVersionSnapshotModel.recordInitial` so seeded courses materialise history rows immediately.
        3. **Logic Usefulness.** Snapshot JSON (`previous`/`next`) and the stored `changes` array equip analytics, editorial audits, and rollback tooling without bespoke export scripts.
        4. **Redundancies.** Diffing and serialisation live entirely in `CourseVersionSnapshotModel`, replacing the repeated JSON comparison helpers that once lived in services/controllers.
        5. **Placeholders.** Actor attribution currently defaults to instructors/admins; integrate workflow context so collaborative edits capture the responsible user once multi-editor tooling ships.
        6. **Duplicate Functions.** Snapshot computation centralises stable stringify/diff logic, eliminating per-feature implementations of course history capture.
        7. **Improvements Needed.** Increment module/lesson `version` fields from orchestrators, expose history endpoints, and visualise summaries inside admin/course authoring UIs.
        8. **Styling Improvements.** Update ERDs and curriculum docs with the new snapshot table, employing accessible colours to call out history flows per Annex A39 guidance.
        9. **Efficiency Analysis.** Unique `(course_id, version)` constraint and recorded-at indexes keep snapshot queries quick; JSON diffing runs once per update and reuses stable serialisation helpers.
        10. **Strengths to Keep.** Existing catalogue helpers, metadata serialisers, and course relationships remain intact while history capture happens transparently at model level.
        11. **Weaknesses to Remove.** Snapshot payloads store full course JSON; consider compression/archival for large metadata blobs before release data balloons.
        12. **Styling & Colour Review.** Document how version timelines (timestamps, summaries) should inherit the established dashboard palette so UI surfaces stay consistent.
        13. **CSS, Orientation & Placement.** Provide layout guidance for diff cards/timelines (field labels, before/after chips) using `changes` output so admin panels render history coherently.
        14. **Text Analysis.** Ensure release notes and authoring copy mention automatic snapshotting and explain how the change summary headlines map to tracked fields.
        15. **Change Checklist Tracker.** Run migration `20250415121000_course_version_snapshots.js`, verify snapshot rows on course create/update, reseed to confirm `course_version_snapshots` entries land for fixtures, and confirm module/lesson version defaults seeded to `1`.
        16. **Full Upgrade Plan & Release Steps.** Migrate, reseed sample courses, rehearse editing flows to inspect snapshots, update SDK/docs, and deploy alongside UI consumers of the new history APIs.
      - 5.C Community, Social & Messaging Schema (`models/CommunityModel.js`, `models/CommunityEventModel.js`, `models/PostModel.js`, `models/ReactionModel.js`, `models/DirectMessageThreadModel.js`, `models/SocialGraphModel.js`, `migrations/*community*`, `migrations/*social*`)
      - 5.D Commerce & Finance Schema (`models/InvoiceModel.js`, `models/SubscriptionModel.js`, `models/PaymentAttemptModel.js`, `models/EscrowPayoutModel.js`, `models/CommunityDonationModel.js`, `migrations/*billing*`, `migrations/*finance*`)
- ✓ 5.E Analytics, Governance & Observability Schema (`models/AnalyticsAlertModel.js`, `models/TelemetryExportModel.js`, `models/RuntimeConfigModel.js`, `models/AuditEventModel.js`, `models/PlatformSettingModel.js`, `migrations/*analytics*`, `migrations/*governance*`)
      - ✓ 5.F Marketing, Content & Enablement Schema (`models/BlogPostModel.js`, `models/BlogCategoryModel.js`, `models/EbookModel.js`, `models/AdsCampaignModel.js`, `models/EnablementGuideModel.js`, `models/IntegrationProviderModel.js`, `migrations/*marketing*`, `migrations/*integration*`)
- ✓ 6.A Generated API Client & Runtime Configuration (`src/generated/`, `src/index.ts`, `src/runtime/configure.ts`, `src/runtime/base.ts`)
         1. **Appraisal.** `configureSdk` now orchestrates manifest metadata, normalised base URLs, and optional session initialisation so SDK consumers receive a fully prepared `OpenAPI` instance plus access to the created `SessionManager` when requested. 
         2. **Functionality.** `ConfigureSdkOptions.auth` introduces bearer and non-bearer header strategies, auto-refresh toggles, custom header names, and lifecycle callbacks while `mergeHeaderProducers` and `normaliseHeaders` compose static + dynamic headers alongside user-agent injection. 
         3. **Logic Usefulness.** Asynchronous token and header resolvers collapse into a single pipeline that sanitises values, enforces `allowAnonymous` guards, and throws actionable errors when tokens are required but missing, preventing silent authentication drift. 
         4. **Redundancies.** Header formatting, manifest wiring, and user-agent fallbacks now live in `runtime/base.ts` + `configure.ts`, eliminating bespoke string coercion and ad-hoc header merges previously repeated across projects. 
         5. **Instrumentation Hooks.** Runtime configuration now surfaces `ConfigureSdkOptions.hooks` so clients can register before/after/onError callbacks for tracing and metrics, while TODO coverage remains for optional custom `fetch` adapters and retry orchestration.
         6. **Duplicate Functions.** Shared helpers (`formatAuthorizationHeader`, `normaliseHeaders`, `mergeHeaderProducers`) replace local string concatenation or manual loops, ensuring downstream services reuse the same casing and merge semantics. 
         7. **Telemetry & Error Mapping.** `configureSdk` accepts structured request hooks and propagates `errorDomain` into augmented `ApiError` instances, giving adopters native tracing/logging integration points without wrapping generated clients.
         8. **Styling Improvements.** Update README and portal snippets so option names (`auth.headerName`, `auth.autoRefresh`) mirror the runtime casing and ensure example headers demonstrate the normalised title-case output. 
         9. **Efficiency Analysis.** Memo-free async resolvers execute exactly once per request, header sanitisation short-circuits undefined values, and session refreshes are skipped unless required, avoiding redundant auth calls. 
         10. **Strengths to Keep.** Automatic manifest hydration, user-agent injection, credential propagation, and tree-shakeable service registry exports remain intact while layering richer runtime control. 
         11. **Diagnostics.** Missing-token paths now raise `MissingAccessTokenError`/`SdkAuthError` instances with `sdkDomain` metadata instead of generic errors, accelerating integrator debugging while keeping legacy anonymous flows untouched.
         12. **Styling & Colour Review.** Ensure documentation and dev portals describe the normalised header casing (`Authorization`, `User-Agent`) so branding and accessibility palettes stay consistent with Annex typography guidance. 
         13. **CSS, Orientation & Placement Changes.** Preserve the module entry structure (`runtime/configure`, `runtime/base`, `runtime/client`) so bundlers continue to tree-shake correctly while documenting the new exports in SDK navigation menus. 
         14. **Text Analysis, Text Placement, Text Length, Text Redundancy & Quality.** Revise runtime error copy to remain concise (“Access token is required...”), avoid duplicated phrasing across docs, and highlight optional parameters in under 140 characters for quick scanning. 
         15. **Change Checklist Tracker.** Validate header composition with and without custom schemes, confirm session hand-off via `createSdkClient`, rerun `npm --prefix sdk-typescript run check`, and verify the `sdk.typescript.*` configuration entries are seeded before publishing Annex A44 release notes.
         16. **Full Upgrade Plan & Release Steps.** Ship alongside updated docs, coordinate consumer migrations to the new `auth` object, exercise staging smoke tests for anonymous + authenticated flows, then tag the SDK once telemetry and CI regressions stay green. 
      - ✓ 6.B Authentication & Session Utilities (`src/runtime/auth.ts`, `src/runtime/tokenStore.ts`, `src/runtime/configure.ts`)
         1. **Appraisal.** `createTokenStore`, `createSessionManager`, and `createAuthorizationHeaderResolver` deliver a cohesive toolkit for managing access/refresh lifecycles, storage hydration, and header injection across environments. 
         2. **Functionality.** Token stores hydrate from memory or browser storage, session managers guard refresh concurrency, emit lifecycle callbacks, and expose helpers for manual refresh, while auth resolvers format headers with configurable schemes and refresh behaviour. 
         3. **Logic Usefulness.** `normaliseTokenSet`, `ensureFreshToken`, and `isExpired` harmonise timestamp handling (expiresAt/expiresIn) so refresh logic stays deterministic, and warning hooks (`onRefreshError`) surface actionable context. 
         4. **Redundancies.** Session persistence, listener management, and header formatting move into shared utilities, replacing app-specific memory caches or duplicated bearer concatenation across repositories. 
         5. **Placeholders or Stubs.** Browser storage adapters currently rely on plaintext JSON; plan encrypted or platform-specific adapters (e.g., React Native secure storage) before enabling Annex A45 production toggles. 
         6. **Duplicate Functions.** `formatAuthorizationHeader` underpins both runtime configuration and standalone header builders, preventing divergent casing or spacing logic when multiple packages generate tokens. 
         7. **Refresh Coordination.** Session managers now expose background refresh scheduling plus auto-start controls, and browser token stores listen for storage events to synchronise tokens across tabs; metrics hooks remain on the roadmap for Annex telemetry parity.
         8. **Styling Improvements.** Document sample usage with lint-compliant formatting and align code snippets in docs/portals to the TypeScript conventions enforced by the SDK (`async/await`, explicit return types). 
         9. **Efficiency Analysis.** Hydration defers storage reads to a single promise, listeners receive debounced updates, refreshes are deduped via shared promises, and optional `autoHydrate` skips unnecessary work for server contexts. 
         10. **Strengths to Keep.** Event callbacks, explicit clear/update helpers, optional refresh hooks, and modular storage adapters preserve flexibility while standardising session semantics. 
         11. **Weaknesses to Remove.** Token payloads still persist as plaintext JSON; follow-up work will introduce encrypted storage adapters and optional metrics hooks now that multi-tab synchronisation is handled centrally.
         12. **Styling & Colour Review.** Align console warnings/errors with existing observability tone (succinct, action-oriented) and mirror Annex A45 guidance for how logging surfaces should appear in developer tooling. 
         13. **CSS, Orientation & Placement Changes.** Keep module boundaries (`runtime/auth`, `runtime/tokenStore`) stable so bundler entry points remain predictable, and outline folder placement in SDK docs for quick discovery. 
         14. **Text Analysis, Text Placement, Text Length, Text Redundancy & Quality.** Ensure error strings (“Access token is required...”, storage warning copy) remain precise, avoid repeated jargon, and clarify when tokens are cleared versus refreshed. 
         15. **Change Checklist Tracker.** Exercise token store persistence, concurrent refresh guards, cross-tab synchronisation, header resolver outputs, and SDK build checks before tagging releases aligned with Annex A45.
         16. **Full Upgrade Plan & Release Steps.** Roll out by updating consumer apps to use the shared session manager, validate storage adapters per platform, coordinate Annex documentation refresh, and publish the SDK once integration smoke tests pass. 
      - 7.A Environment Provisioning & Infrastructure as Code (`infrastructure/terraform/`, `docker-compose.yml`, `infrastructure/environments/`)
      - 7.B CI/CD Automation & Release Tooling (`scripts/`, `backend-nodejs/scripts/`, `update_template/`, `qa/`)
      - 7.C Observability Stack & Runtime Telemetry (`infrastructure/observability/`, `backend-nodejs/src/observability/`, `docs/operations/observability.md`)
      - 7.D Local Tooling & Developer Enablement (`file_list.md`, `EDULURE_GUIDE.md`, `backend-nodejs/README.md`, `frontend-reactjs/README.md`, `valuation/`, `scripts/setup-*`)
      - 8.A Automated Test Suites & Coverage
      - 8.B Manual QA & Release Governance (`qa/`, `update_template/`, `docs/operations/qa.md`)
      - 8.C Test Data, Fixtures & Sandboxes (`backend-nodejs/seeds/`, `frontend-reactjs/src/testUtils/`, `Edulure-Flutter/test/fixtures/`)
      - 9.A Product & Technical Guides (`EDULURE_GUIDE.md`, `README.md`, `user experience.md`, `docs/design-system/`)
      - 9.B Operational Playbooks & Incident Response (`docs/operations/`, `qa/operations/`, `scripts/incident-*`)
      - 9.C Design System Assets & UX Research (`docs/design-system/`, `user experience.md`, `frontend-reactjs/src/styles/`, `Edulure-Flutter/lib/theme/`)
      - 9.D Strategy, Valuation & Stakeholder Communication (`valuation/`, `docs/operations/strategy.md`, `user experience.md`)
   - Annex A: Expanded Analysis Narratives
      - ✅ A1. Identity, Sessions & Profile Security (1.A)
        *See Part 1.A for the 16-point breakdown covering auth flows, shared serializers, and release governance updates.*
      - ✅ A2. Learner Onboarding, Dashboard & Feedback (1.B)
        *See Part 1.B for the end-to-end dashboard narrative including layout metadata exports and onboarding orchestration.*
      - A3. Courses, Catalogue & Creation Studio (1.C) ✓
        *`CourseModel.getCatalogueFilters`, `/catalogue/filters`, new catalogue filter indexes, and enriched seeds/tests keep catalogue facets, layout metadata, and upsell badges aligned across clients.*
      - A4. Community, Events & Programming (1.D) ✓
        *`CommunityService.mergeEvents` + `decorateEventForDisplay` now drive programming priority, accent mapping, and layout hints with refreshed community seeds.*
      - [x] A5. Feed, Social Graph & Direct Messaging (1.E)
      - [x] A6. Explorer, Search & Discovery (1.F)
      - A7. Commerce, Billing & Monetisation (1.G)
      - A8. Ads, Growth & Content Marketing (1.H)
      - ✅ A9. Analytics, Intelligence & Telemetry (1.I)
      - ✅ A10. Governance, Compliance & Runtime Control (1.J)
      - A11. Integrations, Enablement & Environment Parity (1.K) ✓
      - A12. Media, Storage & Asset Pipeline (1.L) ✓
      - ✅ A13. Release, Provider Transition & Platform Settings (1.M)
      - ✅ A14. GraphQL Gateway & HTTP Bootstrapping (1.N)
      - ✅ A15. Repositories, Data Access & Domain Events (1.O)
      - ✓ A16. Marketing, Storytelling & Acquisition (2.A)
      - ✓ A17. Authentication, Registration & Setup (2.B)
      - A18. Learner Dashboard & Insights (2.C)
      - A19. Courses, Library & Live Sessions (2.D)
      - A20. Community, Events & Messaging (2.E)
      - A21. Analytics, Admin & Operations Dashboards (2.F)
      - A22. Commerce, Billing & Profile Management (2.G) ✓
      - A23. Integrations, Enablement & Invitations (2.H) ✓
      - A24. Support, Knowledge & Feedback (2.I)
      - A25. Shared Layout, Theming & Component Infrastructure (2.J)
      - A26. Flutter Authentication & Identity (3.A)
      - A27. Flutter Community Feed & Engagement (3.B)
      - ✓ A28. Flutter Lessons, Assessments & Offline Learning (3.C)
         - A28.1 Edulure-Flutter/lib/services/offline_learning_service.dart
            1. **Singleton coordination.** Factory constructors reuse a shared instance unless custom Hive boxes are injected, guaranteeing all download, assessment, and progress flows operate on a unified cache backed by `SessionManager.learningDownloadQueue`, `assessmentOutbox`, and `learningProgressSnapshots`.
            2. **Deterministic queue keys.** `_downloadKey`, `_assessmentKey`, and `_progressKey` normalise identifiers per asset/module so repeated requests update a single record instead of duplicating Hive entries, aligning with Annex A28’s deduplication mandate.
            3. **Download lifecycle helpers.** `ensureDownloadTask`, `markDownloadProgress`, `markDownloadComplete`, and `markDownloadFailed` stitch together the queued → in-progress → completed/failed pipeline while emitting broadcast updates that drive UI widgets and analytics throttling.
            4. **Progress throttling.** `_shouldEmitProgress` enforces a 350 ms window before emitting another stream event, keeping Flutter rebuilds predictable during large downloads and satisfying Annex B6’s “avoid jitter” guidance.
            5. **Assessment outbox.** `queueAssessmentSubmission` and `updateAssessmentSubmission` store offline payloads with optimistic state transitions, while `syncAssessmentQueue` upgrades records to `syncing`, calls the provided uploader, and reacts to both thrown errors and rejected uploads with actionable failure metadata.
            6. **Module snapshots.** `recordModuleProgressSnapshot` persists completion ratios and notes for every course/module pair, complementing the Hive-backed history surfaced in dashboards and enabling Annex B6 analytics to reload device progress after restarts.
            7. **Analytics cadence.** `shouldEmitDownloadAnalytics` caches the last event timestamp per asset so `ContentLibraryScreen` only pings remote analytics once every 30 minutes, preventing telemetry flood during offline retries.
            8. **Maintenance hooks.** Reset helpers (`resetDownloads`, `resetAssessments`) and `dispose` close broadcast controllers, equipping QA and logout flows with cleanup tools outlined in Annex A28.
         - A28.2 Edulure-Flutter/lib/services/content_service.dart
            1. **Offline task priming.** `downloadAsset` resolves storage paths, calls `OfflineLearningService.ensureDownloadTask`, and streams Dio progress into `markDownloadProgress` so UI listeners see real-time percentages.
            2. **Completion + failure handling.** Successful downloads persist file paths in Hive and notify the offline service; exceptions surface user-friendly errors while logging failure state so Annex B6 queue cards expose retry context.
            3. **Cache symmetry.** Helper loaders (`loadCachedAssets`, `loadCachedDownloads`, `loadCachedEbookProgress`) normalise session state so offline experiences match previously fetched data even without connectivity.
         - A28.3 Edulure-Flutter/lib/provider/learning/learning_store.dart
            1. **Controller wiring.** `learningProgressControllerProvider` injects `OfflineLearningService`, enabling `LearningProgressController.updateModuleProgress` to synchronise course progress updates with Hive snapshots.
            2. **Snapshot persistence.** After clamping completed lessons and writing local logs, the controller invokes `recordModuleProgressSnapshot`, ensuring Annex B6 completion metrics are cached for analytics and offline dashboards.
         - A28.4 Edulure-Flutter/lib/screens/content_library_screen.dart
            1. **Stream hydration.** `_setupOfflineListeners` subscribes to the offline download stream, backfills existing tasks, and keeps `_downloadStatuses` in sync for queue banners.
            2. **Analytics gating.** During download and open actions, the screen checks `shouldEmitDownloadAnalytics` before calling remote event endpoints, implementing Annex A28’s telemetry throttling.
            3. **Offline status UI.** `_buildOfflineStatusWidgets` renders queued, in-progress, completed, and failed states with palette-compliant badges and TODO messaging for rubric sync, matching Annex B6 copy guidelines.
            4. **Access controls.** Role checks hide instructor-only content while still showing offline queue hints, and the screen hydrates cached assets so learners retain progress when offline.
         - A28.5 Edulure-Flutter/lib/screens/assessments_screen.dart
            1. **Queue awareness.** `_hydrateOfflineSubmissions` and the assessment stream subscription keep the offline queue list current, enabling accurate pending/failed counts.
            2. **Offline capture form.** The “Log offline submission” flow records assessment metadata, attachments, and notes into `OfflineLearningService.queueAssessmentSubmission`, preserving evidence Annex B6 requires before sync.
            3. **Sync retries.** `_syncOfflineSubmissions` delegates to `syncAssessmentQueue`, surfaces spinner state, and translates uploader outcomes into snackbars, laying groundwork for future backend integrations while preserving offline resilience.
            4. **Empty state copy.** Queue cards provide guidance when no submissions exist, clarifying instructor expectations and aligning with Annex A28 communications guidance.
      - ✓ A29. Flutter Instructor Quick Actions & Operations (3.D)
         - A29.1 Edulure-Flutter/lib/services/instructor_operations_service.dart
            1. **Canonical quick actions.** `_actions` enumerates the supported workflows (announcement, attendance, grading, schedule, note) with display labels and icons so the dashboard renders consistent CTAs.
            2. **Hive-backed queue.** `_queueBox` persists `QueuedInstructorAction` entries, while `_enqueueAction`, `_updateAction`, and `_actionKey` centralise serialisation, preventing duplicate logic across UI surfaces.
            3. **Sync pipeline.** `runQuickAction` immediately attempts submission, downgrades failures with contextual error messages, and `syncQueuedActions` replays stored items, ensuring Annex A29 queues survive offline sessions.
            4. **Simulation stubs.** `_simulateRemoteSubmission` mimics backend behaviour (e.g., invalid negative attendance), highlighting TODOs to replace with production endpoints without blocking current QA drills.
            5. **Stream broadcasts.** `_queueUpdates` exposes a broadcast stream so the dashboard updates instantly when new actions queue, sync, or fail, keeping instructors informed per Annex C4 observability notes.
         - A29.2 Edulure-Flutter/lib/screens/instructor_dashboard_screen.dart
            1. **Service integration.** The screen instantiates `InstructorOperationsService`, loads quick actions on init, and subscribes to queue updates to hydrate `_queuedActions`.
            2. **Dynamic forms.** `_handleQuickAction` builds input fields per action type (attendance counts, session titles, notes), validating required values before invoking `runQuickAction`.
            3. **Queue visualisation.** `_buildQuickActionsSection` shows pending counts, colour-coded statuses, failure callouts, and manual sync controls, satisfying Annex A29 transparency requirements.
            4. **Feedback loops.** Submitting and syncing actions toggle progress indicators and snackbars so instructors receive immediate confirmation or remediation guidance.
         - A29.3 Edulure-Flutter/lib/services/session_manager.dart
            1. **Box registration.** `init` opens the `instructor_action_queue` Hive box alongside existing caches, enabling offline quick actions before any dashboard widget renders.
            2. **Lifecycle hygiene.** `clear` purges the queue during logout, preventing stale sensitive notes from lingering across sessions and aligning with Annex C4 security expectations.
      - A30. Flutter Billing & Subscription Management (3.E)
      - A31. Flutter Notifications, Messaging & Support (3.F)
      - ✓ A32. Community Reminder Job (4.A)
      - ✓ A33. Data Partition Job (4.B)
      - A34. Data Retention Job (4.C) ✓
         - A34.1 backend-nodejs/src/jobs/dataRetentionJob.js & config/env integration
            1. **Operational depth.** The scheduler now orchestrates retention enforcement, verification, and reporting in a single run loop, mirroring Annex A34’s mandate to purge PII, issue audit trails, and brief compliance stakeholders.
            2. **Configuration surface.** New environment toggles (`DATA_RETENTION_VERIFY`, `DATA_RETENTION_VERIFICATION_SAMPLE_SIZE`, `DATA_RETENTION_REPORT_ENABLED`, `DATA_RETENTION_REPORT_CHANNEL`, `DATA_RETENTION_REPORT_AUDIENCE`) expose governance levers so runtime behaviour aligns with policy sign-off windows.
            3. **Execution guardrails.** `dispatchSummary` fans out post-run responsibilities—audit logging, domain events, and stakeholder communications—without blocking the main retention cycle, keeping resiliency in low-traffic maintenance windows.
            4. **Verification workflow.** Jobs pass a normalised verification contract to the service, ensuring every policy captures pre-run counts, post-run counts, and residual signals that surface soft-delete drift highlighted under “Gaps & Risks.”
            5. **Residual signalling.** Residual matches raise structured warnings, bubble into audit payloads, and switch audit severity from “notice” to “warning,” delivering the verification assurances promised under “Resilience & Efficiency.”
            6. **Audit trail.** Each run records `governance.data_retention.*` events via `AuditEventService`, packaging policy outcomes, residuals, and totals so compliance reviews have an immutable ledger.
            7. **Stakeholder communication.** When not in dry-run mode, the job schedules Governance Roadmap communications with summarised bodies, tagged audiences, and metrics, answering the “UX & Communications” requirement to brief compliance partners.
            8. **Domain events.** Both simulated and committed cycles broadcast `governance.data_retention.(simulated|completed)` domain events with dispatch metadata, creating hooks for telemetry dashboards and alerting pipelines.
            9. **Observability.** Run metadata (trigger, totals, residual counts) is logged and persisted into `lastSummary`, improving runbook triage while keeping failure backoff semantics intact.
            10. **Extensibility.** Verification/reporting configs are normalised helpers, easing future annex work (e.g., batching communications or toggling manifest attachments) without re-threading scheduler wiring.
         - A34.2 backend-nodejs/src/services/dataRetentionService.js
            1. **Strategy normalisation.** Verification options are first-class citizens—sample sizes, residual handling, and metadata propagate through every enforcement branch.
            2. **Pre/Post counts.** Each policy now captures `preRunCount`, residual tallies, and status markers (`cleared`, `residual`, `simulated`), giving auditors quantitative proof of policy execution.
            3. **Audit payload enrichment.** `data_retention_audit_logs` entries carry verification summaries alongside reasons, sample IDs, and contexts, satisfying Annex A34’s requirement for reproducible evidence.
            4. **Sample controls.** Policy sampling honours configurable limits rather than hard-coded values, aligning with the resilience guidance to throttle IO and provide deterministic previews.
            5. **Residual warnings.** Policies that fail to clear matched rows emit targeted logger warnings and still push CDC events, ensuring monitoring catches misaligned soft-delete columns.
            6. **Empty-strategy handling.** Strategies with no matches return structured results (including verification state), so reporting layers still generate zero-impact evidence packets.
         - A34.3 backend-nodejs/test/dataRetentionService.test.js
            1. **Coverage.** New Vitest cases lock in residual detection, dry-run simulation semantics, and audit payload structure, preventing regressions while Annex A34 iterates.
            2. **Builder fidelity.** Shared builder state simulates pre/post deletion counts, guaranteeing verification math mirrors production SQL behaviour.
            3. **Runtime compatibility.** Tests run with stubbed R2 credentials and reuse the same logging cadence seen in worker executions, validating observability parity.
      - A35. Moderation Follow-Up Job (4.D) ✓
         - A35.1 backend-nodejs/src/jobs/moderationFollowUpJob.js & config/env integration
            1. **Operational depth.** The follow-up scheduler now hydrates cases, computes overdue windows, and escalates unresolved actions—directly answering Annex A35’s charge to audit moderation follow-ups end-to-end.
            2. **Configuration knobs.** New env inputs (`MODERATION_FOLLOW_UP_ESCALATE_AFTER_MINUTES`, `MODERATION_FOLLOW_UP_ESCALATION_ROLES`, `MODERATION_FOLLOW_UP_AUDIT_SEVERITY`, `MODERATION_FOLLOW_UP_ANALYTICS_ENABLED`) externalise thresholds and audiences that were previously hard-coded risks.
            3. **Overdue intelligence.** Each follow-up calculates `overdueMinutes`, stamps metadata, and distinguishes escalated versus routine reminders, tightening accountability for aged cases.
            4. **Dual domain events.** The job emits `community.moderation.follow_up.due` plus `...escalated` events with dispatch tags and role audiences so realtime infra and alerting channels can route reminders and escalations separately.
            5. **Audit assurance.** Escalations record `moderation.follow_up.escalated` audit entries with assignee, overdue window, and escalation roles, satisfying Annex A35’s escalation evidence expectations.
            6. **Analytics insight.** Optional analytics events (dispatch versus escalated) push severity-weighted risk scores into `moderation_analytics_events`, feeding dashboards that monitor alert fatigue.
            7. **Metadata hygiene.** `ModerationFollowUpModel.markCompleted` now persists dispatch timestamps, triggers, overdue minutes, and escalation context for retrospective QA.
            8. **Run summaries.** Aggregated logging (processed count, escalations, overdue backlog) keeps operations visibility high without additional queries.
            9. **Graceful cancellation.** Failures capture error context, retain overdue metadata, and avoid silent drops, aligning with resilience guidelines to implement retries and cancellation audit trails.
            10. **Extensibility.** Analytics, audit, and domain event dependencies are injected, simplifying future Annex enhancements (e.g., queue retries or multi-channel notifications).
         - A35.2 backend-nodejs/src/config/env.js
            1. **Schema updates.** Zod parsing now validates follow-up thresholds, escalation roles, and analytics toggles, giving deployment pipelines deterministic config validation.
            2. **Workspace defaults.** Sensible defaults (120-minute escalation, moderator/compliance roles, “notice” audit severity) map directly to tabletop exercises outlined under “Change Management.”
      - ✓ A36. Monetization Reconciliation Job (4.E)
      - ✓ A37. Telemetry Warehouse Job (4.F)
      - A38. Identity & Access Schema (5.A)
      - A39. Learning Content Schema (5.B)
      - A40. Community, Social & Messaging Schema (5.C)
      - A41. Commerce & Finance Schema (5.D)
      - A42. Analytics, Governance & Observability Schema (5.E) ✓
      - A43. Marketing, Content & Enablement Schema (5.F) ✓
      - A44. SDK Generated Client & Runtime Configuration (6.A)
      - A45. SDK Authentication & Session Utilities (6.B)
      - A46. Environment Provisioning & Infrastructure as Code (7.A)
      - A47. CI/CD Automation & Release Tooling (7.B)
      - A48. Observability Stack & Runtime Telemetry (7.C)
      - A49. Local Tooling & Developer Enablement (7.D)
      - A50. Automated Test Suites & Coverage (8.A)
      - A51. Manual QA & Release Governance (8.B)
      - A52. Test Data, Fixtures & Sandboxes (8.C)
      - A53. Product & Technical Guides (9.A)
      - A54. Operational Playbooks & Incident Response (9.B)
      - A55. Design System Assets & UX Research (9.C)
      - A56. Strategy, Valuation & Stakeholder Communication (9.D)
      - B1. Backend Identity & Security Cluster
         - B1.A. Authentication & Session Flow (`backend-nodejs/src/controllers/auth`, `services/auth`, `middleware/sessionGuard.js`)
         - B1.B. Authorization & Role Management (`backend-nodejs/src/services/authorization`, `database/migrations/*roles*`)
      - B2. Backend Learning Delivery Cluster
         - B2.A. Course Authoring & Lesson Orchestration (`backend-nodejs/src/controllers/lessons`, `services/lessons`, `models/Lesson.ts`)
         - B2.B. Assessment Engine (`backend-nodejs/src/services/assessments`, `routes/assessments.js`, `frontend-reactjs/src/pages/assessments`)
      - B3. Backend Community & Engagement Cluster
         - B3.A. Community Feed & Posts (`backend-nodejs/src/controllers/feed`, `services/feed`, `frontend-reactjs/src/pages/community/Feed.jsx`)
         - B3.B. Leaderboards & Recognition (`backend-nodejs/src/services/leaderboard`, `frontend-reactjs/src/pages/community/Leaderboard.jsx`)
      - B4. Backend Monetisation & Commerce Cluster
         - B4.A. Subscription Billing (`backend-nodejs/src/services/billing`, `integrations/stripe`, `frontend-reactjs/src/pages/billing`)
      - B5. Frontend Web Experience Deep Dive
         - B5.A. Learner Dashboard (`frontend-reactjs/src/pages/dashboard/LearnerDashboard.jsx`, `components/dashboard`) ✅
         - B5.B. Course Player (`frontend-reactjs/src/pages/player/CoursePlayer.jsx`, `components/player`) ✅
      - B6. Flutter Mobile App Deep Dive (`Edulure-Flutter`)
         - B6.A. Mobile Learning Experience (`lib/modules/learning`, `lib/widgets/player`)
      - B7. Data & Analytics Platform
         - ✅ B7.A. Warehouse & ETL (`infrastructure/data/warehouse`, `scripts/etl`)
      - B8. Infrastructure & DevOps
         - B8.A. Deployment Pipeline (`infrastructure/pipeline`, `github/workflows`)
      - B9. Quality Assurance & Observability (`qa`, `backend-nodejs/observability`)
         - B9.A. Automated Testing Coverage
      - B10. Documentation & Knowledge Management (`docs`, `EDULURE_GUIDE.md`, `logic_flows.md`)
         - B10.A. Comprehensive Documentation Programme
      - C1. Learner Support Workspace (`frontend-reactjs/src/pages/dashboard/LearnerSupport.jsx`, `frontend-reactjs/src/hooks/useLearnerSupportCases.js`, `frontend-reactjs/src/api/learnerDashboardApi.js`, `backend-nodejs/src/controllers/LearnerDashboardController.js`, `backend-nodejs/src/services/LearnerDashboardService.js`, `backend-nodejs/src/services/SupportKnowledgeBaseService.js`, `backend-nodejs/src/repositories/LearnerSupportRepository.js`) ✅
      - C2. Admin Support Hub & Trust-Safety Command Centre (`frontend-reactjs/src/pages/dashboard/admin/AdminSupportHub.jsx`, `frontend-reactjs/src/pages/dashboard/admin/AdminTrustSafety.jsx`, `frontend-reactjs/src/hooks/useSupportDashboard.js`, `frontend-reactjs/src/components/dashboard/DashboardStateMessage.jsx`, `backend-nodejs/src/services/DashboardService.js`, `backend-nodejs/src/controllers/AdminSettingsController.js`, `backend-nodejs/src/models/SupportTicketModel.js`)
      - C3. Field Services & Onsite Delivery Coordination (`frontend-reactjs/src/pages/dashboard/FieldServices.jsx`, `frontend-reactjs/src/components/dashboard/FieldServiceConflictModal.jsx`, `frontend-reactjs/src/api/learnerDashboardApi.js`, `backend-nodejs/src/services/LearnerDashboardService.js`, `backend-nodejs/src/models/FieldServiceAssignmentModel.js`)
      - C4. Live Classes & Tutoring Operations (`frontend-reactjs/src/pages/dashboard/InstructorLiveClasses.jsx`, `frontend-reactjs/src/pages/dashboard/LearnerLiveClasses.jsx`, `frontend-reactjs/src/pages/dashboard/InstructorTutorBookings.jsx`, `backend-nodejs/src/controllers/InstructorBookingController.js`, `backend-nodejs/src/controllers/AdminBookingController.js`, `backend-nodejs/src/services/LearnerDashboardService.js`, `backend-nodejs/src/services/InstructorSchedulingService.js`, `backend-nodejs/src/models/TutorBookingModel.js`) ✅
      - C5. Integration Credential Invitations & API Key Governance (`frontend-reactjs/src/pages/IntegrationCredentialInvite.jsx`, `frontend-reactjs/src/api/integrationInviteApi.js`, `frontend-reactjs/src/hooks/usePageMetadata.js`, `backend-nodejs/src/controllers/AdminIntegrationsController.js`, `backend-nodejs/src/services/IntegrationApiKeyService.js`, `backend-nodejs/src/services/IntegrationApiKeyInviteService.js`, `backend-nodejs/src/services/IntegrationDashboardService.js`)
      - C6. Admin Approvals, Operations & Setup Governance (`frontend-reactjs/src/pages/admin/sections/AdminApprovalsSection.jsx`, `frontend-reactjs/src/pages/admin/sections/AdminOperationsSection.jsx`, `frontend-reactjs/src/hooks/useSetupProgress.js`, `frontend-reactjs/src/pages/Admin.jsx`, `backend-nodejs/src/controllers/AdminSettingsController.js`, `backend-nodejs/src/services/PlatformSettingsService.js`, `backend-nodejs/src/services/ReleaseOrchestrationService.js`)
      - ✅ C7. Legal, Privacy & Compliance Centre (`frontend-reactjs/src/pages/Terms.jsx`, `frontend-reactjs/src/pages/Privacy.jsx`, `frontend-reactjs/src/pages/LegalContact.jsx`, `backend-nodejs/src/controllers/ComplianceController.js`, `backend-nodejs/src/models/DataSubjectRequestModel.js`, `docs/compliance/policies/*`, `docs/legal/content`)
2. Part 2 — User Experience Audit & Component Breakdown
      - ✓ 1.A Entrypoints & Layout Containers
         - 1.A.1 AdminShell (frontend-reactjs/src/layouts/AdminShell.jsx)
         - 1.A.2 DashboardLayout (frontend-reactjs/src/layouts/DashboardLayout.jsx)
         - 1.A.3 MainLayout (frontend-reactjs/src/layouts/MainLayout.jsx)
         - 1.A.4 styles (frontend-reactjs/src/styles.css)
      - ✓ 1.B Global Navigation & Shell Chrome
         - 1.B.1 TopBar (frontend-reactjs/src/components/TopBar.jsx)
         - 1.B.2 AppNotificationPanel (frontend-reactjs/src/components/navigation/AppNotificationPanel.jsx)
         - 1.B.3 AppSidebar (frontend-reactjs/src/components/navigation/AppSidebar.jsx)
         - 1.B.4 AppTopBar (frontend-reactjs/src/components/navigation/AppTopBar.jsx)
         - 1.B.5 HeaderMegaMenu (frontend-reactjs/src/components/navigation/HeaderMegaMenu.jsx)
         - 1.B.6 LanguageSelector (frontend-reactjs/src/components/navigation/LanguageSelector.jsx)
         - 1.B.7 MobileMegaMenu (frontend-reactjs/src/components/navigation/MobileMegaMenu.jsx)
         - 1.B.8 UserMenu (frontend-reactjs/src/components/navigation/UserMenu.jsx)
         - 1.B.9 routes (frontend-reactjs/src/navigation/routes.js)
         - 1.B.10 utils (frontend-reactjs/src/navigation/utils.js)
      - ✓ 1.C Runtime Context Providers & Config — Annex A21 (Admin & Operations Dashboards)
         - 1.C.1 AuthContext (frontend-reactjs/src/context/AuthContext.jsx)
         - 1.C.2 DashboardContext (frontend-reactjs/src/context/DashboardContext.jsx)
         - 1.C.3 LanguageContext (frontend-reactjs/src/context/LanguageContext.jsx)
         - 1.C.4 RealtimeContext (frontend-reactjs/src/context/RealtimeContext.jsx)
         - 1.C.5 RuntimeConfigContext (frontend-reactjs/src/context/RuntimeConfigContext.jsx)
         - 1.C.6 ServiceHealthContext (frontend-reactjs/src/context/ServiceHealthContext.jsx)
        1. **Appraisal.** Front-end providers now bind to real multi-tenant operator data: the new `SupportOperationsService`, `OperatorSupportController`, and `/api/v1/operator/support/*` routes hydrate `DashboardContext`, `RuntimeConfigContext`, and downstream hooks with Annex A21 payloads backed by MySQL tables (`support_operations_*`, `support_notification_policies`, `support_automation_workflows`).
        2. **AuthContext.** Session snapshots capture active tenant identifiers and feed them into `SupportTicketModel.buildCreatePayload`, ensuring tickets and operations queries persist `tenant_id` values that match the seeded workspaces introduced in `20250322120000_support_operations_console.js`.
        3. **Tenant targeting.** DashboardContext still exposes `operationsSnapshot`, now populated by `SupportOperationsService.getOverview({ tenantId })`, so support/ops surfaces render queue metrics, backlog trends, and alerts aligned with the tenant list returned by `/operator/support/tenants`.
        4. **Ops-ready runtime config.** RuntimeConfigContext gates realtime toggles (`support.realtime`, `trustSafety.realtime`) that `useSupportDashboard` and `useTrustSafetyDashboard` reference when orchestrating the freshly wired backend snapshots, preserving deterministic flag evaluation per tenant.
        5. **Realtime fabric.** RealtimeContext’s subscription lifecycle complements the new support endpoints by streaming case updates (`operations.support.case.updated`) into the hook caches, keeping Annex panels in sync with database writes.
        6. **Service health intelligence.** ServiceHealthContext continues to expose capability impact data which now pairs with the seeded `support_automation_workflows` health metadata to give admins a unified outage view across Annex dashboards.
        7. **Lifecycle.** Context providers still invalidate cache tags (e.g., `operator:support:*`) and abort inflight requests; the operator routes piggyback on the same invalidation keys so tenant switches immediately re-fetch queue, automation, and onboarding snapshots.
        8. **Diagnostics.** `lastLoadedAt`, `fetchedAt`, and `connectedAt` timestamps remain exposed and now align with backend telemetry: support overview responses surface `generatedAt` values used in ops checklists and recorded in `support_operations_communications`.
        9. **Extensibility.** Selector APIs (`getDashboard`, `getSection`, `hasPermission`, `getFeatureVariant`, `getCapability`) stay stable while the backend provides canonical support data, letting future Annex work reuse the same contexts without reimplementing analytics joins.
        10. **Resilience.** Context error objects map neatly to the new controller responses (`Support operations overview loaded`), yielding consistent `DashboardStateMessage` props even when backend validation (Joi) raises 422s.
      - ✓ 1.D Hooks & Composable Logic — Annex C1 (Learner Support Workspace), Annex C2 (Admin Trust-Safety)
         - 1.D.1 useAuthorization (frontend-reactjs/src/hooks/useAuthorization.js)
         - 1.D.2 useAutoDismissMessage (frontend-reactjs/src/hooks/useAutoDismissMessage.js)
         - 1.D.3 useConsentRecords (frontend-reactjs/src/hooks/useConsentRecords.js)
         - 1.D.4 useDataSaverPreference (frontend-reactjs/src/hooks/useDataSaverPreference.js)
         - 1.D.5 useExecutiveDashboard (frontend-reactjs/src/hooks/useExecutiveDashboard.js)
         - 1.D.6 useExplorerEntitySearch (frontend-reactjs/src/hooks/useExplorerEntitySearch.js)
         - 1.D.7 useFeedInteractions (frontend-reactjs/src/hooks/useFeedInteractions.js)
         - 1.D.8 useFinanceDashboard (frontend-reactjs/src/hooks/useFinanceDashboard.js)
         - 1.D.9 useLearnerDashboard (frontend-reactjs/src/hooks/useLearnerDashboard.js)
         - 1.D.10 useLearnerProgress (frontend-reactjs/src/hooks/useLearnerProgress.js)
         - 1.D.11 useLearnerStudyPlan (frontend-reactjs/src/hooks/useLearnerStudyPlan.js)
         - 1.D.12 useLearnerSupportCases (frontend-reactjs/src/hooks/useLearnerSupportCases.js)
         - 1.D.13 useMarketingContent (frontend-reactjs/src/hooks/useMarketingContent.js)
         - 1.D.14 useMediaUpload (frontend-reactjs/src/hooks/useMediaUpload.js)
         - 1.D.15 useOnboardingForm (frontend-reactjs/src/hooks/useOnboardingForm.js)
         - 1.D.16 useRoleGuard (frontend-reactjs/src/hooks/useRoleGuard.js)
         - 1.D.17 useSearchProvider (frontend-reactjs/src/hooks/useSearchProvider.js)
         - 1.D.18 useSetupProgress (frontend-reactjs/src/hooks/useSetupProgress.js)
         - 1.D.19 useSupportDashboard (frontend-reactjs/src/hooks/useSupportDashboard.js)
         - 1.D.20 useSystemPreferencesForm (frontend-reactjs/src/hooks/useSystemPreferencesForm.js)
         - 1.D.21 useTrustSafetyDashboard (frontend-reactjs/src/hooks/useTrustSafetyDashboard.js)
        1. **Appraisal.** Learner support and trust-safety hooks now consume real Annex payloads: `useSupportDashboard` drives against `/api/v1/operator/support/overview`, while `useLearnerSupportCases` and realtime listeners hydrate queue data seeded in `support_operations_communications`, `support_notification_policies`, and `support_onboarding_checklists`.
        2. **Authorization.** `useAuthorization` still merges tenants and permissions, and the backend enforces admin-only access to operator routes through `auth('admin')`, keeping C1/C2 tooling behind the correct roles.
        3. **Message UX.** `useAutoDismissMessage` maintains pause/resume semantics so the new backend-sourced toasts (queue breaches, automation pauses) remain readable and accessible across Annex panels.
        4. **Support cases.** `useLearnerSupportCases` reconciles socket updates with the tenant-aware `learner_support_cases.tenant_id` column; the repository and seeds ensure SLA metadata (`firstResponseMinutes`, `resolutionMinutes`, satisfaction) match the hook’s SLA badge logic.
        5. **Support operations.** `useSupportDashboard` now fetches enriched summaries—queue stats, backlog trend, automation health, onboarding progress, and notification policies—directly from `SupportOperationsService`, caching by tenant and replaying realtime deltas.
        6. **Trust & safety.** `useTrustSafetyDashboard` continues to orchestrate moderation data while sharing tenant state and service health context with the support dashboard so Annex C2 insights align with A21 telemetry.
        7. **Observability.** Hooks expose `lastUpdated`, `realtime`, and feature variants; backend responses surface `generatedAt` and workflow statuses so analytics dashboards can verify SLA attainment, CSAT, and NPS for every tenant.
        8. **Interoperability.** Shared caches (`support-overview`, `support-tenants`) and runtime selectors let support/trust-safety hooks reuse context data (`statusSummary`, `impactMatrix`) without duplicate fetches, ensuring admin and learner shells stay in sync.
        9. **Resilience.** Offline guards, abort controllers, and cache fallbacks now pair with backend Joi validation—422 responses bubble through the hooks and render consistent `DashboardStateMessage` variants when filters are invalid.
        10. **Extensibility.** Public hook APIs (`updateTicket`, `updateNotificationPolicy`, `refreshTenants`) map directly onto the seeded tables and controller endpoints, giving follow-on Annex tasks (automation toggles, new playbooks) a stable integration surface.
      - ✓ 1.E API Clients & Data Contracts — Annex A11 (Integrations & Environment Parity)
         - 1.E.1 adminAdsApi (frontend-reactjs/src/api/adminAdsApi.js)
         - 1.E.2 adminApi (frontend-reactjs/src/api/adminApi.js)
         - 1.E.3 adminGrowthApi (frontend-reactjs/src/api/adminGrowthApi.js)
         - 1.E.4 adminRevenueApi (frontend-reactjs/src/api/adminRevenueApi.js)
         - 1.E.5 adsApi (frontend-reactjs/src/api/adsApi.js)
         - 1.E.6 analyticsApi (frontend-reactjs/src/api/analyticsApi.js)
         - 1.E.7 authApi (frontend-reactjs/src/api/authApi.js)
         - 1.E.8 blogApi (frontend-reactjs/src/api/blogApi.js)
         - 1.E.9 communityApi (frontend-reactjs/src/api/communityApi.js)
         - 1.E.10 communityChatApi (frontend-reactjs/src/api/communityChatApi.js)
         - 1.E.11 complianceApi (frontend-reactjs/src/api/complianceApi.js)
         - 1.E.12 courseApi (frontend-reactjs/src/api/courseApi.js)
         - 1.E.13 creationStudioApi (frontend-reactjs/src/api/creationStudioApi.js)
         - 1.E.14 dashboardApi (frontend-reactjs/src/api/dashboardApi.js)
         - 1.E.15 ebookApi (frontend-reactjs/src/api/ebookApi.js)
         - 1.E.16 explorerApi (frontend-reactjs/src/api/explorerApi.js)
         - 1.E.17 feedApi (frontend-reactjs/src/api/feedApi.js)
         - 1.E.18 instructorOrchestrationApi (frontend-reactjs/src/api/instructorOrchestrationApi.js)
         - 1.E.19 instructorRosterApi (frontend-reactjs/src/api/instructorRosterApi.js)
         - 1.E.20 integrationAdminApi (frontend-reactjs/src/api/integrationAdminApi.js)
         - 1.E.21 integrationInviteApi (frontend-reactjs/src/api/integrationInviteApi.js)
         - 1.E.22 learnerDashboardApi (frontend-reactjs/src/api/learnerDashboardApi.js)
         - 1.E.23 marketingApi (frontend-reactjs/src/api/marketingApi.js)
         - 1.E.24 mediaApi (frontend-reactjs/src/api/mediaApi.js)
         - 1.E.25 moderationApi (frontend-reactjs/src/api/moderationApi.js)
         - 1.E.26 operatorDashboardApi (frontend-reactjs/src/api/operatorDashboardApi.js)
         - 1.E.27 paymentsApi (frontend-reactjs/src/api/paymentsApi.js)
         - 1.E.28 securityOperationsApi (frontend-reactjs/src/api/securityOperationsApi.js)
         - 1.E.29 setupApi (frontend-reactjs/src/api/setupApi.js)
         - 1.E.30 socialGraphApi (frontend-reactjs/src/api/socialGraphApi.js)
         - 1.E.31 userApi (frontend-reactjs/src/api/userApi.js)
         - 1.E.32 verificationApi (frontend-reactjs/src/api/verificationApi.js)
            1. **Appraise.** API clients now honour Annex A11 parity mandates: `httpClient` routes every request through a shared environment descriptor so staging, sandbox, and production runbooks observe identical headers, cache segmentation, and parity tagging (frontend-reactjs/src/api/httpClient.js, frontend-reactjs/src/utils/environment.js).
            2. **Functionality.** `request` injects `X-Edulure-Environment`, tier, region, and workspace headers derived from `resolveEnvironmentDescriptor`, while `createListCacheConfig` opts in to `varyByEnvironment` to prevent cross-environment cache bleed (frontend-reactjs/src/api/httpClient.js, frontend-reactjs/src/api/apiUtils.js).
            3. **Usefulness.** Integrations dashboards now receive environment-aware explorer summaries because `analyticsApi` normalises responses through `analyticsContracts`, guaranteeing Annex payloads expose environment, totals, series, and governance forecasts in the expected schema (frontend-reactjs/src/api/analyticsApi.js, frontend-reactjs/src/api/analyticsContracts.js).
            4. **Interoperability.** `attachEnvironmentToInteraction` enriches explorer telemetry with tier, region, and workspace hints so downstream ingestion can correlate partner beacons with the correct deployment (frontend-reactjs/src/api/analyticsContracts.js).
            5. **Parity Signals.** Cached GETs encode the environment cache key, ensuring an ops engineer debugging sandbox traffic never sees production analytics cached responses (frontend-reactjs/src/api/httpClient.js).
            6. **Governance Hooks.** Environment helpers expose audit stamps consumed by Annex tooling, letting ops capture request fingerprints for change logs (frontend-reactjs/src/utils/environment.js).
            7. **Redundancies.** Environment derivation logic moved out of individual clients into `environment.js`, eliminating duplicate parsing and stop-gap constants (frontend-reactjs/src/utils/environment.js, frontend-reactjs/src/api/analyticsApi.js).
            8. **Placeholders.** Interaction payloads still rely on caller-supplied identifiers; once backend issues canonical IDs we can drop the random UUID fallback in alerts (frontend-reactjs/src/api/analyticsContracts.js).
            9. **Efficiency.** Cache tags now include `env:<key>` so invalidation routines can surgically prune environment-specific entries without evicting global data (frontend-reactjs/src/api/httpClient.js).
            10. **Observability.** Normalised analytics summaries capture `lastComputedAt` timestamps, ensuring Annex A11 dashboards surface freshness metadata for audits (frontend-reactjs/src/api/analyticsContracts.js).
            11. **Security.** Environment headers centralise workspace scoping, preventing bespoke clients from leaking privileged tenant identifiers into public environments (frontend-reactjs/src/api/httpClient.js).
            12. **Consistency.** Explorer alerts, saved views, and summary payloads now follow a shared schema with coerced numbers, ISO dates, and deterministic defaults—avoiding ad-hoc shape checks across dashboards (frontend-reactjs/src/api/analyticsContracts.js, frontend-reactjs/src/api/analyticsApi.js).
            13. **Extensibility.** `setEnvironmentContext`/`resolveEnvironmentDescriptor` APIs let feature flags or admin tools swap environments at runtime without rehydrating clients, supporting Annex parity rehearsals (frontend-reactjs/src/api/httpClient.js, frontend-reactjs/src/utils/environment.js).
            14. **Testing.** Vitest coverage asserts that headers are emitted and caches segment correctly, reducing regression risk before Annex promotion (frontend-reactjs/test/api/httpClient.test.js, frontend-reactjs/test/utils/environment.test.js).
            15. **Backward Compatibility.** If environment hints are absent, defaults fall back to local descriptors so existing local dev flows remain stable (frontend-reactjs/src/utils/environment.js).
            16. **Error Handling.** `persistentCache` logs failures to resolve environment keys, capturing anomalies when Annex seeds or runtime config drift (frontend-reactjs/src/utils/persistentCache.js).
            17. **Docs Alignment.** Implementation mirrors `user_experience.md` guidance on environment-aware navigation and analytics so UI, APIs, and governance playbooks speak the same vocabulary.
            18. **Telemetry.** Explorer interactions include environment context for both `sendBeacon` and fallback POST flows, ensuring Annex ingestion parity across browser capabilities (frontend-reactjs/src/api/analyticsApi.js).
            19. **Caching Strategy.** GET cache TTLs remain tunable while inheriting environment segmentation, keeping Annex dashboards responsive without stale cross-tenant bleed (frontend-reactjs/src/api/httpClient.js).
            20. **Schema Guarantees.** Normalisers guard against `null` arrays and inconsistent property names, fulfilling Annex contract requirements for timeseries, breakdowns, and forecasts (frontend-reactjs/src/api/analyticsContracts.js).
            21. **Governance Signals.** Generated audit stamps expose capture time plus environment facets, letting Annex compliance routines embed provenance in downstream artefacts (frontend-reactjs/src/utils/environment.js).
            22. **DX Improvements.** Exported helpers (`setEnvironmentContext`, `resolveEnvironmentDescriptor`) provide ergonomic hooks for Storybook, SDKs, and test harnesses aligning with Annex developer enablement goals (frontend-reactjs/src/api/httpClient.js).
            23. **Remaining Gaps.** Future work should plumb environment-aware retries/backoff into httpClient to fully satisfy Annex A11 resilience narratives.
            24. **Release.** Promote after verifying environment headers in staging, confirming explorer analytics normalisation via curl, rerunning vitest suites, and documenting the parity rollout in Annex change logs.
            25. **Data Layer Alignment.** `20250405101500_environment_analytics_alignment.js` adds environment key/name/tier/region/workspace columns and indexes to `explorer_search_events`, `explorer_search_daily_metrics`, `analytics_alerts`, and `analytics_forecasts`, while updating uniqueness constraints so backend models (`ExplorerSearchEventModel`, `ExplorerSearchDailyMetricModel`, `AnalyticsAlertModel`, `AnalyticsForecastModel`) and `EnvironmentParityService` operate on environment-scoped slices matching Annex A11 parity requirements.
            26. **Backend Responses.** `ExplorerAnalyticsService` now threads the canonical descriptor from `utils/environmentContext.js` through search recordings, health checks, and summary payloads so `/api/analytics/explorer/summary` returns explicit environment metadata alongside segmented forecasts and alerts.
            27. **Query Guardrails.** Centralised helpers pipe `applyEnvironmentFilter` into explorer models and add targeted vitest coverage so every event and daily metric query enforces `environment_key`, keeping analytics reads aligned with the Annex migration across descriptors, builders, and sqlite harnesses (backend-nodejs/src/utils/environmentContext.js, backend-nodejs/src/models/ExplorerSearchEventModel.js, backend-nodejs/src/models/ExplorerSearchDailyMetricModel.js, backend-nodejs/test/utils/environmentContext.test.js, backend-nodejs/test/explorerSearchEventModel.test.js, backend-nodejs/test/explorerSearchDailyMetricModel.test.js).
      - ✓ 1.F Utilities, Data Fixtures & Libs — Annex A42 (Analytics & Governance Schema)
         - 1.F.1 marketingAltText (frontend-reactjs/src/data/marketingAltText.js)
         - 1.F.2 mockData (frontend-reactjs/src/data/mockData.js)
         - 1.F.3 liveSessionQueue (frontend-reactjs/src/utils/liveSessionQueue.js)
         - 1.F.4 mediaCache (frontend-reactjs/src/utils/mediaCache.js)
         - 1.F.5 persistentCache (frontend-reactjs/src/utils/persistentCache.js)
         - 1.F.6 persistentState (frontend-reactjs/src/utils/persistentState.js)
         - 1.F.7 socialGraph (frontend-reactjs/src/utils/socialGraph.js)
         - 1.F.8 uploads (frontend-reactjs/src/utils/uploads.js)
         - 1.F.9 auth (frontend-reactjs/src/utils/validation/auth.js)
         - 1.F.10 onboarding (frontend-reactjs/src/utils/validation/onboarding.js)
            1. **Appraise.** Utilities now embed Annex A42 governance requirements: persistent caches record schema versions and environment keys so analytics fixtures never leak between tenants or outdated schemas (frontend-reactjs/src/utils/persistentCache.js).
            2. **Functionality.** `createPersistentCache` accepts `environmentResolver` and `schemaVersion`, storing both alongside each entry and purging stale payloads when the runtime environment or schema drifts (frontend-reactjs/src/utils/persistentCache.js).
            3. **Usefulness.** Analytics dashboards consuming cached governance snapshots receive environment-aligned data, eliminating the risk of staging artefacts appearing in production readiness panels (frontend-reactjs/src/utils/persistentCache.js).
            4. **Integrity.** Cache reads invalidate mismatched environment keys or schema versions, upholding Annex audit controls for runtime analytics storage (frontend-reactjs/src/utils/persistentCache.js).
            5. **Resilience.** Logger hooks capture failures resolving environment context, giving governance tooling visibility into misconfigured annex seeds (frontend-reactjs/src/utils/persistentCache.js).
            6. **Observability.** Environment helpers expose audit stamps for downstream governance registries, ensuring every analytics export carries environment, tier, region, and capture time metadata (frontend-reactjs/src/utils/environment.js).
            7. **Normalisation.** Newly added analytics contracts coerce explorer summaries, alerts, and revenue views into Annex A42 schemas, harmonising fixtures with governance dashboards (frontend-reactjs/src/api/analyticsContracts.js).
            8. **Consistency.** Utilities share the same environment parser used by API clients, preventing divergent casing or workspace keys across fixtures and runtime libs (frontend-reactjs/src/utils/environment.js).
            9. **Testing.** Vitest suites guard environment parsing, header generation, and cache segmentation, covering the governance-critical glue code added for Annex A42 (frontend-reactjs/test/utils/environment.test.js, frontend-reactjs/test/api/httpClient.test.js).
            10. **Backfill Ready.** Cache writes now return environment and schema metadata so migration scripts can audit stored fixtures before Annex promotion (frontend-reactjs/src/utils/persistentCache.js).
            11. **Governance Schema.** Explorer alert normalisation injects deterministic IDs, severity, acknowledgement state, and environment facets, matching Annex observability tables (frontend-reactjs/src/api/analyticsContracts.js).
            12. **Telemetry Hygiene.** Forecast normalisers enforce ISO timestamps and numeric coercion, aligning with analytics warehouse expectations for Annex readiness (frontend-reactjs/src/api/analyticsContracts.js).
            13. **Compliance Guardrails.** Cache pruning keeps expired entries from polluting governance scorecards, satisfying Annex retention policies (frontend-reactjs/src/utils/persistentCache.js).
            14. **DX Support.** Environment helpers expose deterministic cache keys and audit stamps so developers can trace governance fixture provenance during QA (frontend-reactjs/src/utils/environment.js).
            15. **Fallbacks.** When environment hints are absent, utilities fall back to defaults, keeping local analytics sandboxes operable while still stamping metadata (frontend-reactjs/src/utils/environment.js).
            16. **Documentation Alignment.** Behaviour mirrors `user_experience.md` directives around analytics freshness, parity, and governance transparency, ensuring libs and fixtures uphold UX expectations.
            17. **Gaps.** Next steps include piping governance schema validation into CI to automatically verify cache schema versions during Annex deployments.
            18. **Release.** Validate by seeding caches in staging, confirming environment keys in IndexedDB via browser devtools, rerunning vitest, and logging Annex A42 updates in ops runbooks.
            19. **Persistence.** Analytics fixtures now seed environment-aware records through `createEnvironmentColumns()` ensuring `explorer_search_daily_metrics`, `analytics_alerts`, and `analytics_forecasts` snapshots respect Annex A42 governance segmentation across migrations, models, and bootstrap data.
            20. **Runtime Support.** Backend utilities share the new `environmentContext` helper, giving governance repositories (`EnvironmentParitySnapshotModel`, `ExplorerSearchDailyMetricModel`) direct access to descriptor columns for parity audits and schema purges.
            21. **Test Harnesses.** SQLite-backed model suites mirror the Annex columns so parity helpers and descriptors stay validated during unit runs, preventing regressions between migrations and governance fixtures (backend-nodejs/test/utils/environmentContext.test.js, backend-nodejs/test/explorerSearchEventModel.test.js, backend-nodejs/test/explorerSearchDailyMetricModel.test.js).
      - ✓ 2.A Landing & Value Proposition Surfaces
         - 2.A.1 FeatureGrid (frontend-reactjs/src/components/FeatureGrid.jsx)
         - 2.A.2 PageHero (frontend-reactjs/src/components/PageHero.jsx)
         - 2.A.3 StatsBar (frontend-reactjs/src/components/StatsBar.jsx)
         - 2.A.4 Testimonials (frontend-reactjs/src/components/Testimonials.jsx)
         - 2.A.5 ClosingCtaBanner (frontend-reactjs/src/components/home/ClosingCtaBanner.jsx)
         - 2.A.6 CommunitySpotlight (frontend-reactjs/src/components/home/CommunitySpotlight.jsx)
         - 2.A.7 CoursesAdventure (frontend-reactjs/src/components/home/CoursesAdventure.jsx)
         - 2.A.8 EbookShowcase (frontend-reactjs/src/components/home/EbookShowcase.jsx)
         - 2.A.9 HomeFaq (frontend-reactjs/src/components/home/HomeFaq.jsx)
         - 2.A.10 HomeSection (frontend-reactjs/src/components/home/HomeSection.jsx)
         - 2.A.11 PerksGrid (frontend-reactjs/src/components/home/PerksGrid.jsx)
         - 2.A.12 TutorArcade (frontend-reactjs/src/components/home/TutorArcade.jsx)
         - 2.A.13 CaseStudyGrid (frontend-reactjs/src/components/marketing/CaseStudyGrid.jsx)
         - 2.A.14 ConversionPanel (frontend-reactjs/src/components/marketing/ConversionPanel.jsx)
         - 2.A.15 HeroMediaPanel (frontend-reactjs/src/components/marketing/HeroMediaPanel.jsx)
         - 2.A.16 MarketingHero (frontend-reactjs/src/components/marketing/MarketingHero.jsx)
            1. **Appraisal.** `useLandingValueProposition.js` now hydrates hero, stat, and pillar CTAs from the live `marketing_blocks` table—backed by the new `payload`/`surfaces` columns in `20250404120000_marketing_blocks_surfaces.js`—so Annex A16 copy flows straight from seeded data instead of local mocks.
            2. **Functionality.** `MarketingContentService.listMarketingBlocks` merges `types`, `variants`, and `surfaces`, filters through the expanded `MarketingBlockModel`, and delivers structured `items`/`metrics` arrays that the hook normalises via `data/marketing/valueProposition.js` before wiring analytics handlers in `MarketingHero`, `FeatureGrid`, and `StatsBar`.
            3. **Usefulness.** Home, campaign, and future landing surfaces can pass prefetched API payloads into these components to guarantee the same hero chips, proof metrics, and CTA routing that go-to-market teams track in Annex dashboards.
            4. **Redundancies.** Inline hero/stat constants were deleted in favour of the shared `VALUE_PROPOSITION_*` fallbacks plus the seeded blocks, eliminating divergent copy or analytics IDs between components.
            5. **Placeholders or Stubs.** Flow 5 imagery, Annex captions, and doc CTAs remain as fallback translations; dynamic CMS overrides will slot into the `marketing_blocks.payload` structure without rewriting component logic.
            6. **Duplicates.** `normaliseAction` now prefers backend-provided analytics identifiers and de-duplicates CTA tracking, keeping hero buttons, grid links, and stats actions in one telemetry vocabulary.
            7. **Improvements Needed.** Next pass should extend the same hook-driven hydration to `PageHero`, `Testimonials`, and `ConversionPanel`, and expose marketing plan CTA analytics to close the Annex instrumentation loop.
            8. **Styling.** Feature pillars keep Annex-compliant `rounded-3xl` cards, descriptive intros, and hover/focus states while drawing copy from seeds so design and marketing reviews match the documented mocks.
            9. **Efficiency Analysis.** Backend surface filtering trims unused blocks, memoised hero/pillar builders avoid recomputation, and `useMarketingContent` still accepts prefetched data to skip duplicate network calls.
            10. **Strengths to Keep.** `PrimaryHero`, `HeroMediaPanel`, and `HomeSection` composition remains intact; they simply receive hydrated props so responsive gradients and layouts stay battle-tested.
            11. **Weaknesses to Remove.** Pricing and monetisation ribbons still rely on legacy analytics wiring—flagged for follow-up once Annex A16 secondary CTA instrumentation lands.
            12. **Palette.** Chips, stats, and CTA badges continue using the established primary/emerald/slate token set to align with the Annex colour audit.
            13. **Layout.** Semantic `<article>` wrappers, intro copy, and 8/12/16 spacing enforce Annex density targets across breakpoints while the data now originates from the CMS-backed payload.
            14. **Text.** Seeded pillars and metrics preserve translation keys (e.g., `home.stats.*`) so localisation keeps working even though copy is hydrated from the database.
            15. **Spacing.** CTA clusters, stat helpers, and hero chip rows remain on the Annex rhythm, ensuring the new backend-fed content does not regress vertical density.
            16. **Shape.** Hero, stat, and pillar shells keep `rounded-3xl`/`rounded-2xl` treatments consistent with Annex silhouette guidance.
            17. **Effects.** Shared hover/focus-visible animations were untouched, so accessibility affordances persist while content now streams from the marketing dataset.
            18. **Thumbs.** Hero chips, stats, and helper copy still surface screenshot-ready proof points for Annex QA and stakeholder decks.
            19. **Media.** `ensureMedia` retains Flow 5 fallback video/image sets while respecting block-specific captions/alt text and the new `payload.surface` identifier used for analytics.
            20. **Buttons.** CTA normalisation enforces safe routing for `/register`, `/courses`, `/communities`, pricing docs, and sponsor briefs with analytics IDs seeded in the database for telemetry parity.
            21. **Interact.** Hero and pillar CTAs emit `marketing:hero_cta`/`marketing:value_prop_action` events tagged with slug- or payload-defined surfaces so dashboards can reconcile Annex funnel performance.
            22. **Missing.** Bring `Testimonials`, `ConversionPanel`, and pricing CTA components onto the shared hook, and extend backend analytics exports so Annex dashboards ingest conversion events automatically.
            23. **Design.** `valueProposition.js` now mirrors the seeded `marketing_blocks` payload schema, giving design ops and analytics a single Annex source of truth for hero, pillar, and stat content.
            24. **Clone.** Centralised hydration prevents future landing variants from cloning fallback arrays or instrumentation, keeping Annex updates maintainable even as new surfaces subscribe to the payload.
            25. **Framework.** The hook packages translation helpers, analytics context, and payload parsing so partner pages or locale variants can opt in with minimal wiring.
            26. **Checklist.** Apply the migration, reseed marketing data, verify `/content/marketing/blocks?surfaces=home` returns hero/pillar/stat payloads, confirm CTA analytics fire, and run `npm --prefix frontend-reactjs run lint` (requires `@eslint/js`).
            27. **Nav.** Hero analytics lean on seeded slugs/`payload.surface` IDs so go-to-market reporting maps CTA performance back to exact Annex A16 surfaces.
            28. **Release.** Deploy the migration, run `npm --workspace backend-nodejs run migrate && npm --workspace backend-nodejs run seed`, validate marketing APIs plus frontend hydration, and brief GTM teams with updated Annex screenshots and telemetry notes.
         - 2.A.17 MonetizationRibbon (frontend-reactjs/src/components/marketing/MonetizationRibbon.jsx)
         - 2.A.18 PlanHighlights (frontend-reactjs/src/components/marketing/PlanHighlights.jsx)
         - 2.A.19 PrimaryHero (frontend-reactjs/src/components/marketing/PrimaryHero.jsx)
         - 2.A.20 ProductPreviewTabs (frontend-reactjs/src/components/marketing/ProductPreviewTabs.jsx)
         - 2.A.21 Home (frontend-reactjs/src/pages/Home.jsx)
      - ✓ 2.B Content Marketing & Media Publishing — Annex A8 (Ads, Growth & Content Marketing)
        1. **Appraisal.** Marketing surfaces now span storage, APIs, and seeds: `AssetService.updateMetadata` persists Annex A8-safe showcase copy, `EbookService` exposes media-rich listings with encrypted sample links, and the marketing blog is populated via the bootstrap seed so Annex notes mirror live content.
        2. **Functionality.** `content_assets.metadata.custom` captures cover art, galleries, showcase CTAs, and feature flags; `EbookModel` reads the new `sample_download_url`/`audiobook_url` columns added in `20250308120000_course_ebook_media_enhancements.js`; `BlogService` hydrates seeded categories, tags, posts, and hero media for `Blog.jsx` and `BlogPost.jsx`.
        3. **Usefulness.** Editors preview curated galleries, CTA guardrails, and persona categories; learners download secure samples or stream audiobooks; growth teams land on Annex A8 campaign retros seeded in `backend-nodejs/seeds/001_bootstrap.js`, keeping UI, APIs, and docs aligned.
        4. **Redundancies.** Metadata templating lives in `AssetService`/`MarketingContentService`, replacing ad-hoc React state and ensuring slugs, CTA URLs, and gallery limits reuse the same sanitisation.
        5. **Placeholders or Stubs.** JSON-LD still exports twelve posts, but bootstrap seeds provide three authoritative articles with hero media; extend pagination before multi-page schema support ships.
        6. **Duplicate Functions.** CTA enforcement, HTTPS sanitisation, and gallery normalisation run through `AssetService.updateMetadata` and `ContentController.metadataUpdateSchema`, eliminating parallel helpers in React.
        7. **Improvements Needed.** Next workstream should wire gallery analytics, ingest backend search telemetry for blog filters, and add DRM-aware offline caching for ebook samples.
        8. **Styling Improvements.** Seeded metadata keeps Annex A8 tints, rounded geometry, and cover art consistent without manual placeholders in the editor or previews.
        9. **Efficiency Analysis.** Server filters (`EbookModel.listMarketplace`, `BlogService.listPublicPosts`) enforce paging/search; React memoises counts and summaries so marketing dashboards stay responsive.
        10. **Strengths to Keep.** Marketplace cards, CTA variants, and JSON-LD exports retain annex storytelling hierarchy while the seeds keep growth, ops, and governance narratives synchronised across channels.
        11. **Weaknesses to Remove.** Offline downloads and analytics event wiring remain backlog; add queue-backed watermark issuance and CTA tracking in a follow-up.
        12. **Palette.** Counters, CTA pills, and gallery cards reuse slate/primary palettes; seeded metadata ensures hero art honours the colour guidance in `user_experience.md` Annex B2.
        13. **CSS, Orientation & Placement.** Responsive layouts stay intact—metadata just hydrates showcase slots and galleries, so no bespoke breakpoints were introduced.
        14. **Text.** Microcopy (“HTTPS required”, “Encrypted sample”) follows Annex tone while referencing seeded campaign summaries so compliance teams review consistent copy.
        15. **Spacing.** Editor forms and preview shells keep the 8/16/24 rhythm; seeded cards preserve breathing room around badges and CTA clusters.
        16. **Shape.** Rounded-3xl shells and pill controls remain consistent; metadata-driven galleries reuse the same geometry for imagery and video.
        17. **Effects.** Hover/focus-visible states continue to surface on pagination, CTA, and theme toggles even with seeded previews attached.
        18. **Thumbs.** Gallery media sanitise through HTTPS constraints and seeded assets, ensuring marketing screenshots drop cleanly into annex decks.
        19. **Media.** Ebook cards surface cover art, sample PDFs, and audiobook MP3s; blog posts hydrate hero images from `blog_media`, keeping Annex content visual.
        20. **Buttons.** CTA, pagination, and theme buttons expose `aria-pressed`/`aria-disabled`; seeded posts include campaign CTAs so analytics can stitch funnels.
        21. **Interact.** Avatar cropper nudge keys, blog result summaries (`aria-live`), and reader progress broadcasts remain intact, now backed by seeded data for QA.
        22. **Missing.** Add analytics IDs for gallery actions, taxonomy tooltips for blog categories, and offline sample packaging for enterprise annex sign-off.
        23. **Design.** Metadata, blog schema, and ebook listings mirror Annex diagrams so marketing, growth, and analytics stakeholders share a single canonical schema.
        24. **Clone.** Shared sanitisation/storage helpers prevent Flutter, SDK, or future CMS integrations from re-implementing Annex A8 rules.
        25. **Framework.** `usePageMetadata`, `EbookService`, and `BlogService` provide consistent SEO, analytics, and schema outputs across marketing shells.
        26. **Checklist.** Regression verifies metadata persistence, secure CTA disabling, gallery caps, sample download signatures, blog schema output, and `npm --prefix frontend-reactjs run lint`.
        27. **Nav.** Blog filters, marketing CTAs, and reader headers share seeded copy (“Review controls”, “Read article”), improving crawlability and annex navigation parity.
        28. **Release.** Ship alongside marketing analytics updates, rerun `npm --prefix backend-nodejs run seed`, refresh SEO snapshots, and brief content ops on the new sample/audiobook links plus seeded campaign posts.
         - 2.B.1 EbookReader (frontend-reactjs/src/components/content/EbookReader.jsx)
         - 2.B.2 MaterialMetadataEditor (frontend-reactjs/src/components/content/MaterialMetadataEditor.jsx)
         - 2.B.3 AvatarCropper (frontend-reactjs/src/components/media/AvatarCropper.jsx)
         - 2.B.4 Blog (frontend-reactjs/src/pages/Blog.jsx)
         - 2.B.5 BlogPost (frontend-reactjs/src/pages/BlogPost.jsx)
         - 2.B.6 Ebooks (frontend-reactjs/src/pages/Ebooks.jsx)
      - ✓ 2.C Company, Careers & Legal Transparency — Annex C7 (Legal & Compliance Centre)
        1. **Appraisal.** About, Privacy, and Terms pages now couple frontend navigation with backend Annex artefacts: seeds populate governance contracts, vendor assessments, review cycles, and transparency narratives while the pages surface structured data, anchors, and corporate disclosures.
        2. **Functionality.** `About.jsx` renders organisation schema plus seeded corporate facts; `Privacy.jsx` and `Terms.jsx` reuse IntersectionObserver navigation tied to slugified headings, while backend tables (`governance_contracts`, `governance_roadmap_communications`, `consent_policies`) seeded in `001_bootstrap.js` power trust-centre APIs and dashboard parity.
        3. **Usefulness.** Visitors review registration numbers, ICO references, policy CTAs, and seeded legal updates without leaving the hub; governance ops can cross-check disclosures against `/governance/overview` API output that mirrors the same seeds.
        4. **Redundancies.** Anchor slugging, metadata hooks, and disclosure grids share helpers; backend governance repositories dedupe policy summaries so web pages, dashboards, and docs reference one canonical source.
        5. **Placeholders or Stubs.** Trust centre link still points to `/docs/trust-centre`; swap once the dedicated hub ships and extend seeds with additional transparency reports.
        6. **Duplicate Functions.** Section IDs derive from headings once; governance metrics hydrate via `NavigationAnnexRepository`, avoiding duplicate enumeration across legal surfaces.
        7. **Improvements Needed.** Automate governance summaries from compliance tooling, expose PDF exports for policies, and localise disclosures for non-UK tenants.
        8. **Styling Improvements.** Corporate cards, navigation rails, and disclosure lists reuse slate neutrals, seeded hero art, and Annex chip tokens, maintaining calm legal visuals.
        9. **Efficiency Analysis.** Memoised section arrays and observers avoid repeated slug computation; backend seeds keep governance endpoints fast by denormalising status counts.
        10. **Strengths to Keep.** Terms anchor detection, support channel grids, and compliance messaging remain while benefitting from seeded legal narratives and shared metadata.
        11. **Weaknesses to Remove.** Printable exports and live changelog feeds remain backlog; wire them to governance APIs next release.
        12. **Palette.** Legal disclosures lean on white/sand neutrals with primary accent chips; seeded CTAs ensure consistent colour references.
        13. **CSS, Orientation & Placement.** Two-column grids collapse gracefully, chip navigation wraps on wide breakpoints, and dropdown selectors serve mobile as documented in the UX playbook.
        14. **Text.** Copy emphasises accountability (“Review controls”, “Access governance artefacts”) and is backed by seeded governance data so metrics stay accurate.
        15. **Spacing.** Cards and nav rails respect 24px gutters and 12px interior gaps, keeping dense legal content readable.
        16. **Shape.** Rounded-3xl shells, pill chips, and CTAs align with Edulure geometry, reinforcing brand trust.
        17. **Effects.** Focus-visible outlines and hover states remain active on navigation pills and CTAs, aiding keyboard review.
        18. **Thumbs.** Disclosure cards and CTA badges remain screenshot-ready; seeds guarantee values for corporate facts and roadmap metrics.
        19. **Media.** Organisation schema, brand info, and corporate logos feed crawlers while backend governance seeds keep transparency dashboards in sync.
        20. **Buttons.** Primary CTAs point to privacy, terms, and trust artefacts; nav chips honour reduced-motion preferences and accessible names.
        21. **Interact.** Mobile select, chip navigation, hash updates, and observer highlights keep compliance journeys keyboard and screen-reader friendly; seeded governance data powers the same anchors used in dashboards.
        22. **Missing.** Add downloadable audit evidence (SOC, ISO), vacancy feeds, and trust-centre hub once additional APIs land.
        23. **Design.** Structured data, nav scaffolding, and governance metrics mirror Annex C7 diagrams so legal, marketing, and support teams share context.
        24. **Clone.** Slugified IDs and metadata helpers prevent future legal pages (cookie notice, accessibility statement) from rewriting anchor or SEO plumbing.
        25. **Framework.** `usePageMetadata`, governance repositories, and consent/annex seeds centralise analytics tagging for compliance views.
        26. **Checklist.** Verify anchor navigation, observer highlighting, corporate fact accuracy, policy CTA destinations, `/governance` API snapshots, and run `npm --prefix frontend-reactjs run lint`.
        27. **Nav.** Privacy chips, About CTAs, Terms anchor lists, and governance APIs expose consistent navigation cues, keeping Annex C7 wayfinding uniform.
        28. **Release.** Coordinate with legal/compliance leads, rerun seeds, refresh SEO snapshots, update governance documentation, and announce Annex C7 upgrades alongside the trust-centre roadmap.
         - 2.C.1 About (frontend-reactjs/src/pages/About.jsx)
         - 2.C.2 Privacy (frontend-reactjs/src/pages/Privacy.jsx)
         - 2.C.3 Terms (frontend-reactjs/src/pages/Terms.jsx)
      - ✓ 3.A Authentication & Invitation Pages — Annex A17 (Authentication & Setup), Annex C5 (Integration Credential Invitations)
        1. **Appraisal.** Login, Register, InstructorRegister, and IntegrationCredentialInvite now emit structured analytics covering views, submissions, multi-factor prompts, marketing toggles, and invite refreshes through new helpers in `frontend-reactjs/src/lib/analytics.js`, giving Annex A17/C5 the end-to-end telemetry demanded by `user_experience.md`.
        2. **Functionality.** `trackAuthView`, `trackAuthAttempt`, `trackAuthAutoSave`, and `trackIntegrationInviteSubmit` wrap the shared `trackEvent` dispatcher so each surface reports granular metadata (role, provider, expiry, invite cadence) without duplicating analytics wiring, while the backend `integration_api_key_invites.documentation_url` column, model mappers, and invite service sanitizers now propagate integration runbook links through admin CRUD, partner submissions, and audit trails in lockstep with migrations and seeds.
        3. **Usefulness.** Support, security, and marketing teams can now trace conversion funnels—e.g., how often 2FA is required, who enables marketing updates, when credential invites expire, and which runbooks partners reference—directly from event payloads captured during live user journeys and from the persisted documentation URLs attached to invite records.
        4. **Redundancies.** Inline `window.analytics.track` calls or bespoke CustomEvent payloads were avoided entirely; every page leans on the central helpers so event schemas remain consistent and easy to evolve.
        5. **Placeholders or Stubs.** Event metadata leaves hooks for downstream enrichment (e.g., eventual resend-code telemetry, credential decline reasons) while keeping current payloads privacy-safe by omitting PII like email addresses, and the new documentation URL plumbing now populates production-ready links in migrations, models, and seeds so partners aren’t pointed at stubbed guides.
        6. **Duplicate Functions.** Social sign-on, auto-save, and submit handlers reuse the same helper exports so we no longer risk drifting analytics strings between login, register, and instructor registration.
        7. **Improvements Needed.** Follow-up work should extend instrumentation to password resets and invite declines, plus plumb backend acknowledgements so analytics can confirm vault ingestion rather than assuming the POST succeeded.
        8. **Styling Improvements.** Login’s two-factor field now receives deterministic focus via `document.getElementById(TWO_FACTOR_FIELD_ID)` when the challenge appears, reinforcing Annex A17’s keyboard accessibility guidance without altering visual styling, and the invite summary card surfaces a design-system compliant documentation link row so Annex C5 runbook references render with accessible focus states.
        9. **Efficiency Analysis.** Effects bail early when states are idle (`autoSaveStatus === 'idle'`, `!showTwoFactorInput`, `status === 'submitting'`), ensuring analytics dispatches fire only on meaningful transitions rather than on every render.
        10. **Strengths to Keep.** Auto-save cadence, onboarding progress meters, and invite security checklists remain intact—the code simply instruments their lifecycle so existing UX strengths are measured instead of reworked, and the invite documentation runbooks travel from migrations through seeds to UI without bespoke glue code.
        11. **Weaknesses to Remove.** Login still lacks a resend-code CTA and integration invites cannot yet log decline reasons; events now flag those gaps (e.g., `two_factor_required`, `expired`) so they stay visible on the roadmap.
        12. **Palette.** No new colour tokens were introduced—the analytics additions are invisible to users and respect the current neutral, primary, and alert palettes described in `user_experience.md`.
        13. **Layout.** Two-factor inputs and credential forms keep their established grid layouts; the only DOM addition is an `id` attribute for focus targeting, preserving Annex spacing and placement rules.
        14. **Text.** Event metadata mirrors the existing microcopy (`reason: 'required' | 'invalid' | 'setup_required'`, marketing toggle states), enabling content designers to correlate copy performance with behavioural data without rewriting the UI.
        15. **Spacing.** Auto-save status tracking observes the same debounce timers (1.2 s) and progress bars, so there are no spacing regressions while still surfacing when drafts persist or error out.
        16. **Shape.** Switches, pill buttons, and textarea shells remain unchanged; instrumentation simply records their toggled state (`next`, `enabled`) to uphold Annex shape consistency.
        17. **Effects.** Focus management for the 2FA field and invite refresh actions now pair with analytics hooks, validating Annex guidance around immediate feedback when security challenges or vault refreshes fire.
        18. **Thumbs.** Social provider buttons log `auth:social_redirect` events so growth teams can quantify icon usage (Google, Apple, Facebook, LinkedIn) without reworking the existing SVG glyphs.
        19. **Media.** Credential invites report documentation link health (`missing`, `warning`, `unknown`) through status events sourced from the persisted `documentation_url`, complementing the security checklist without introducing new imagery.
        20. **Buttons.** Submit, refresh, toggle, and CTA handlers all emit outcome-specific analytics (`attempt`, `success`, `failure`), aligning Annex release checklists that mandate auditable credential handoffs.
        21. **Interact.** Marketing opt-in, role selection, two-factor switches, and manual code reveals each dispatch `auth:interaction` events so behavioural analysis can confirm Annex onboarding hypotheses.
        22. **Missing.** Next iteration should add decline-path instrumentation and hook resend endpoints so Annex C5 coverage extends beyond successful submissions.
        23. **Design.** Event names match Annex taxonomy (`two_factor_*`, `integration_invite:*`), ensuring design reviews and analytics dashboards speak the same language when auditing authentication touchpoints.
        24. **Clone.** By centralising auth and invite analytics helpers, future identity surfaces can plug into the same API instead of cloning bespoke logging logic per page.
        25. **Framework.** The analytics layer continues to dispatch DOM CustomEvents and push to `dataLayer`, meaning existing observer scripts automatically inherit the richer metadata.
        26. **Checklist.** QA should verify event payloads via the `edulure:analytics` CustomEvent listener, confirm two-factor focus on prompt, and exercise invite refresh/submit flows for both success and failure paths.
        27. **Nav.** Cross-links between login↔register and invite refresh flows now emit navigation events, so Annex A17 setup journeys can be audited alongside Annex C5 invite completions.
        28. **Release.** Promote by validating analytics payloads in staging, ensuring dashboards capture the new event keys, and briefing ops/security teams on the fresh telemetry before shipping.
         - 3.A.1 InstructorRegister (frontend-reactjs/src/pages/InstructorRegister.jsx)
         - 3.A.2 IntegrationCredentialInvite (frontend-reactjs/src/pages/IntegrationCredentialInvite.jsx)
         - 3.A.3 Login (frontend-reactjs/src/pages/Login.jsx)
         - 3.A.4 Register (frontend-reactjs/src/pages/Register.jsx)
      - ✓ 3.B Setup & Pre-launch Handoffs — Annex A2 (Learner Onboarding & Feedback)
        1. **Appraisal.** `SetupOrchestratorService` now blends environment templating with learner onboarding telemetry, so Annex A2 prep covers infrastructure inputs, invitation handoffs, and feedback loops in a single control room.
        2. **Functionality.** `SetupController.buildSnapshot()` awaits `LearnerOnboardingInsightsService.summarise()` alongside `describeDefaults()`, and the service now normalises invite counts across accepted/pending/expired/revoked states, computes acceptance rates, and reuses a shared Knex connection so REST and SSE payloads stay in sync while remaining unit-testable.
        3. **Usefulness.** `frontend-reactjs/src/pages/Setup.jsx` renders a “Learner onboarding & feedback” card that surfaces total responses, thirty-day trends, acceptance rates, pending/expired/revoked invite tallies, persona leaders, and survey cadence, giving operators a launch checklist without leaving the installer.
        4. **Redundancies.** Hard-coded `DEFAULT_*` env placeholders now defer to `.env.example` values via `readEnvTemplate`, eliminating drift between documentation, installer defaults, and committed templates.
        5. **Placeholders.** Bootstrap seeds now populate accepted, pending, expired, and revoked invites plus recent `learner.survey.submitted` telemetry so Annex messaging mirrors production schemas; empty tables still return zeroed counts when environments start fresh.
        6. **Duplicates.** Cached defaults prevent repeated file reads during SSE polling, and persona breakdowns are computed once per summary to avoid redundant array allocations.
        7. **Improvements Needed.** Extend the insights service with configurable windows, rolling averages, and cohort slices so Annex A2 can compare pilot tenants or highlight funnel drop-offs automatically.
        8. **Styling.** The readiness card adopts the same `rounded-3xl` shell, slate neutrals, and uppercase kickers as the rest of the setup aside, keeping Annex visuals consistent with user_experience.md spacing rules.
        9. **Efficiency.** SQL counts, invite status aggregation, and a capped 200-row survey sample keep `LearnerOnboardingInsightsService` lightweight while caching env defaults avoids re-reading template files on every heartbeat.
        10. **Strengths.** SSE listeners now receive merged state snapshots, so live installer runs broadcast task progress and onboarding deltas without manual refreshes.
        11. **Weaknesses.** Insights currently assume a 30-day lookback; expose configuration hooks or auto-tune the window when installers run in long-lived staging environments.
        12. **Palette.** Metrics rely on existing primary, emerald, and slate tokens—no new colour primitives were introduced, respecting Annex palette governance.
        13. **Layout.** The card’s `sm:grid-cols-2 lg:grid-cols-3` metric grid and stacked persona/survey panels follow the 8px/16px rhythm, keeping dense analytics scannable on narrow and wide viewports alike.
        14. **Text.** Microcopy (“Track sign-up momentum…”, “Finalise community pairings…”) speaks directly to Annex A2 goals, aligning tone with the onboarding handbook.
        15. **Spacing.** Utility classes (`gap-4`, `mt-4`, `space-y-1`) maintain the documented breathing room between metrics, badges, and helper copy.
        16. **Shape.** Metrics, persona chips, and action buttons continue using `rounded-full` and `rounded-2xl` geometry so the installer mirrors other dashboard shells.
        17. **Effects.** Buttons, toggles, and preset pills retain focus-visible rings and hover treatments, ensuring accessibility cues remain intact after the insights injection.
        18. **Thumbs.** The existing `WrenchScrewdriverIcon` header tag and hero badges stay in place, reinforcing the “guided installation” motif alongside the new analytics.
        19. **Media.** Readiness metrics remain typographic—no new charts or imagery were added, preserving the lightweight nature of the aside until richer telemetry ships.
        20. **Buttons.** `Run installer`, preset selectors, and task toggles now coexist with the insights card without overlap, and new data does not introduce conflicting CTAs.
        21. **Interact.** Task checkboxes, preset pills, and status controls remain keyboard accessible while the readiness card exposes static summaries that respect screen-reader order.
        22. **Missing.** Future revisions should expose alert thresholds (e.g., “<5 survey responses”) so Annex A2 can flag readiness blockers proactively.
        23. **Design.** Insights reuse Annex A2 vocabulary (responses, invites, persona focus) and derive directly from `LearnerOnboardingResponseModel` + telemetry tables, with seeds/migrations (`backend-nodejs/seeds/001_bootstrap.js`, `backend-nodejs/migrations/20250325103000_marketing_enrollment_flow.js`) aligned so database schema, models, and UI copy stay consistent.
        24. **Clone.** A single summariser powers both REST and SSE responses, preventing each consumer from reimplementing onboarding analytics logic.
        25. **Framework.** `LearnerOnboardingInsightsService` lives alongside other backend services, making it trivial for dashboards or docs generators to consume the same readiness snapshot.
        26. **Checklist.** QA should validate env defaults hydrate from `.env.example`, confirm invite status counts and acceptance rates against seed data (including expired/revoked cases), run `backend-nodejs/test/learnerOnboardingInsightsService.test.js`, and observe SSE updates when survey events are ingested.
        27. **Nav.** Positioning the readiness card at the top of the installer sidebar keeps onboarding KPIs visible before operators trigger tasks or inspect logs.
        28. **Release.** Ship by reseeding onboarding/survey tables, running `npm --prefix backend-nodejs run db:install` where needed, validating `/api/v1/setup/status`, and updating Annex A2 docs with the new readiness snapshot and seed telemetry batch references.
         - 3.B.1 Setup (frontend-reactjs/src/pages/Setup.jsx)
      - ✓ 3.C Identity Forms & Auth Components — Annex A17 (Authentication & Setup)
        1. **Appraisal.** Identity primitives now foreground accessible progress indicators, provider context, and gated steppers so Annex A17 flows stay trustworthy across learner and instructor journeys.
        2. **Functionality.** `AuthForm.jsx` adopts `useId`-driven aria wiring, `SocialSignOn.jsx` emits provider metadata with descriptions/badges, and `FormStepper.jsx` recognises disabled steps while labelling each button with a status attribute.
        3. **Usefulness.** Social sign-on rows expose badges, helper copy, and disabled reasons, guiding operators when SSO is unavailable or restricted to specific pilots.
        4. **Redundancies.** Progress maths (`Math.round`) is centralised via `progressPercent`, preventing duplicate calculations and ensuring width + text stay in sync.
        5. **Placeholders.** Provider lists still fall back to the baked-in Google/Apple/Facebook/LinkedIn definitions until CMS-managed metadata lands.
        6. **Duplicates.** Step status reporting lives in `data-step-status`, letting analytics or CSS consumers share the same semantics instead of bespoke switch statements per form.
        7. **Improvements Needed.** Wire marketing CMS content into provider descriptions and badges so Annex A17 can localise security messaging without code edits.
        8. **Styling.** Social buttons keep branded colour tokens while shifting to a column layout for copy, matching the marketing/auth aesthetic documented in user_experience.md.
        9. **Efficiency.** Disabled handlers short-circuit `onSelect`, `aria` IDs are generated once, and steppers avoid redundant clicks on locked steps.
        10. **Strengths.** `aria-live` banners, progressbars, and disabled metadata ensure assistive tech announces validation errors, successes, and onboarding progress immediately.
        11. **Weaknesses.** Social icons remain static SVGs; future Annex iterations could request dynamic assets from configuration to reflect tenant branding.
        12. **Palette.** Buttons continue using provider brand hues plus shared slate/primary neutrals, keeping authentication visuals on-brand.
        13. **Layout.** The multi-line label/description stack inside social buttons ensures long helper copy wraps gracefully without breaking alignment.
        14. **Text.** Disabled reason strings (“Sign in disabled by your administrator”) and onboarding copy stay concise and action-oriented per Annex tone guidance.
        15. **Spacing.** Updated components rely on `gap-3`, `mt-1`, and `space-y-6` to maintain comfortable spacing between progress meters, alerts, and form fields.
        16. **Shape.** Authentication CTAs preserve their `rounded-full` silhouette, matching the rest of the Annex A17 design system.
        17. **Effects.** Focus-visible rings, hover transitions, and pressed states remain intact even with the richer metadata layout.
        18. **Thumbs.** Provider SVGs continue to sit within consistent `h-10 w-10` frames, delivering recognisable identity anchors for users scanning options.
        19. **Media.** No new imagery is introduced; textual and icon treatments cover all messaging to keep forms lightweight.
        20. **Buttons.** `onSelect` now passes the provider object alongside the ID so analytics and routing layers can access badges or disablement reasons without additional lookups.
        21. **Interact.** Stepper buttons respect `disabled` props and surface `aria-disabled` while forms broadcast error/success via `aria-live` regions for screen readers.
        22. **Missing.** Pending work includes mapping provider copy to localisation bundles and emitting analytics events when stepper statuses change.
        23. **Design.** Copy and semantics mirror Annex A17’s “secure, supportive” voice, with progress labels (“Onboarding progress”) and support footers referencing legal copy.
        24. **Clone.** Centralised ID generation and status attributes avoid bespoke aria wiring in each auth surface, reducing future duplication risk.
        25. **Framework.** Additional provider fields (badge/description/disabledReason) keep the API extensible for enterprise tenants without touching downstream components.
        26. **Checklist.** QA should confirm progress bars announce values, error banners read aloud, disabled sign-on buttons resist clicks, and stepper analytics register state transitions.
        27. **Nav.** `data-step-status` primes instrumentation and styling so navigation breadcrumbs, analytics, and Annex documentation stay in sync.
        28. **Release.** Coordinate with marketing to populate provider metadata, run accessibility smoke tests, and document new props in Annex A17 handbooks before deployment.
         - 3.C.1 AuthCard (frontend-reactjs/src/components/AuthCard.jsx)
         - 3.C.2 SocialSignOn (frontend-reactjs/src/components/SocialSignOn.jsx)
         - 3.C.3 AuthForm (frontend-reactjs/src/components/auth/AuthForm.jsx)
         - 3.C.4 FormStepper (frontend-reactjs/src/components/forms/FormStepper.jsx)
      - ✓ 4.A Dashboard Overview & Switcher Pages — Annex A18 (Learner Dashboard & Insights)
        1. **Appraisal.** Bookings, ebooks, affiliate, assessments, inbox, and course viewer routes now boot through `useDashboardSurface.js` plus `DashboardSwitcherHeader.jsx`, ensuring every overview inherits the user_experience.md guidance on shared scaffolding, metadata slots, and hook-based analytics.
        2. **Functionality.** Each switcher calls `trackView` on mount, wires `trackAction` to important CTAs, and exposes a consistent `refresh` handler so stale flags, pending counters, and role-driven copy hydrate from the surface registry without per-screen plumbing.
        3. **Usefulness.** `DashboardSwitcherHeader` renders last-synced timestamps, service health, offline tones, and micro-metrics sourced from `surface.metrics`, letting operators prioritise follow-up before digging into tabular modules or modals.
        4. **Redundancies.** Legacy hero blocks, ad-hoc analytics, and bespoke timestamp ribbons were removed; the hook now owns surface hydration, thereby aligning with user_experience.md mandates against duplicate state orchestration.
        5. **Placeholders.** Role fallbacks (e.g., when an admin views learner-only screens) route through `DashboardStateMessage.jsx` with assistive text and badge props so empty shells remain instructive rather than silent gaps.
        6. **Duplicates.** `CourseViewer.jsx`, `DashboardInbox.jsx`, and each switcher import the shared header, keeping typography, badge geometry, and CTA placement identical to the canonical layout enumerated in user_experience.md Section 4.
        7. **Improvements Needed.** Course viewer still lacks downloadable lesson packs and collaborative note-taking; those Annex follow-ons will plug into the hook-provided `surface` context to broadcast new states once delivered.
        8. **Styling.** Header status chips honour the emerald/amber/rose gradient pairings described in user_experience.md, pairing tone tokens with `dashboard-pill` classes so urgency semantics stay consistent across surfaces and navigation.
        9. **Efficiency.** `CourseViewer.jsx` memoises sanitised workspace URLs via the `URL` constructor and resolves Learnspace origins once per course, preventing repeated string parsing on re-renders.
        10. **Strengths.** `handleRefresh` couples dashboard `refresh` with `useLearnerProgress` reloads, keeping lesson progress charts, next-step prompts, and header timestamps in sync—mirroring the “paired data refresh” pattern in user_experience.md.
        11. **Weaknesses.** Inbox moderation still performs linear filtering for large queues; pagination and saved filters remain backlog tasks even though the foundation now tracks view/load metrics for future optimisation.
        12. **Palette.** Headers inherit the muted slate shell background while primary signal chips lean on the success/notice/alert scheme mandated by user_experience.md, matching AppSidebar badges and Field Service statuses.
        13. **Layout.** Responsive gap utilities guarantee header metrics, action rows, and stream indicators maintain the documented 24px rhythm from mobile through desktop breakpoints.
        14. **Text.** CTA copy references explicit actions (“Refresh dashboards”, “Switch to an eligible Learnspace”, “Launch Learnspace securely”), aligning with the UX tone matrix instead of generic “Try again” verbiage.
        15. **Spacing.** Header clusters lock to 8px/16px spacing increments, which prevents jagged stacking when metric pills wrap and honours the density rulesets captured in user_experience.md Annex A18.
        16. **Shape.** Pill buttons (“Launch Learnspace”, “Back to courses”) reuse dashboard pill tokens with focus-visible outlines, satisfying the rounded geometry guidelines and accessible focus cues documented for dashboards.
        17. **Effects.** Streaming states light up with pulse indicators and skeleton shimmer classes, giving near-real-time feedback as inbox threads or learner progress hydrate without diverging from shared animation tokens.
        18. **Thumbs.** `DashboardInbox.jsx` surfaces offline/online badges, uses `DashboardActionFeedback` to persist toasts, and pipes realtime connection events to the header so operations staff remain informed as mandated for Annex C1.
        19. **Media.** Course viewer launches validated workspace URLs in new tabs with `noopener` guards and rejects unsafe schemes, closing the security gap noted in user_experience.md while preserving keyboard focus hints.
        20. **Buttons.** Shared `refresh` callbacks and `trackAction('launch_workspace')` instrumentation ensure telemetry remains consistent and deduplicated across switcher buttons and inline CTAs.
        21. **Interact.** Inbox composer shortcuts (Enter to send) and thread filters remain intact while now reporting actions through the hook, providing analytics coverage without sacrificing expected behaviour.
        22. **Missing.** Affiliate and assessments switchers still await deeper analytics/insights cards; their layout now reserves header metric slots and tone-aware CTAs for upcoming Annex C6/C3 stories.
        23. **Design.** The header stacks hero copy, status chips, and metric pills in a single reusable component so forthcoming surfaces (communities, operations) can plug in without recalculating layout maths.
        24. **Clone.** `useDashboardSurface` centralises stale detection, metrics, and analytics wiring keyed on IDs (`bookings`, `ebooks`, `course-viewer`, `inbox`), eliminating the clone risk flagged in user_experience.md.
        25. **Framework.** `lib/analytics.js` exports `trackDashboardSurfaceAction` and related helpers so launches, refreshes, and modal interactions flow through a unified analytics surface schema.
        26. **Checklist.** Regression passes should cover Learnspace launch guards, offline/online inbox copy, stale badge transitions, and role-based switcher gating, followed by the targeted Vitest suite once tooling is available.
        27. **Nav.** Sidebar badges and drawer navigation now consume the same surface registry data (via `statusByRoute`), making navigation chips and header metrics agree on queue counts and service tone.
        28. **Release.** Shipping Annex A18 requires migrating straggling dashboard routes to the hook/header duo, executing `npm --prefix frontend-reactjs test -- DashboardSwitches`, and refreshing enablement docs with the shared surface contract.
         - 4.A.1 CourseViewer (frontend-reactjs/src/pages/dashboard/CourseViewer.jsx)
         - 4.A.2 DashboardAffiliate (frontend-reactjs/src/pages/dashboard/DashboardAffiliate.jsx)
         - 4.A.3 DashboardAssessments (frontend-reactjs/src/pages/dashboard/DashboardAssessments.jsx)
         - 4.A.4 DashboardBookingsSwitch (frontend-reactjs/src/pages/dashboard/DashboardBookingsSwitch.jsx)
         - 4.A.5 DashboardEbooksSwitch (frontend-reactjs/src/pages/dashboard/DashboardEbooksSwitch.jsx)
         - 4.A.6 DashboardInbox (frontend-reactjs/src/pages/dashboard/DashboardInbox.jsx)
      - ✓ 4.B Dashboard Shared Components & Feedback — Annex C1/C3/C6
        1. **Appraisal.** Shared dashboard primitives now broadcast surface-aware state: navigation badges, state messages, learner metrics, skeletons, and service banners reuse the same tone maps and assistive slots outlined in user_experience.md for learner support, field ops, and admin governance.
        2. **Functionality.** `DashboardStateMessage.jsx` accepts badges, dual actions, assistive text, and timestamp metadata, allowing Annex C1/C3/C6 screens to present loading/error/empty states without wrapping components.
        3. **Usefulness.** `FieldServiceConflictModal.jsx` integrates `useDashboardSurface('bookings')`, exposing dispatch health, pending counts, last synced timestamps, and refresh triggers while tracking reload/apply telemetry events.
        4. **Redundancies.** `DashboardNavigation.jsx` and `AppSidebar.jsx` share a single badge resolver and tone translator so collapsed menus no longer render `[object Object]` and status copy stays in sync with header chips.
        5. **Placeholders.** `SkeletonPanel.jsx` now offers a streaming pulse, `aria-live` hints, and a `variant` prop so inline loaders can swap between block and row treatments without duplicating markup.
        6. **Duplicates.** `LearnerProgressCard.jsx`, `MetricCard.jsx`, and `VerificationStatusCard.jsx` consume common tone maps and status normalisers, removing hand-coded colour strings and aligning copy with the persona-specific lexicon from user_experience.md.
        7. **Improvements Needed.** Verification cards still await SLA countdown timers and reviewer avatars; the new assistive slots and metadata footer keep space reserved for those upcoming Annex C6 experiences.
        8. **Styling.** Status chips honour `info/notice/success/alert/critical` semantics while pill buttons adopt shared `dashboard-pill`/`dashboard-primary-pill` classes, locking typography and contrast to accessibility thresholds.
        9. **Efficiency.** Skeleton shimmer reuses a consolidated keyframe so the bundle no longer ships per-component animations, satisfying performance pointers from user_experience.md.
        10. **Strengths.** `ServiceHealthBanner.jsx` handles loading/error/success with skeleton placeholders, tone-aware alerts, and retry CTAs, ensuring operators retain context even during transient outages.
        11. **Weaknesses.** Metric cards still lack sparkline context; data hooks must expose richer time-series before chart overlays land.
        12. **Styling & Colour Review.** Progress, verification, and conflict surfaces now use unified badges, ensuring cross-module colour pairings pass WCAG contrast while matching the doc’s brand tokens.
        13. **CSS, Orientation & Placement.** Responsive padding/gap tokens keep cards, modals, and banners aligned on 16px grid lines so modules slot into dashboards without manual overrides.
        14. **Text Analysis.** Assistive text fields provide concise coaching (“Review backlog before dispatching crews”, “Learners notified via email”) without overwhelming headings, in line with the microcopy guidance.
        15. **Spacing.** Metadata footers in cards and messages follow a 12px stack to keep timestamps legible but unobtrusive, per the spacing heuristics in user_experience.md.
        16. **Shape.** Buttons, badges, and skeletons stick to rounded-full or rounded-xl radii, preserving the geometric system across dashboards, modals, and inline loaders.
        17. **Effects.** Streaming toggles (pulse dots, shimmer overlays) share CSS classes, ensuring consistent reduced-motion handling and preventing flicker when cards enter realtime states.
        18. **Thumbs.** Conflict modal service chips and action buttons give dispatchers instant readouts on platform health before deciding between reload, merge, or continue editing paths.
        19. **Media.** Verification tables retain secure document metadata while tone-aware badges highlight manual review, reducing confusion for compliance leads vetting uploads.
        20. **Buttons.** `DashboardStateMessage` supports primary/secondary/link variants, enabling surfaces to present retry, escalation, or external link CTAs with consistent styling and analytics instrumentation.
        21. **Interact.** Navigation badges include screen-reader text when the sidebar collapses, keeping status changes accessible per user_experience.md’s interaction accessibility checklist.
        22. **Missing.** `AnalyticsSummaryCard.jsx` scaffolding awaits live recommendation feeds; the component now supports streaming badges and assistive copy to plug in when data lands.
        23. **Design.** Badge/tone helpers make admin setup alerts, learner support states, and field service modals plug-and-play without redefining palette logic each time.
        24. **Clone.** `SkeletonPanel` variants and `StatusChip` helpers prevent repeated inline loader markup or ad-hoc badges, tackling the duplication risks flagged during the UX audit.
        25. **Framework.** Analytics helpers expose `trackDashboardSurfaceAction`, enabling modals, launch buttons, and conflict resolution flows to report actions uniformly across Annex surfaces.
        26. **Checklist.** QA should confirm sidebar badges display labels, conflict modal tracking fires on reload/apply, verification chips reflect backend states, and skeleton shimmer respects reduced motion preferences.
        27. **Nav.** App sidebar renders tone-aware badges with optional health tooltips, mirroring the surface registry so navigation becomes a live operations panel rather than static links.
        28. **Release.** Roll Annex C1/C3/C6 updates by aligning Storybook stories with new props, running `npm --prefix frontend-reactjs test -- DashboardSwitches` (pending Vitest install), and updating enablement docs to document badge/skeleton utilities.
         - 4.B.1 AnalyticsSummaryCard (frontend-reactjs/src/components/dashboard/AnalyticsSummaryCard.jsx)
         - 4.B.2 DashboardActionFeedback (frontend-reactjs/src/components/dashboard/DashboardActionFeedback.jsx)
         - 4.B.3 DashboardNavigation (frontend-reactjs/src/components/dashboard/DashboardNavigation.jsx)
         - 4.B.4 DashboardStateMessage (frontend-reactjs/src/components/dashboard/DashboardStateMessage.jsx)
         - 4.B.5 FieldServiceConflictModal (frontend-reactjs/src/components/dashboard/FieldServiceConflictModal.jsx)
         - 4.B.6 LearnerProgressCard (frontend-reactjs/src/components/dashboard/LearnerProgressCard.jsx)
         - 4.B.7 MetricCard (frontend-reactjs/src/components/dashboard/MetricCard.jsx)
         - 4.B.8 VerificationStatusCard (frontend-reactjs/src/components/dashboard/VerificationStatusCard.jsx)
         - 4.B.9 SkeletonPanel (frontend-reactjs/src/components/loaders/SkeletonPanel.jsx)
         - 4.B.10 ServiceHealthBanner (frontend-reactjs/src/components/status/ServiceHealthBanner.jsx)
      - ✓ 5.A Learner Dashboard Pages — Annex A18 (Learner Dashboard), Annex C1 (Learner Support Workspace)
         - 5.A.1 LearnerBookings (frontend-reactjs/src/pages/dashboard/LearnerBookings.jsx)
         - 5.A.2 LearnerCommunities (frontend-reactjs/src/pages/dashboard/LearnerCommunities.jsx)
         - 5.A.3 LearnerCommunityChats (frontend-reactjs/src/pages/dashboard/LearnerCommunityChats.jsx)
         - 5.A.4 LearnerCourses (frontend-reactjs/src/pages/dashboard/LearnerCourses.jsx)
         - 5.A.5 LearnerEbooks (frontend-reactjs/src/pages/dashboard/LearnerEbooks.jsx)
         - 5.A.6 LearnerFinancial (frontend-reactjs/src/pages/dashboard/LearnerFinancial.jsx)
         - 5.A.7 LearnerLiveClasses (frontend-reactjs/src/pages/dashboard/LearnerLiveClasses.jsx)
         - 5.A.8 LearnerSettings (frontend-reactjs/src/pages/dashboard/LearnerSettings.jsx)
         - 5.A.9 LearnerSocial (frontend-reactjs/src/pages/dashboard/LearnerSocial.jsx)
         - 5.A.10 LearnerSupport (frontend-reactjs/src/pages/dashboard/LearnerSupport.jsx)
            1. **Appraise.** `LearnerSupport.jsx` now elevates SLA visibility with semantic badges while `useLearnerSupportCases.js` deduplicates conversation messages and attachments, aligning Annex C1’s learner workspace with the Annex A18 dashboard expectations.
            2. **Function.** `getSlaBadgeDescriptor`, `formatSlaDeadline`, and the enriched hook fields (`slaStatus`, `assignmentLabel`, `slaMinutesRemaining`) power list chips, stats grids, and SLA checkpoint summaries while the composer pipes payloads through `createSupportTicket`, `replyToSupportTicket`, and `closeSupportTicket` APIs.
            3. **Usefulness.** Knowledge suggestions render inline cards sourced from `knowledgeSuggestions` while `DashboardService.getDashboardForUser` now hydrates the `knowledgeBase` array with top-ranked `support_articles` via `SupportKnowledgeBaseService.searchArticles`, ensuring the annex playbooks reflect live data alongside escalation breadcrumbs and tooltips.
            4. **Redundant.** Message normalisation now merges duplicate IDs and attachments, eliminating the prior UI jitter when optimistic updates appended the same payload twice.
            5. **Placeholders.** Contact fallbacks still reference placeholder `href="#"` channels when the API omits live links, and voice-call scheduling remains disabled until telephony integrations land.
            6. **Duplicates.** SLA formatting logic lives solely in `LearnerSupport.jsx`; future work should move the badge descriptor into the shared dashboard formatting utilities to avoid duplicating countdown text across widgets.
            7. **Improvements Needed.** Wire SLA status to live websocket push events, expose agent avatars beside `assignmentLabel`, and allow learners to acknowledge knowledge suggestions so analytics can log deflection rates.
            8. **Styling Improvements.** Case cards, SLA chips, and the escalation timeline now reuse dashboard pill tokens (`rounded-3xl`, semantic badge palettes) so the workspace matches the broader learner shell.
            9. **Efficiency Analysis.** Message deduplication, attachment merging, and memoised case enrichments reduce render thrash when large transcripts stream in, keeping the timeline performant even for legacy tickets.
            10. **Strengths to Keep.** Dual-column layout with sticky metadata, inline composer, and knowledge guidance retains the single-pane-of-glass experience Annex C1 champions.
            11. **Weaknesses to Remove.** Offline replies still queue locally without surfacing retry state per message; exposing retry chips in `MessageTimeline` would prevent silent failures.
            12. **Palette.** SLA and priority badges now adopt the same semantic colours (`bg-emerald-100`, `bg-rose-100`) used across the dashboard, ensuring brand and accessibility parity.
            13. **Layout.** The detail grid adds a sixth cell for SLA checkpoints and the escalation panel stacks beneath the timeline, balancing information density without forcing horizontal scroll.
            14. **Text.** Badge tooltips (“SLA on track”, “Breached …”), timeline copy, and knowledge card excerpts sharpen copywriting so learners see action-first phrasing.
            15. **Spacing.** `space-y` utilities and the refreshed 3-column knowledge list maintain comfortable rhythm between panels while keeping the reply composer within reach.
            16. **Shape.** Rounded-3xl shells, dashed borders on empty states, and subtle timeline markers keep the support hub visually consistent with other learner modules.
            17. **Effects.** Badge hover/focus states inherit dashboard focus outlines, and the escalation feed avoids animations, respecting reduced-motion preferences baked into the layout.
            18. **Thumbs.** Suggested playbooks now highlight read-time chips so learners can quickly judge effort before opening a guide.
            19. **Media.** Attachment metadata merges duplicates and retains names/sizes, preserving context when learners upload logs or transcripts.
            20. **Buttons.** Pill buttons (`dashboard-primary-pill`, focus-visible outlines) now complement SLA chips, while archive/reopen controls remain accessible and keyboard friendly.
            21. **Interact.** `data-sla-status` attributes on list badges and detail chips open the door for automated filtering, and tooltip strings keep screen readers informed without extra markup.
            22. **Missing.** Auto-refresh on SLA countdowns still relies on manual refresh; consider `setInterval` or React Query subscriptions to avoid stale timers.
            23. **Design.** `getSlaBadgeDescriptor` centralises badge labelling, keeping copy cohesive as new SLA states emerge.
            24. **Clone.** Merge logic prevents duplicate message rendering, replacing the previous per-component dedupe implementations with a single hook-level source of truth.
            25. **Framework.** Enhancements lean on existing persistent storage (`usePersistentCollection`) and context boundaries, so no new architectural primitives were required.
            26. **Checklist.** Regression suite should cover badge rendering, knowledge suggestion linking, escalation timeline ordering, and message dedupe, alongside running `npm --prefix frontend-reactjs run lint`.
            27. **Nav.** SLA chips, escalation breadcrumbs, and knowledge cards extend Annex A18 navigation cues by labelling contexts (“Case detail”, “Suggested playbooks”) for quick scanning.
            28. **Release.** Roll out behind the support workspace feature flag, capture telemetry on SLA badge engagement, and document the changes in Annex C1 plus the learner dashboard release notes.
      - ✓ 5.B Learner Deep-dive Modules — Annex C1 (Learner Support)
         - 5.B.1 LearnerUpcomingSection (frontend-reactjs/src/pages/dashboard/learner/sections/LearnerUpcomingSection.jsx)
            1. **Appraise.** `LearnerUpcomingSection.jsx` now adds urgency descriptors, semantic badges, and action-aware styling so the Annex C1 commitments rail mirrors Annex A18 priorities.
            2. **Function.** `resolveActionVariant`, `resolveLinkTarget`, and urgency data attributes drive tailored CTA treatments, external link handling, and analytics-friendly tagging.
            3. **Usefulness.** Learners see contextual copy (“Upcoming soon”, “Scheduled and on track”) alongside host, date, relative labels, and urgency descriptors with analytics-friendly `data-urgency` attributes driven by `normaliseUpcoming` in `LearnerOverview.jsx`.
            4. **Redundant.** Button rendering no longer duplicates target/rel logic—the helper centralises external link decisions while preserving mailto/self navigation.
            5. **Placeholders.** Disabled CTAs still render greyed buttons when no actionable `href` exists; future revisions could hide them entirely or surface alternative prompts.
            6. **Duplicates.** Urgency text aligns with the shared dashboard urgency vocabulary; remaining duplication inside `LearnerOverview.normaliseUpcoming` can move to a reusable formatter later.
            7. **Improvements Needed.** Pipe through locations or delivery modes, extend badge variants for assessment deadlines, and offer iCal exports when schedules include calendar links.
            8. **Styling Improvements.** Focus-visible outlines, variant-specific colours, and consistent rounded-full buttons bring the module in step with the dashboard shell.
            9. **Efficiency Analysis.** External link resolution pre-parses URLs once per render, preventing runtime errors from malformed links while keeping the component lightweight.
            10. **Strengths to Keep.** Compact cards with urgency chips and relative timestamps maintain scannability while layering richer context.
            11. **Weaknesses to Remove.** The component still lacks inline actions for rescheduling or joining waitlists—hooks to bookings/live-class APIs would complete the experience.
            12. **Palette.** Action variants use emerald/indigo/primary shades consistent with learner CTAs, and urgency badges keep rose/amber/emerald semantics for accessibility.
            13. **Layout.** Card spacing remains vertical for clarity, and the new descriptor line avoids crowding by using subdued slate tones.
            14. **Text.** CTA aria-labels mention the event title, supporting assistive tech, while urgency descriptors avoid jargon and stay action-focused.
            15. **Spacing.** Extra `mt-1` spacing between host and urgency copy keeps the hierarchy readable even on small screens.
            16. **Shape.** Rounded-2xl shells and pill badges continue the learner dashboard motif, reinforcing familiarity across modules.
            17. **Effects.** Hover elevation (`hover:-translate-y-0.5`, `hover:shadow-md`) and focus outlines echo the rest of the dashboard without introducing new motion patterns.
            18. **Thumbs.** Cards remain thumb-friendly on touch devices thanks to generous padding and full-width button targets.
            19. **Media.** While still text-first, structured descriptors ensure upcoming live sessions can later embed icons without layout shifts.
            20. **Buttons.** Variant-aware CTAs adjust colour and outline tokens to match action types, and disabled states now render with neutral greys to signal inactivity.
            21. **Interact.** `data-urgency` attributes and descriptive aria labels give analytics and accessibility layers hooks for filtering and narration.
            22. **Missing.** Countdown timers remain static per render; consider injecting live countdown hooks for high-priority sessions.
            23. **Design.** Helper functions encapsulate variant logic, letting designers extend CTA palettes without touching JSX internals.
            24. **Clone.** Shared functions avoid repeating external-link guards across other learner widgets, reducing drift when rules evolve.
            25. **Framework.** Enhancements stay within the existing component boundary—no new dependencies beyond `clsx` were required.
            26. **Checklist.** Regression checks: verify urgency badges render across statuses, ensure external links respect targets, and confirm disabled CTAs show grey styling.
            27. **Nav.** Urgency descriptors plus aria-labelled buttons tie into Annex A18 navigation heuristics, making commitments easy to skim by keyboard or screen reader.
            28. **Release.** Bundle with learner dashboard refresh, announce urgency badge upgrades in Annex C1 notes, and monitor click-through on join/review CTA variants post-launch.
      - ✓ 6.A Instructor Dashboard Pages — Annex A19 (Courses & Library), Annex C4 (Live Classes & Tutoring Operations)
         - 6.A.1 InstructorCommunityChats (frontend-reactjs/src/pages/dashboard/InstructorCommunityChats.jsx)
         - 6.A.2 InstructorCommunityCreate (frontend-reactjs/src/pages/dashboard/InstructorCommunityCreate.jsx)
         - 6.A.3 InstructorCommunityManage (frontend-reactjs/src/pages/dashboard/InstructorCommunityManage.jsx)
         - 6.A.4 InstructorCommunityOperations (frontend-reactjs/src/pages/dashboard/InstructorCommunityOperations.jsx)
         - 6.A.5 InstructorCommunityPodcasts (frontend-reactjs/src/pages/dashboard/InstructorCommunityPodcasts.jsx)
         - 6.A.6 InstructorCommunityWebinars (frontend-reactjs/src/pages/dashboard/InstructorCommunityWebinars.jsx)
         - 6.A.7 InstructorEbooks (frontend-reactjs/src/pages/dashboard/InstructorEbooks.jsx)
         - 6.A.8 InstructorGrowth (frontend-reactjs/src/pages/dashboard/InstructorGrowth.jsx)
         - 6.A.9 InstructorLiveClasses (frontend-reactjs/src/pages/dashboard/InstructorLiveClasses.jsx)
         - 6.A.10 InstructorPricing (frontend-reactjs/src/pages/dashboard/InstructorPricing.jsx)
         - 6.A.11 InstructorProjects (frontend-reactjs/src/pages/dashboard/InstructorProjects.jsx)
         - 6.A.12 InstructorServiceSuite (frontend-reactjs/src/pages/dashboard/InstructorServiceSuite.jsx)
         - 6.A.13 InstructorTutorBookings (frontend-reactjs/src/pages/dashboard/InstructorTutorBookings.jsx)
         - 6.A.14 InstructorTutorManagement (frontend-reactjs/src/pages/dashboard/InstructorTutorManagement.jsx)
         - 6.A.15 InstructorTutorSchedule (frontend-reactjs/src/pages/dashboard/InstructorTutorSchedule.jsx)
        1. **Appraisal.** Instructor live operations now surface timezone-aware schedules, resource runbooks, and calendar exports (`pages/dashboard/InstructorLiveClasses.jsx`, `pages/dashboard/InstructorTutorBookings.jsx`) so Annex A19’s course orchestration narrative and Annex C4’s tutoring control room describe real workflows rather than placeholders.
        2. **Functionality.** The live classroom console introduces a scheduling preference banner with timezone selector, session cards render dynamic prep/resource links, alerts, and readiness summaries, while tutor bookings add segment filters, CSV exports, and .ics calendar generation built from `utils/calendar.js` helpers.
        3. **Logic Usefulness.** `resolveRelativeTime` and `formatDateTime` ensure countdowns, SLA deadlines, and mentor hand-offs reference the same clocks, giving instructors and coordinators reliable go-live windows and reducing manual reconciliation during high-volume cohorts.
        4. **Redundancies.** Shared calendar utilities eliminate bespoke ICS builders inside dashboard pages and reuse a single filename normaliser for both tutoring and live class exports, cutting duplicated DOM download logic and aligning Annex documentation with the new helper.
        5. **Placeholders.** Static “Schedule TBC” and generic escalation copy are replaced by real alerts (`data.escalations`) and enriched prep links sourced from session payloads, so Annex callouts can cite working join, recording, and material links instead of TODO notes.
        6. **Duplicate Functions.** Pipeline segmentation, CSV quoting, and relative time formatting moved into memoised helpers, removing repeated map/filter logic throughout the bookings workspace and aligning with the reusable `downloadCalendarEvents` workflow.
        7. **Improvements Needed.** Next iteration should stream export feedback through a toast service, hydrate booking analytics cards with backend SLA deltas, and thread timezone selection through `ScheduleGrid`’s event filters to keep grid/tooling parity.
        8. **Styling Improvements.** New rounded-pill controls, amber escalation banners, and prep/resource stacks re-use dashboard typography/spacing tokens, matching the user_experience.md palette guidance for Annex A19 hero modules and Annex C4 risk panels.
        9. **Efficiency Analysis.** `useMemo` caches for filtered pipeline/confirmed lists avoid recomputation across renders, while export handlers short-circuit when no records exist, keeping dashboard interactions smooth even as routing queues grow.
        10. **Strengths to Keep.** Keep the action feedback pattern, shared scheduling grid, and modular session cards—they now support richer data without sacrificing readability, fulfilling Annex expectations for cross-surface consistency.
        11. **Weaknesses to Remove.** Tutor routing still depends on manual refresh after CSV/ICS exports; wire server-triggered rehydration and consider batching notifications to curb duplicate SLA alerts across channels.
        12. **Styling & Colour Review.** Accessibility-checked badge palettes (emerald/amber/rose) extend to alerts, support routing, and escalations, ensuring Annex references to readiness states stay in sync with live colour tokens.
        13. **CSS, Orientation & Placement.** Responsive stacking for pipeline controls and live hand-off cards keeps key operations above the fold on tablet while preserving the two-column analytics grid on desktop.
        14. **Text Analysis.** Inline copy now emphasises action-first phrasing (“Export pipeline CSV”, “Live classroom hand-off”) mirroring user_experience.md tone guidance, and prep tooltips stay under 140 characters for quick scanning.
        15. **Change Checklist Tracker.** Add regression checks for timezone selector persistence, export success/failure messaging, CSV header integrity, and ICS start/end validation before shipping future instructor dashboard updates.
        16. **Full Upgrade Plan & Release Steps.** Phase 1 rolls the shared calendar utility + timezone selector, Phase 2 expands pipeline analytics and tutoring telemetry, Phase 3 integrates backend-driven alerts/escalations, and Phase 4 publishes Annex A19/C4 documentation updates alongside release comms.
        17. **Data Integration.** `DashboardService.buildInstructorDashboard` now emits richer tutor booking objects (pipeline, confirmed, stats) sourced from `TutorBookingModel`, reconciling SLA deadlines, segment metadata, and revenue minor units with the seed dataset so Annex C4 references live production-like payloads.
        18. **Live Session Surface.** Instructor live classroom records expose structured `resources`, `support`, `alerts`, `pricing`, and sanitized join/check-in links, mirroring the reinforced metadata stored in `live_classrooms` and `live_classroom_registrations` migrations for Annex A19 documentation.
        19. **Notification Fidelity.** Tutor alerts include titles, details, deadlines, and CTA routing directly from backend orchestration, matching the scheduler UI requirements and ensuring tutoring SLAs align with operational runbooks.
        20. **Seed Synchronisation.** `backend-nodejs/seeds/001_bootstrap.js` seeds tutor bookings and live classrooms with expanded metadata (segments, preferred slots, whiteboard notes, support contacts, pricing) to guarantee demo environments reflect the new dashboard schema.
        21. **Future Proofing.** Revenue roll-ups and waitlist risk alerts derive from model metadata so future Annex updates can plug into the same pipeline without duplicating frontend heuristics.
      - ✓ 6.B Instructor Deep-dive Modules
         - 6.B.1 CourseLifecyclePlanner (frontend-reactjs/src/pages/dashboard/instructor/courseCreation/CourseLifecyclePlanner.jsx)
         - 6.B.2 CourseLibraryTable (frontend-reactjs/src/pages/dashboard/instructor/courseLibrary/CourseLibraryTable.jsx)
         - 6.B.3 CourseManagementHeader (frontend-reactjs/src/pages/dashboard/instructor/courseManagement/CourseManagementHeader.jsx)
         - 6.B.4 CreationStudioSummary (frontend-reactjs/src/pages/dashboard/instructor/creationStudio/CreationStudioSummary.jsx)
         - 6.B.5 PricingRevenueMix (frontend-reactjs/src/pages/dashboard/instructor/pricing/PricingRevenueMix.jsx)
         - 6.B.6 InstructorMetricsSection (frontend-reactjs/src/pages/dashboard/instructor/sections/InstructorMetricsSection.jsx)
        1. **Appraise.** Launch governance finally mirrors Annex B2—`CourseLifecyclePlanner.jsx` now frames target launch, owner, confidence, and risk posture cards ahead of the orchestration grid, while `CourseManagementHeader.jsx` and `CourseLibraryTable.jsx` surface portfolio rollups, format filters, and runtime summaries so instructors see operational readiness the moment they land on the workspace.
        2. **Functionality.** Launch objects hydrate checklist progress, risk signals, and follow-up dispatch events (`edulure:lifecycle-checklist`, `edulure:lifecycle-risk`); library assets gain filterable format chips, duration parsing, and engagement averages; portfolio headers expose action buttons for briefs, calendars, and collaborator invites alongside real-time cohort counts.
        3. **Logic Usefulness.** Normalisers in each module coerce optional data into safe defaults—launch windows, recurring revenue categories, proctoring metadata, and recommendation history all render without downstream callers having to pre-shape payloads, keeping Annex narratives aligned with live telemetry.
        4. **Redundancies.** Runtime stats (checklist completion, recurring share, format counts, word counts) centralise in each component’s memoised helpers, eliminating the bespoke percentage math and table fallbacks previously duplicated across dashboards and documentation outlines.
        5. **Placeholders.** Launch history still depends on future backend diffs for adoption rates and SLA streaming; Pricing mixes await raw revenue totals to complement the percentage share messaging, and Instructor metrics leave advanced segmentation (by modality or cohort) for a follow-on Annex push.
        6. **Interactions.** All new CTAs broadcast analytics-friendly data attributes (`data-course-id`, `data-module-id`, `data-lesson-id`) while dispatching custom events for lifecycle, library, and metric taps—giving instrumentation a single source of truth for instructor workflow telemetry.
        7. **Styling.** Readiness scorecards, filter pills, recurring share banners, and interactive metric tiles all lean on dashboard token classes (`rounded-3xl`, semantic pill palettes, hover/translate transitions), matching the visual language captured in `user_experience.md` for Annex B2 storytelling.
        8. **Efficiency.** `useMemo` now backs library filtering, recurring share calculations, launch statistics, and creation mix histories; short-circuit guards keep expensive loops from running when props are empty, and numeric coercion clamps values between 0–100 before painting bars or targets.
        9. **Accessibility.** Progress bars announce target markers via `sr-only` spans, lifecycle tables provide semantic headers, and interactive metric tiles honour focus rings so keyboard journeys through Annex B2 artefacts stay compliant.
        10. **Data Integration.** Launch checklists, risk logs, recommendation histories, and pricing streams are now hydrated directly by `DashboardService.buildCourseWorkspace`, which pulls from the new `course_blueprints`, `course_launches`, checklist, signal, review, refresher, asset, catalogue, drip, and mobile experience tables introduced in the Annex B2 migration and bootstrap seed; when data is absent the frontend still renders explanatory defaults so pre-release tenants retain a coherent narrative.
        11. **Improvements Needed.** Wire live websocket pushes for checklist completion, teach the revenue mix card about absolute currency totals, and expose filtering presets on the library table to match Annex filter mock-ups (top viewed, newest, compliance hold).
        12. **Strengths to Keep.** Keep the orchestration two-column split, the creation studio manifest cards, the pill-based CTA patterns, and the metrics grid—each now carries deeper data without sacrificing the clarity that instructors praised during the Annex B2 audit.
        13. **Telemetry.** New `data-*` hooks and custom events mean Annex instrumentation guides can quote exact event names when mapping funnels from launch planning to asset audits.
        14. **Release Notes.** Document the new props (`launch`, `recommendationsMeta.history`, `streams[].trend`, `metrics[].id`, `summary.activeCohorts`) and updated event contracts in Annex B2’s change log so downstream consumers know to hydrate the additional fields.
        15. **Risks.** Recurring share assumes percentage inputs; ensure backend normalises floats to avoid >100% bars, and confirm adoption rates in history arrays arrive as decimals to keep the adoption chip from displaying `NaN%`.
      - ✓ 6.C Creation Studio & Course Tooling
         - 6.C.1 AssessmentQuickView (frontend-reactjs/src/components/course/AssessmentQuickView.jsx)
         - 6.C.2 CourseCard (frontend-reactjs/src/components/course/CourseCard.jsx)
         - 6.C.3 CourseModuleNavigator (frontend-reactjs/src/components/course/CourseModuleNavigator.jsx)
         - 6.C.4 CourseProgressBar (frontend-reactjs/src/components/course/CourseProgressBar.jsx)
         - 6.C.5 BlockEditor (frontend-reactjs/src/components/creation/BlockEditor.jsx)
        1. **Appraise.** Annex A3’s creation studio brief now spans proctoring metadata, launch compliance, syndication reach, risk callouts, and block statistics—the quick view, course card, navigator, progress bar, and block editor collectively paint the production state a reviewer expects.
        2. **Functionality.** Assessments accept proctoring, passing score, attempt cap, and availability windows; course cards render launch windows, compliance tone chips, upcoming live touchpoints, and syndication channels; module navigator cards highlight risks and emit lesson/module identifiers; progress bars can display target markers; the block editor tallies block counts and word counts inline.
        3. **Logic Usefulness.** Defensive parsing handles duration strings, launch windows, history timestamps, and risk arrays so Annex mock data, seeded content, or live payloads all funnel through a single formatting path without runtime errors.
        4. **Interactions.** Action CTAs embed `data-course-id` attributes while navigators attach `data-lesson-id` and `data-module-id`; assessment buttons expose `data-assessment-id`, and block editor statistics update as authors add, move, or remove blocks—giving UX writers and analysts deterministic hooks.
        5. **Styling.** New readiness cards, risk pills, and timeline chips inherit dashboard typography and semantic palettes; target markers ride within the progress bar without breaking gradient fills; block editor footers reuse the rounded shell aesthetic captured in `user_experience.md`.
        6. **Accessibility.** Additional copy (window labels, compliance tooltips, risk lists) stays within semantic lists or sr-only spans so screen readers hear context; focus styles remain intact thanks to button wrappers adding `focus:ring` tokens around interactive metric cards.
        7. **Efficiency.** Memoised calculations cover duration parsing, word counts, and module thumbnails; guard clauses collapse empty arrays quickly, and slices limit list/risk renders to manageable counts for smoother Annex demos.
        8. **Telemetry.** Added data attributes and consistent event dispatch patterns mirror instrumentation guidelines from Annex A3, letting analytics discriminate between assessment launches, course CTAs, module risk acknowledgements, and block editing sessions.
        9. **Data Contracts.** Updated PropTypes document the new optional fields (`passingScore`, `proctoring`, `launchWindow`, `syndication.channels`, `module.risks`, `CourseProgressBar.target`), and `DashboardService.buildCourseWorkspace` now publishes matching arrays from the expanded lifecycle tables so API providers and creation tooling share the richer Annex A3 payloads without divergence.
        10. **Improvements Needed.** Next pass should expose translation strings for proctoring/provider labels, surface validation when risk lists overflow beyond three items, and allow progress bars to broadcast custom target tooltips for Annex walkthroughs.
        11. **Strengths to Keep.** Preserve the single-card course overview, the granular module preview layout, and the drag-free block editor—they now surface deeper insights without sacrificing the clarity and approachability Annex reviewers called out.
        12. **Release Notes.** Flag the new analytics hooks and optional props in creation studio docs so QA, CX, and documentation teams update Annex screenshots and instrumentation plans in tandem.
      - 7.A Admin & Operator Experience Pages
         - 7.A.1 Admin (frontend-reactjs/src/pages/Admin.jsx)
         - 7.A.2 Analytics (frontend-reactjs/src/pages/Analytics.jsx)
         - 7.A.3 AdminPolicyHubSection (frontend-reactjs/src/pages/admin/sections/AdminPolicyHubSection.jsx)
         - 7.A.4 AdminControl (frontend-reactjs/src/pages/dashboard/AdminControl.jsx)
         - 7.A.5 AdminGovernance (frontend-reactjs/src/pages/dashboard/AdminGovernance.jsx)
         - 7.A.6 AdminIntegrations (frontend-reactjs/src/pages/dashboard/AdminIntegrations.jsx)
         - 7.A.7 AdminOperator (frontend-reactjs/src/pages/dashboard/AdminOperator.jsx)
      - 7.B Administration & Moderation Components
         - 7.B.1 AdminStats (frontend-reactjs/src/components/AdminStats.jsx)
         - 7.B.2 AdminSummaryCard (frontend-reactjs/src/components/admin/AdminSummaryCard.jsx)
         - 7.B.3 ModerationChecklistForm (frontend-reactjs/src/components/moderation/ModerationChecklistForm.jsx)
         - 7.B.4 ModerationMediaPreview (frontend-reactjs/src/components/moderation/ModerationMediaPreview.jsx)
         - 7.B.5 ModerationQueue (frontend-reactjs/src/components/moderation/ModerationQueue.jsx)
      - ✓ 8.A Public Community & Social Pages — Annex A20 (Community & Events)
        1. **Appraise.** `pages/Communities.jsx` and `pages/Feed.jsx` now expose persona-aligned directories, analytics, and community health scorecards driven by real component logic instead of placeholder copy, matching the Annex A20 expectations captured in `user_experience.md`.
        2. **Function.** Persona extraction, momentum scoring, and last-activity signals are centralised in `frontend-reactjs/src/utils/communityPersona.js` and mirrored by `backend-nodejs/src/utils/communityPersona.js`; `CommunityService.serializeCommunity` now emits persona summaries and momentum scores that `Communities.jsx` consumes in the discovery grid while `Feed.jsx` renders a complementary “Community health” panel beside the live feed.
        3. **Usefulness.** Operators can slice communities by persona, access model, and momentum, see counts for open vs. NDA-gated cohorts, and jump directly into high-momentum chapters from both the discovery grid and the feed leaderboard with backend-aligned stats (`CommunityModel.listByUserWithStats`, `CommunityModel.getStats`).
        4. **Redundancies.** Prior hard-coded persona badges, repetitive list filters, and bespoke activity heuristics were replaced with shared helpers (`extractCommunityPersonas`, `computeCommunityEngagementScore`, `resolveLastActivity`) and backend normalisers so both pages, APIs, and seeds stay in sync.
        5. **Placeholders.** Community APIs now surface personas, access models, and NDA flags sourced from `backend-nodejs/seeds/001_bootstrap.js`; remaining work tracks publishing analytics events and feature-flag toggles before exposing public directory presets.
        6. **Duplicates.** Directory filtering and momentum ranking now reuse the same helper module, eliminating duplicated `toLowerCase`/`includes` checks that previously lived in multiple components.
        7. **Improvements Needed.** Wire analytics events for persona filter usage, expose pagination for the discovery grid, and replace heuristic monetisation labels with canonical pricing tier data when the billing API publishes it.
        8. **Styling Improvements.** Filter controls, persona pills, and scorecards inherit the community palette tokens (`bg-primary/10`, `rounded-3xl`), aligning with the typography and spacing prescribed in the UX audit while remaining Tailwind-compatible.
        9. **Efficiency Analysis.** `useMemo` caches filtered directories, persona summaries, and momentum rankings, ensuring the expanded directory does not recompute on every keystroke and keeping the feed sidebar reactive without extra renders.
        10. **Strengths to Keep.** The rich hero content, classroom tabs, and moderation tooling introduced previously remain untouched while gaining persona-aware discovery wrappers and cross-page consistency.
        11. **Weaknesses to Remove.** Momentum metrics currently derive from aggregate counts; elevate to rolling-window analytics exports and expose billing tier metadata once monetisation services publish canonical payloads.
        12. **Palette.** New chips and summary cards reuse slate neutrals and primary accents, preventing a separate colour system from emerging around persona filters and analytics callouts.
        13. **Layout.** Responsive grids (`sm:grid-cols-2`, `xl:grid-cols-3`) keep cards evenly distributed on desktop while stacking gracefully on mobile, matching the directory layout guidelines in `user_experience.md`.
        14. **Text.** Microcopy now explains why filters exist (“Use these lenses to scope live programming…”) and provides actionable empty states, improving comprehension without duplicating marketing language.
        15. **Spacing.** Directory and sidebar cards follow the 8px rhythm (p-4/p-5 gaps) and maintain consistent pill spacing, resolving the cramped alignment noted in the audit.
        16. **Shape.** All cards adopt `rounded-3xl`/`rounded-2xl` radii so the persona layer mirrors existing community hero treatments, avoiding mismatched silhouettes.
        17. **Effects.** Hover/focus transitions (lift on hover, focus-visible outlines) signal interactivity for the new directory buttons and leaderboard rows, supporting accessibility and keyboard navigation.
        18. **Thumbs.** Persona summary chips surface top personas at a glance, giving community managers screenshot-ready highlights for release notes and stakeholder reviews.
        19. **Media.** Discovery cards reference resource counts and live signals, preparing the ground for future thumbnail previews without altering current asset pipelines.
        20. **Buttons.** Selecting a community now routes through consistent pill buttons (directory grid, health leaderboard, TopBar switcher) that all share focus states and analytics context.
        21. **Interact.** Directory filters update in real time, search debounces through `useMemo`, and leaderboard buttons call `setSelectedCommunity`, letting power users pivot between personas and specific hubs without page reloads.
        22. **Missing.** Pending work includes wiring analytics events for persona filter usage, adding saved filter presets per persona, and exposing aggregate charts for trend deltas beyond the top four personas.
        23. **Design.** `communityPersona.js` captures the persona taxonomy defined in Annex A20 so future components (moderation, onboarding) can consume the same normalised vocabulary.
        24. **Clone.** Shared helpers prevent feed, dashboard, and marketing surfaces from reinventing persona parsing or momentum scoring, containing future duplication risks.
        25. **Framework.** Document the persona heuristics and scoring formula in the community enablement playbook so backend and analytics teams can align when shipping official metrics.
        26. **Checklist.** QA should cover persona filter combinations, NDA gating, momentum ordering, and leaderboard navigation before regression sign-off, plus verify empty states when APIs return zero communities.
        27. **Nav.** Discovery cards and leaderboard buttons feed directly into `setSelectedCommunity`, preserving the canonical routing path so breadcrumbs, CRUD panels, and metadata headers stay in sync.
        28. **Release.** Ship alongside backend persona metadata, update Annex A20 narratives, capture screenshots of the new discovery grid and health sidebar for stakeholder decks, and brief community ops on the new filters.
         - 8.A.1 Communities (frontend-reactjs/src/pages/Communities.jsx)
         - 8.A.2 Feed (frontend-reactjs/src/pages/Feed.jsx)
         - 8.A.3 communityPersona (frontend-reactjs/src/utils/communityPersona.js)
      - 8.B Dashboard Community & Messaging Suites
         - 8.B.1 CommunitySafety (frontend-reactjs/src/pages/dashboard/community/CommunitySafety.jsx)
         - 8.B.2 ChannelSidebar (frontend-reactjs/src/pages/dashboard/community/instructorChats/ChannelSidebar.jsx)
         - 8.B.3 EventPlanner (frontend-reactjs/src/pages/dashboard/community/instructorChats/EventPlanner.jsx)
         - 8.B.4 MessageComposer (frontend-reactjs/src/pages/dashboard/community/instructorChats/MessageComposer.jsx)
         - 8.B.5 MessageTimeline (frontend-reactjs/src/pages/dashboard/community/instructorChats/MessageTimeline.jsx)
         - 8.B.6 PresencePanel (frontend-reactjs/src/pages/dashboard/community/instructorChats/PresencePanel.jsx)
         - 8.B.7 ResourceLibraryPanel (frontend-reactjs/src/pages/dashboard/community/instructorChats/ResourceLibraryPanel.jsx)
         - 8.B.8 RoleManagementPanel (frontend-reactjs/src/pages/dashboard/community/instructorChats/RoleManagementPanel.jsx)
         - 8.B.9 channelMetadata (frontend-reactjs/src/pages/dashboard/community/instructorChats/channelMetadata.js)
         - 8.B.10 useCommunityChatWorkspace (frontend-reactjs/src/pages/dashboard/community/instructorChats/useCommunityChatWorkspace.js)
      - 8.C Community, Feed & Social Components
         - 8.C.1 CommunityAboutPanel (frontend-reactjs/src/components/community/CommunityAboutPanel.jsx)
         - 8.C.2 CommunityChatModule (frontend-reactjs/src/components/community/CommunityChatModule.jsx)
         - 8.C.3 CommunityCrudManager (frontend-reactjs/src/components/community/CommunityCrudManager.jsx)
         - 8.C.4 CommunityEventSchedule (frontend-reactjs/src/components/community/CommunityEventSchedule.jsx)
         - 8.C.5 CommunityInteractiveSuite (frontend-reactjs/src/components/community/CommunityInteractiveSuite.jsx)
         - 8.C.6 CommunityMap (frontend-reactjs/src/components/community/CommunityMap.jsx)
         - 8.C.7 CommunityMemberDirectory (frontend-reactjs/src/components/community/CommunityMemberDirectory.jsx)
         - 8.C.8 CommunityMembersManager (frontend-reactjs/src/components/community/CommunityMembersManager.jsx)
         - 8.C.9 CommunityResourceEditor (frontend-reactjs/src/components/community/CommunityResourceEditor.jsx)
         - 8.C.10 CommunityResourceLibrary (frontend-reactjs/src/components/community/CommunityResourceLibrary.jsx)
         - 8.C.11 Composer (frontend-reactjs/src/components/feed/Composer.jsx)
         - 8.C.12 FeedItemCard (frontend-reactjs/src/components/feed/FeedItemCard.jsx)
         - 8.C.13 FeedList (frontend-reactjs/src/components/feed/FeedList.jsx)
         - 8.C.14 SponsoredCard (frontend-reactjs/src/components/feed/SponsoredCard.jsx)
      - ✓ 9.A Course, Library & Discovery Pages
         - 9.A.1 ContentLibrary (frontend-reactjs/src/pages/ContentLibrary.jsx)
            1. **Appraisal.** Library discovery now leans on `learningClusters.js` so Annex A19 audiences (Operations, Growth, Enablement, Community, General) surface contextual summaries instead of a static asset grid, while maintaining the multi-tab layout documented in `user_experience.md`.
            2. **Functionality.** `ContentLibrary.jsx` wires `useLearningClusters` to hydrate filter chips, card metadata, and analytics payloads; the shared `LearningClusterSummary` component renders hero cards that count assets per cluster and supplies top exemplars pulled from the memoized heuristics, while the backend `content_assets.cluster_key` column and metadata update flow persist the computed cluster so API consumers, migrations, and cache snapshots remain in sync.
            3. **Usefulness.** Persona-led filtering collapses marketing, course, and resource tiles into annex-ready groupings so success teams, operators, and community managers all see inventory aligned to their workflows with direct deep links.
            4. **Redundancies.** Cluster detection centralises logic previously duplicated between library highlights and admin catalogue views, eliminating bespoke keyword checks inside each table section.
            5. **Placeholders or Stubs.** Legacy mock CMS payloads remain for some tiles; each mock now maps to a cluster key so production APIs can swap in real taxonomies without breaking filter affordances, and bootstrap seed data stamps `cluster_key` for operations and growth exemplars to keep discovery summaries grounded.
            6. **Duplicate Functions.** Removed ad-hoc summary builders in the page by delegating to `buildClusterSummary` and `getClusterExamples`, ensuring the same copy appears across discovery surfaces.
            7. **Improvements Needed.** Follow-up work should ingest backend-provided cluster labels and add telemetry for multi-select filter states plus empty-state variant tests noted in `user_experience.md`.
            8. **Styling Improvements.** Harmonised summary cards and filter pills use the new component's accent tokens so Annex B2 visuals stay consistent across Library, Explorer, Courses, and LiveClassrooms hero sections.
            9. **Efficiency Analysis.** Memoized keyword maps and precomputed lowercase caches prevent repeated regex scans when learners toggle filters, keeping the catalogue responsive even with hundreds of entries.
            10. **Strengths to Keep.** Clustered storytelling, analytics hook integration, and shared empty-result messaging (“No Enablement resources yet”) reinforce Annex guidance without fragmenting copy.
            11. **Weaknesses to Remove.** CMS sync still lacks tenant-aware weighting; production rollout should prioritise remote configuration and localized cluster descriptions highlighted in the UX audit.
            12. **Styling & Colour Review.** Summary ribbons borrow discovery palette tokens verified in `user_experience.md`, retaining contrast targets while adopting neutral backgrounds for accessibility.
            13. **CSS, Orientation & Placement.** Filters align within the hero rail on desktop and collapse into the mobile drawer using the shared layout mixins introduced for Explorer, preventing overflow in narrow breakpoints.
            14. **Text Analysis.** Cluster headings now reuse Annex copy such as “Operations Excellence” and “Growth Experiments” with brevity guidelines under 45 characters for tile-friendly truncation.
            15. **Change Checklist Tracker.** Regression checklist updated to cover cluster heuristics snapshots, analytics `cluster_filter` emission, filter state persistence, and fallback messaging per cluster.
            16. **Full Upgrade Plan & Release Steps.** Stage by enabling cluster summaries behind a flag, sync CMS keywords, run analytics QA on staging, brief marketing/content teams, and roll out once telemetry confirms engagement uplift.
         - 9.A.2 Courses (frontend-reactjs/src/pages/Courses.jsx)
            1. **Appraisal.** The course catalogue now mirrors Annex A19 personas by grouping featured programmes, admin catalogue rows, and learner highlights under the shared learning-cluster engine with empty-state guardrails.
            2. **Functionality.** `Courses.jsx` invokes `filterCoursesByCluster` for highlight, full catalogue, and admin inventory lists while emitting analytics that include the selected cluster so Annex dashboards can slice enrolment interest, and the backend `courses.cluster_key` column plus admin CRUD flows now persist the heuristic-derived persona key for catalogue responses, search documents, and SDK clients.
            3. **Usefulness.** Learners immediately see which courses align with Operations, Growth, Enablement, Community, or General competencies, and administrators can pivot catalogue tables with the same persona filter to plan inventory fills.
            4. **Redundancies.** Removed bespoke tag-based filters from hero sliders and admin tables in favour of cluster selection, consolidating query params and state reducers that previously diverged per section.
            5. **Placeholders or Stubs.** Some demo courses still rely on hard-coded tags; all are mapped through the heuristic keywords with TODOs flagged to replace them with backend-provided taxonomy once available, and the bootstrap course seed stores `cluster_key = 'operations'` so downstream environments inherit the aligned persona grouping.
            6. **Duplicate Functions.** `buildClusteredCourseHighlights` wraps the shared summary utility instead of replicating highlight slicing, ensuring card copy and counts stay synchronised with library and explorer outputs.
            7. **Improvements Needed.** Add persisted learner preferences, certificate pathways surfaced per cluster, and analytics for conversions post-filter as called out in `user_experience.md` recommendations.
            8. **Styling Improvements.** Cluster badges and filter chips reuse `LearningClusterSummary` tokens so course cards, admin tables, and empty states communicate persona context with consistent colouring.
            9. **Efficiency Analysis.** Memoised selectors and a single derived `clusterKey` prevent re-render storms when toggling between highlight, catalog, and admin tabs, maintaining responsiveness even with long course lists.
            10. **Strengths to Keep.** Course preview narratives, assessment snippets, and cluster-specific recommendations align with Annex B2’s learning pathways guidance while retaining previous progress tooling.
            11. **Weaknesses to Remove.** Offline download toggles and transcript states still ignore cluster filters; integrate these contexts to avoid learners losing state when switching personas.
            12. **Styling & Colour Review.** Progress bars and persona badges meet contrast requirements while adopting the same accent colours used in ContentLibrary and LiveClassrooms cluster cards.
            13. **CSS, Orientation & Placement.** Cluster filter bar pins beneath the hero on desktop and collapses into accordion drawers on mobile, mirroring behaviour validated in the UX audit for consistent orientation cues.
            14. **Text Analysis.** Updated hero copy highlights cluster benefits (“Grow revenue with experimentation sprints”) drawn from Annex microcopy guidelines, ensuring clarity across marketing and admin contexts.
            15. **Change Checklist Tracker.** QA scenarios now cover admin cluster switching, highlight empties, analytics event payloads, and regression tests for default persona fallback.
            16. **Full Upgrade Plan & Release Steps.** Sequence includes content tagging sync, analytics validation, stakeholder enablement (education, marketing, success), and go-live once enrolment funnels confirm uplift.
         - 9.A.3 Explorer (frontend-reactjs/src/pages/Explorer.jsx)
            1. **Appraisal.** Explorer’s cross-entity discovery now leans on the shared cluster heuristics to balance courses, library assets, and live programming into Annex B2 learning clusters with persona-driven messaging.
            2. **Functionality.** `Explorer.jsx` renders `LearningClusterSummary` at the top of the page, adds cluster filters to each discovery section, and feeds the analytics pipeline with `cluster_filter` context for search refinements, while the search ingestion pipeline now indexes `clusterKey` on course and ebook documents so explorer suggestions and saved searches respect the persisted persona key.
            3. **Usefulness.** Learners can start from a persona cluster and immediately pivot into recommended courses, articles, and events without leaving Explorer, aligning discovery with the Annex storyline.
            4. **Redundancies.** Deprecated bespoke “featured topics” arrays and replaced them with cluster-driven lists, removing manual curation steps and aligning component props across search subsections.
            5. **Placeholders or Stubs.** Mock search data persists but is annotated with cluster assignments so real search APIs can override without breaking layout; TODO comments remain to swap to backend results.
            6. **Duplicate Functions.** Unified cluster card rendering via `LearningClusterSummary` eliminates repeated markup previously embedded in Explorer hero and section headers.
            7. **Improvements Needed.** Implement backend-backed suggestions, recent searches scoped by cluster, and deeper analytics for preview drawer engagement as referenced in the UX audit.
            8. **Styling Improvements.** Cluster chips and summary cards respect the same layout, typography, and icon treatments as ContentLibrary, ensuring Explorer inherits Annex-compliant visuals.
            9. **Efficiency Analysis.** Derived data uses memoized lookups so toggling between clusters no longer retriggers heavy map/filter chains for each section, improving initial load and re-render times.
            10. **Strengths to Keep.** Rich preview drawer, cross-entity linking, and analytics instrumentation now gain persona context without sacrificing existing search affordances.
            11. **Weaknesses to Remove.** Keyboard navigation and saved search persistence still lag; follow-up should carry cluster state into those features to avoid disjointed experiences.
            12. **Styling & Colour Review.** Explorer adopts the shared neutral background and accent colours validated for Annex B2, keeping card states and filter chips aligned with the discovery palette.
            13. **CSS, Orientation & Placement.** Cluster summary adapts responsively, collapsing into a two-column stack on tablet and single-column list on mobile per `user_experience.md` orientation guidance.
            14. **Text Analysis.** Section intros highlight persona value (“Operations teams streamline onboarding”) consistent with Annex copy deck, trimmed for SEO-friendly snippet length.
            15. **Change Checklist Tracker.** Release checklist includes search analytics verification, empty-state copy review, QA for admin/public toggles, and snapshot tests for persona-specific layouts.
            16. **Full Upgrade Plan & Release Steps.** Roll out by syncing search index tags, updating marketing landing links, running controlled A/B experiments on Explorer traffic, and promoting once engagement improves.
         - 9.A.4 LiveClassrooms (frontend-reactjs/src/pages/LiveClassrooms.jsx)
            1. **Appraisal.** Live session discovery inherits the cluster layer so learners, instructors, and admins browse sessions grouped by persona with consistent summary cards and filters.
            2. **Functionality.** `LiveClassrooms.jsx` applies `filterSessionsByCluster` to both public listings and admin rosters, wiring analytics events and empty states to respect the selected cluster context, and the backend `live_classrooms.cluster_key` column plus admin create/update flows now capture heuristic clusters so catalogue feeds, analytics, and seeds stay aligned.
            3. **Usefulness.** Scheduling teams can quickly gauge which personas lack coverage (e.g., no Enablement live classes) and learners can subscribe to sessions that align with their goals, matching Annex A19 expectations.
            4. **Redundancies.** Consolidated duplicate cluster heuristics from dashboard live class tabs, reusing the shared utilities and removing bespoke status filtering logic.
            5. **Placeholders or Stubs.** Some admin moderation copy remains placeholder; however, each path now references cluster metadata, ensuring future backend integrations inherit the same persona context.
            6. **Duplicate Functions.** Replaced prior per-list filtering with the central `deriveClusterAssignments` output, ensuring consistent copy, counts, and empty states across learner and admin tables.
            7. **Improvements Needed.** Add timezone-aware cluster summaries, ICS export filtering, and notification preferences segmented by persona per recommendations in the UX documentation.
            8. **Styling Improvements.** Cluster chips complement status badges by reusing shared spacing and colour tokens, clarifying persona emphasis without overwhelming the schedule grid.
            9. **Efficiency Analysis.** Memoized session maps avoid recomputing assignments when toggling between upcoming, past, and admin tabs, keeping interactions snappy even with large schedules.
            10. **Strengths to Keep.** Conflict detection, role-specific views, and analytics hooks now benefit from persona context, improving planning insights without regressing scheduling capabilities.
            11. **Weaknesses to Remove.** Mobile density and timezone messaging still need refinement; integrate cluster context into responsive layouts and notifications to maintain clarity on small screens.
            12. **Styling & Colour Review.** Persona labels match the palette shared with Courses and ContentLibrary, keeping Annex-level contrast and iconography intact.
            13. **CSS, Orientation & Placement.** Cluster filters sit above schedule controls on desktop and collapse into stacked accordions on mobile, mirroring orientation guidelines while preserving accessibility focus order.
            14. **Text Analysis.** Session blurbs now emphasise persona outcomes (“Community leaders host AMAs”) aligned with Annex microcopy, with truncated summaries under 120 characters for grid readability.
            15. **Change Checklist Tracker.** QA steps include verifying persona filters across public/admin tabs, testing empty states, ensuring analytics events fire, and checking that conflict warnings respect cluster selection.
            16. **Full Upgrade Plan & Release Steps.** Plan includes syncing calendar feeds with cluster metadata, coordinating with instructor operations, monitoring analytics for persona coverage gaps, and phasing rollout alongside scheduling improvements.
      - ✓ 9.D Scheduling, Calendar & Classroom Utilities
         - 9.D.1 CalendarEventDialog (frontend-reactjs/src/components/calendar/CalendarEventDialog.jsx)
            1. **Appraisal.** The dialog now reflects Annex C4 guidance by surfacing timezone selection, preset durations, and schedule summaries so live class producers can stage workshops without leaving the modal.
            2. **Functionality.** Helpers `parseLocalDate`, `computeEndValue`, and `formatTimezoneLabel` convert local input strings into deterministic Date objects, auto-sync end times, and emit a11y-friendly labels while a memoised summary block explains the schedule, timezone, and relative start window.
            3. **Usefulness.** A persistent draft (stored under `edulure.calendar.draft`) and duration presets let instructors resume planning mid-flight, while the relative countdown callout clarifies whether the session is imminent or past—reducing calendaring mistakes called out in `user_experience.md` Annex C4.
            4. **Redundancies.** Manual end-time validation logic was collapsed into the new helpers, removing repeated `new Date` constructions and string concatenations across change handlers.
            5. **Placeholders or Stubs.** Media and resources still accept freeform URLs; upcoming Annex work will thread these into asset pickers once the classroom asset library lands.
            6. **Duplicate Functions.** Shared parsing/formatting utilities prevent diverging conversions between the modal and schedule components, aligning Annex requirements for consistent time math across live class tooling.
            7. **Improvements Needed.** Future iterations should emit ICS attachments and conflict warnings once the backend exposes instructor availability APIs, and add validation for tenant-specific call-to-action URL domains.
            8. **Styling Improvements.** New timezone and preset controls reuse dashboard pill tokens, while the summary block mirrors the Annex typography hierarchy (`text-xs` kickers, `text-primary` accent) so scheduling utilities feel native to the dashboard shell.
            9. **Efficiency Analysis.** Memoised schedule summaries and guarded localStorage writes ensure the dialog re-renders cheaply even when operators toggle between presets, satisfying Annex guidance on responsive interactions.
            10. **Strengths to Keep.** Focus-trap behaviour, Escape handling, and screen-reader announcements remain intact, meaning accessibility affordances from earlier Annex passes continue to hold.
            11. **Weaknesses to Remove.** Timezone formatting still relies on browser support; document a follow-up to ship a curated timezone list from the backend for environments lacking `Intl.supportedValuesOf`.
            12. **Styling & Colour Review.** Duration chips honour primary palettes while the summary callout keeps neutral tones, reinforcing the calm scheduling motif laid out in Annex C4.
            13. **CSS, Orientation & Placement.** Controls stay within the existing grid (`md:grid-cols-2`), ensuring mobile layouts cascade without overflow while the summary strip anchors to the modal footer per Annex orientation notes.
            14. **Text Analysis.** Microcopy emphasises action clarity (“Auto-sync end time”, “Highlight media URL”), matching Annex tone that prioritises descriptive cues over marketing language.
            15. **Change Checklist Tracker.** QA should confirm auto-sync toggles, draft persistence, timezone validation, and relative countdown accuracy before approving C4 releases.
            16. **Full Upgrade Plan & Release Steps.** Roll out by piloting with instructor ops, verifying timezone offsets in staging, capturing feedback on preset coverage, then publishing Annex C4 screenshots/documentation alongside the code deploy.
         - 9.D.2 ScheduleGrid (frontend-reactjs/src/components/scheduling/ScheduleGrid.jsx)
            1. **Appraisal.** The schedule grid now surfaces occupancy progress, location, persona tags, and primary/secondary actions so Annex C4 stakeholders can scan readiness at a glance.
            2. **Functionality.** `formatRelative`, `formatDuration`, and `formatTimezone` compute readable labels, while progress bars and CTA buttons adapt based on provided metadata, enabling both interactive selection and deep links.
            3. **Usefulness.** Hosts immediately see seat fill ratios, upcoming session relative timing, and quick links (join/request) without diving into detail pages, matching Annex expectations for rapid classroom triage.
            4. **Redundancies.** The component dropped wrapper `button` duplication in favour of a single `<article>` with keyboard handlers, eliminating nested interactive elements and consolidating focus styling.
            5. **Placeholders or Stubs.** Tags remain limited to four entries; a follow-up will paginate larger tag sets once programme metadata expands.
            6. **Duplicate Functions.** Shared helper functions replace ad-hoc Date math from prior iterations, keeping live class schedule calculations consistent with the dialog’s utilities.
            7. **Improvements Needed.** Consider streaming live attendance snapshots and resilience for missing timezone abbreviations, plus exposing instructor avatars referenced in Annex C4 roadmap.
            8. **Styling Improvements.** Persona, momentum, and CTA badges reuse Annex colour tokens (`bg-primary/5`, `bg-emerald-50`), ensuring parity with schedule summaries documented in `user_experience.md`.
            9. **Efficiency Analysis.** Formatting helpers short-circuit on invalid dates and reuse Intl formatters, reducing expensive allocations when rendering large grids.
            10. **Strengths to Keep.** Responsive three-column layout, hover/focus cues, and attendance cards remain intact, now enriched with more metrics rather than replaced.
            11. **Weaknesses to Remove.** CTA spacing now collapses when no buttons render; the remaining gap is the absence of skeletons for occupancy/attendance metrics, which briefly flash empty content while data hydrates.
            12. **Styling & Colour Review.** Progress bars adopt subtle primary gradients while retaining high contrast for seat usage, aligning with Annex accessibility audits.
            13. **CSS, Orientation & Placement.** The grid continues using Tailwind utilities (`md:grid-cols-2`, `xl:grid-cols-3`), ensuring density targets from Annex C4 remain satisfied across breakpoints.
            14. **Text Analysis.** Relative timing strings (“Starts in 2.5 hr”) and occupancy labels follow Annex copy tone—actionable, concise, and free from jargon.
            15. **Change Checklist Tracker.** QA should cover occupancy progress, persona tag rendering, CTA affordances, timezone fallbacks, and keyboard activation flows.
            16. **Full Upgrade Plan & Release Steps.** Release alongside updated live-class analytics, obtain instructor feedback on persona chips, update Annex screenshots, and monitor engagement on the upgraded grid.
            17. **Back-end Integration.** `DashboardService.buildLearnerDashboard` now emits backend-sourced timezone, location, tag, and CTA metadata—plus normalised call-to-action pairs—so ScheduleGrid renders production-aligned Annex C4 payloads instead of local fallbacks, and the supporting seeds/migrations keep classroom metadata synced across environments when `npm --workspace backend-nodejs run migrate && run seed` executes.
      - ✓ 9.E Search & Discovery Components
         - 9.E.1 BlogSearchSection (frontend-reactjs/src/components/search/BlogSearchSection.jsx)
            1. **Appraisal.** Annex A6’s newsroom brief now lives in the component: trending tags, saved view metrics, and recent history transform the static blog search into a discovery console.
            2. **Functionality.** Local persistence covers saved views and recent posts, analytics summaries expose totals/latency, and trending tags derive counts from the tag feed, all memoised to avoid redundant fetch churn.
            3. **Usefulness.** Editorial teams see catalogue totals, saved view counts, top tags, last refresh timestamp, and device-local history, aligning with Annex guidance for newsroom ops.
            4. **Redundancies.** Replaced ad-hoc `console` warnings and manual stats with structured dashboards, eliminating duplicate filters previously scattered around the page.
            5. **Placeholders.** Contact copy still references manual newsroom sharing; upcoming annex work can swap in collaboration hooks once backend endpoints land.
            6. **Duplicate Functions.** Trending calculations and view persistence reuse shared helpers instead of repeating JSON.parse/JSON.stringify across the module.
            7. **Improvements Needed.** Wire backend analytics (views per tag, conversions) once available, and consider multi-tenant saved-view syncing beyond localStorage.
            8. **Styling Improvements.** Summary cards and recents adopt Annex token spacing (`rounded-3xl`, `text-xs uppercase`), ensuring parity with other discovery pages highlighted in `user_experience.md`.
            9. **Efficiency Analysis.** Debounced fetches remain, while analytics computations filter/sort at most five tags to keep renders snappy.
            10. **Strengths to Keep.** Knowledge of categories/tags, saved view rename/delete flows, and pagination remain untouched but now contextualised with new metrics.
            11. **Weaknesses to Remove.** Device-local recents don’t sync across sessions; highlight this in the backlog for future Annex iterations.
            12. **Styling & Colour Review.** Primary accents highlight metric cards, trending tags, and recents while saved-view warnings retain neutral palettes for contrast compliance.
            13. **CSS, Orientation & Placement.** Grid layouts maintain responsiveness (cards stack on mobile) while the metrics row complements the existing two-column layout.
            14. **Text Analysis.** Copy emphasises newsroom actions (“Capture your favourite filters”, “Clear history”), meeting Annex tone for operational clarity.
            15. **Change Checklist Tracker.** QA should validate saved view CRUD, recents persistence, trending tag counts, pagination, and analytics cards after each release.
            16. **Full Upgrade Plan & Release Steps.** Launch by seeding real analytics data, briefing editorial ops, updating Annex screenshots, and monitoring engagement with the new summary cards.
            17. **Back-end Integration.** Search services now emit cluster, persona, and momentum metadata via `SearchDocumentModel`, so BlogSearchSection mirrors Explorer context when the backend toggles Annex A6 features across discovery surfaces.
         - 9.E.2 ExplorerPreviewDrawer (frontend-reactjs/src/components/search/ExplorerPreviewDrawer.jsx)
            1. **Appraisal.** The preview drawer now showcases persona focus, upcoming sessions, related resources, and copy-to-clipboard share links per Annex A6 exploration requirements.
            2. **Functionality.** Memoised metrics, persona detection, and upcoming session lists feed structured blocks, while clipboard handling and focus traps keep share actions accessible.
            3. **Usefulness.** Operators can evaluate persona fit, next session timing, and supporting collateral without leaving the preview, speeding up evaluation as Annex specifies.
            4. **Redundancies.** Duplicate share/related logic scattered in result cards was consolidated into the drawer, centralising formatting and copy.
            5. **Placeholders.** Related resources rely on the `relatedResources` array; future search backend upgrades can enrich metadata (thumbnails, types) for richer previews.
            6. **Duplicate Functions.** Upcoming session formatting reuses shared formatting helpers rather than custom string concatenation for each preview.
            7. **Improvements Needed.** Add analytics instrumentation for copy-link usage and upcoming session list interactions once telemetry endpoints are defined.
            8. **Styling Improvements.** Persona chips and share buttons reuse Annex palette tokens (`bg-slate-100`, `border-primary/30`), matching discovery surfaces documented in `user_experience.md`.
            9. **Efficiency Analysis.** Memoisation ensures persona/metrics/extracted lists render only when hits change, keeping the drawer responsive even with rich data.
            10. **Strengths to Keep.** Focus trap, Escape handling, and hero media fallback remain unchanged, retaining the accessible baseline from earlier Annex phases.
            11. **Weaknesses to Remove.** Clipboard copy lacks a tooltip for unsupported browsers; log a follow-up to show inline guidance when copy fails.
            12. **Styling & Colour Review.** Share success states adopt emerald accents to signal confirmation without introducing new colour tokens.
            13. **CSS, Orientation & Placement.** Layout preserves existing spacing but adds new cards (`rounded-3xl`) to house sessions/resources, maintaining Annex rhythm.
            14. **Text Analysis.** Labels emphasise purpose (“Upcoming sessions”, “Related resources”), consistent with Annex clarity guidelines.
            15. **Change Checklist Tracker.** QA should verify persona chips, upcoming session formatting, share copy states, and related resource links before publishing Annex updates.
            16. **Full Upgrade Plan & Release Steps.** Roll out alongside analytics updates, document persona/upcoming sections in Annex A6, and capture new screenshots for enablement decks.
            17. **Back-end Integration.** Drawer content binds directly to Explorer search payloads enriched by `SearchDocumentService` (cluster keys, persona focus, momentum labels), ensuring Annex A6 previews stay in sync with the database-backed discovery taxonomy.
         - 9.E.3 ExplorerSearchSection (frontend-reactjs/src/components/search/ExplorerSearchSection.jsx)
            1. **Appraisal.** Annex A6 explorers now launch with performance dashboards, latency snapshots, and analytics-driven facet callouts, giving operators actionable intelligence at the top of the page.
            2. **Functionality.** Latency capture, result counts, and active filter totals feed the new summary row; facet analytics render in dedicated cards, and saved searches highlight pinned entries with skeleton placeholders while `FilterChips` expose a clear-all action.
            3. **Usefulness.** Teams gain immediate awareness of search responsiveness, filter pressure, pinned configurations, and trending facets without leaving the explorer grid.
            4. **Redundancies.** Existing facet teaser replaced by analytic cards, eliminating repeated loops for rendering counts throughout the component.
            5. **Placeholders.** Pinned search info assumes `updatedAt`; document a follow-up for backends that lack timestamp data to avoid blank metadata.
            6. **Duplicate Functions.** Clear-all chip handling reuses the hook’s `clearFilters`, preventing divergent behaviour between the header reset button and chip controls.
            7. **Improvements Needed.** Capture latency percentiles and add CTA instrumentation for facet cards when analytics endpoints mature.
            8. **Styling Improvements.** Summary and facet cards mirror Annex card tokens (`rounded-3xl`, `text-xs uppercase`), keeping the explorer consistent with other discovery surfaces.
            9. **Efficiency Analysis.** Facet processing limits to top five entries per facet, memoising outputs so large analytics payloads don’t thrash renders.
            10. **Strengths to Keep.** Infinite scroll, saved search CRUD, and preview drawers remain intact, now augmented with analytics context.
            11. **Weaknesses to Remove.** Latency display surfaces raw milliseconds; queue an enhancement to render human-readable tiers once Annex approves thresholds.
            12. **Styling & Colour Review.** Neutral backgrounds ensure metrics stand out without clashing with the existing white explorer shell.
            13. **CSS, Orientation & Placement.** Summary row slots above the main grid while preserving breakpoints; facet cards collapse elegantly on mobile using the existing grid system.
            14. **Text Analysis.** Microcopy emphasises action (“Clear history”, “Pinned”) echoing Annex tone for clarity.
            15. **Change Checklist Tracker.** QA now verifies latency output, summary counts, facet cards, pinned badges, and clear-all chips alongside baseline explorer tests.
            16. **Full Upgrade Plan & Release Steps.** Coordinate with analytics to validate facet feeds, refresh Annex docs, and brief enablement on the new telemetry row before shipping.
            17. **Data Alignment.** `SearchDocumentService.normaliseDocument` stamps cluster keys, persona descriptors, and momentum scores; `SearchDocumentModel.deserialize` now rehydrates cluster metadata for legacy rows; migration `20250402101500_search_documents_cluster_alignment.js` plus seed `002_search_documents.js` keep the database aligned; and updated unit tests cover the enriched payloads so Explorer stays in lockstep with Annex A6 taxonomy.
         - 9.E.4 FilterChips (frontend-reactjs/src/components/search/FilterChips.jsx)
            1. **Appraisal.** Filter chips gained a shared cap (`MAX_MULTI_CHIPS`) and a clear-all affordance, ensuring Annex A6 explorers manage filter overload gracefully.
            2. **Functionality.** Multi-select chips limit rendering to 12 entries, and the new `onClearAll` prop enables bulk removal while keeping existing remove buttons accessible.
            3. **Usefulness.** Operators can reset entire filter sets without hunting for the reset header, matching Annex guidance for efficient discovery workflows.
            4. **Redundancies.** Duplicate slicing logic across consumers was eliminated; chips now centralise their limit and clear affordance in one place.
            5. **Placeholders.** Bulk clear currently hides when the consumer omits `onClearAll`; document this optionality in Annex docs.
            6. **Duplicate Functions.** Existing `buildFilterChips` now respects the shared cap, preventing diverging heuristics between explorer/filter contexts.
            7. **Improvements Needed.** Add tooltip support for truncated chip labels in a future Annex iteration.
            8. **Styling Improvements.** Clear-all button reuses neutral border tokens, maintaining Annex styling consistency with other chip controls.
            9. **Efficiency Analysis.** Early exits prevent unnecessary chip creation when filters exceed the limit, keeping render loops cheap.
            10. **Strengths to Keep.** Button semantics, sr-only labels, and keyboard-friendly removal remain unchanged.
            11. **Weaknesses to Remove.** The component still lacks virtualization for extremely large filter sets; evaluate if Annex needs this once analytics pipelines expand.
            12. **Styling & Colour Review.** No palette drift—the new button leans on slate neutrals with primary hover states.
            13. **CSS, Orientation & Placement.** Layout continues to flex-wrap chips with consistent spacing, aligning with Annex orientation specs.
            14. **Text Analysis.** “Clear all” copy matches Annex instruction style, concise and action-led.
            15. **Change Checklist Tracker.** QA should confirm chip limits, clear-all rendering, and removal semantics across explorer views.
            16. **Full Upgrade Plan & Release Steps.** Update explorer consumers to pass `onClearAll`, document chip caps, and capture Annex screenshots reflecting the new control.
         - 9.E.5 GlobalSearchBar (frontend-reactjs/src/components/search/GlobalSearchBar.jsx)
            1. **Appraisal.** The global search bar now mirrors Annex A6 expectations: escape-to-dismiss, recent queries, and history clearing give users a guided entry point.
            2. **Functionality.** LocalStorage-backed recents store the last five submissions, populate the dropdown when no suggestions exist, and expose a clear-history control, while the keydown handler closes on Escape.
            3. **Usefulness.** Learners can re-run popular searches and manage history without typing, improving exploration speed per Annex UX notes.
            4. **Redundancies.** Shared submission logic now centralises history updates—removing prior ad-hoc copy/paste across suggestion selection and manual submit paths.
            5. **Placeholders.** History remains device-local; future Annex work may sync across accounts once backend endpoints exist.
            6. **Duplicate Functions.** History persistence lives in dedicated helpers (`loadRecents`, `persistRecents`), replacing inline JSON parsing in multiple callbacks.
            7. **Improvements Needed.** Add analytics events for history taps once telemetry pipelines are ready.
            8. **Styling Improvements.** Recent entries use Annex pill styling, maintaining visual continuity with other discovery components.
            9. **Efficiency Analysis.** History updates filter duplicates and trim to five entries, keeping storage and render loops lightweight.
            10. **Strengths to Keep.** Debounced suggestion refresh, focus management, and pointer guardrails remain unaffected.
            11. **Weaknesses to Remove.** Consider surfacing suggestions even when history displays to avoid empty-state confusion for novice users.
            12. **Styling & Colour Review.** Neutral backgrounds and primary hover states keep dropdown aesthetics aligned with Annex tokens.
            13. **CSS, Orientation & Placement.** Dropdown retains padding/gaps, now with nested lists that collapse cleanly on mobile due to flex column layout.
            14. **Text Analysis.** Labels like “Clear history” and “Recent searches” adopt Annex voice—succinct and directive.
            15. **Change Checklist Tracker.** QA should validate suggestion navigation, history persistence/clearing, and Escape behaviour.
            16. **Full Upgrade Plan & Release Steps.** Stage with QA verifying multi-device behaviour, update Annex docs with new screenshots, and monitor search engagement post-release.
         - 9.E.6 SearchResultCard (frontend-reactjs/src/components/search/SearchResultCard.jsx)
            1. **Appraisal.** Result cards now expose persona focus, momentum, and share links, aligning Annex A6’s cross-surface storytelling expectations.
            2. **Functionality.** Persona/momentum chips render beside metadata, share links reference canonical URLs, and metrics reuse the existing grid to highlight price, rating, duration, and location.
            3. **Usefulness.** Operators can quickly gauge whether a result fits the desired persona, share the listing, or inspect momentum without opening detail pages.
            4. **Redundancies.** Rewrote the component to remove redundant markup duplication and centralise persona/momentum display logic.
            5. **Placeholders.** Share CTA currently links out; a follow-up can integrate inline clipboard copy when the backend exposes shortlinks.
            6. **Duplicate Functions.** Persona/momentum detection mirrors the preview drawer’s heuristics, keeping consistent semantics across the discovery stack.
            7. **Improvements Needed.** Evaluate adding badges for analytics trends (CTR, conversion) once Annex extends the search payload.
            8. **Styling Improvements.** Persona/momentum chips reuse neutral and emerald tokens, preserving Annex palette harmony.
            9. **Efficiency Analysis.** Component still short-circuits when metrics missing; rewrites didn’t add heavy computations, ensuring large result lists stay performant.
            10. **Strengths to Keep.** Card layout, highlight chips, and CTA rendering remain intact, now augmented with persona storytelling.
            11. **Weaknesses to Remove.** Share CTA adds vertical spacing; plan to collapse the share block when no link exists to avoid empty padding.
            12. **Styling & Colour Review.** Buttons retain neutral outlines and primary hover states, aligning with Annex design tokens.
            13. **CSS, Orientation & Placement.** Persona row anchors beneath highlight lists without breaking existing grid flow across breakpoints.
            14. **Text Analysis.** Copy emphasises clarity (“Share this result”, “Momentum”), following Annex guidelines for actionable microcopy.
            15. **Change Checklist Tracker.** QA should verify persona/momentum chip rendering, share link presence, and existing CTA flows remain correct.
            16. **Full Upgrade Plan & Release Steps.** Roll out with updated search payload documentation, refresh Annex screenshots, and monitor share link usage post-launch.
      - ✅ 10.A Commerce, Checkout & Pricing Components
         - 10.A.1 CampaignEditor (frontend-reactjs/src/components/ads/CampaignEditor.jsx)
         - 10.A.2 CampaignPreview (frontend-reactjs/src/components/ads/CampaignPreview.jsx)
         - 10.A.3 CheckoutDialog (frontend-reactjs/src/components/commerce/CheckoutDialog.jsx)
         - 10.A.4 CheckoutPriceSummary (frontend-reactjs/src/components/commerce/CheckoutPriceSummary.jsx)
         - 10.A.5 EdulureAds (frontend-reactjs/src/pages/dashboard/EdulureAds.jsx)
      - ✓ 11.A Profile & Account Surfaces — Annex A22 (Profile & Billing Management)
         1. **Appraisal.** `IdentityVerificationService.js` now composes the same verification summary that fuels `pages/Profile.jsx`, so Annex A22 shows inline validation, audit chronology, and billing cross-links sourced from the production KYC tables instead of mock placeholders.
         2. **Functionality.** `composeVerificationSummary` joins `KycVerificationModel`, `KycDocumentModel`, and `KycAuditLogModel` rows into a payload with decrypted document metadata, required/outstanding document arrays, and a timestamped timeline rendered by the React verification card.
         3. **Usefulness.** Learners see backend-confirmed audit events (“submitted_for_review”, “review_approved”) beside local upload states, reducing reconciliation pings because the profile accurately mirrors compliance status.
         4. **Redundancies.** Timeline construction moved from the client into the service, eliminating duplicate logic across `fetchVerificationSummary`, `attachVerificationDocument`, and `submitVerificationPackage` while giving the UI a single canonical feed.
         5. **Placeholders.** When a tenant lacks audit rows the service falls back to deterministic “verification ready” messaging, keeping Annex copy stable until reviewers create history.
         6. **Duplicates.** Document labels now come directly from `REQUIRED_DOCUMENT_TYPES`, preventing diverging helper text between backend policy and the profile upload checklist.
         7. **Improvements Needed.** Next sprint should hydrate reviewer avatars and SLA countdowns in the timeline once compliance exposes enriched metadata through `KycAuditLogModel`.
         8. **Styling.** Profile verification badges reuse Annex accent tokens while server responses supply label/description text so the React component no longer hardcodes design copy.
         9. **Efficiency.** Timeline generation runs in SQL once per summary request and returns memo-friendly arrays, avoiding repeated client recomputation on every render.
         10. **Strengths.** Backend-verified outstanding document lists, audit-fed timelines, and persisted upload metadata keep account owners, finance, and compliance reviewing the same state snapshot.
         11. **Weaknesses.** Profile editing still lacks backend-driven localisation for validation strings; introduce translation scaffolding before rolling out to multilingual tenants.
         12. **Styling & Colour Review.** Server-provided labels respect Annex typography hierarchy, and the UI continues to apply focus/hover states that match billing cards and consent ledgers.
         13. **CSS, Orientation & Placement.** The verification pane preserves two-column balance on desktop while stacking timeline events beneath alerts on mobile without reflow glitches.
         14. **Text Analysis.** Backend summaries surface concise, action-focused copy (“Upload the back of your government ID”) derived from compliance descriptions, keeping tooltips consistent across channels.
         15. **Change Checklist Tracker.** QA now verifies audit ingestion, outstanding document gating, and failure messaging against seeded KYC data before approving Annex A22 shipments.
         16. **Release.** Roll Annex A22 alongside compliance migrations: run `20250211104500_secure_kyc_financial_payloads.js`, backfill audit logs, brief support on new timeline semantics, and monitor submission completion rates.
      - ✓ 11.B Support & Success Workflows — Annex C1 (Learner Support Workspace)
         1. **Appraisal.** `LearnerSupportRepository.js` and `SupportTicketModel.js` now align with migrations/seeds so Annex C1’s workspace displays knowledge suggestions, breadcrumbs, and AI summaries backed by live database fields.
         2. **Functionality.** `createSupportTicket`, `updateSupportTicket`, and message APIs persist escalation breadcrumbs, notification metadata, and AI context while `TicketForm.jsx` reads/writes the same structures surfaced in the learner dashboard.
         3. **Usefulness.** Learners review suggestion chips and SLA breadcrumbs that match backend records, letting success agents continue cases without reconciling local-only state.
         4. **Redundancies.** Shared option builders and repository helpers normalise categories, priorities, and breadcrumbs so both backend and modal reuse the same serialisation rules.
         5. **Placeholders.** Notification preferences stay in local storage until the preference API lands, but schema columns (`knowledge_suggestions`, `follow_up_due_at`) keep production parity for when the server begins storing them.
         6. **Duplicates.** Support migrations (`20250321120000_learner_support_enhancements.js`) and `database/install.sql` enforce identical columns across fresh installs, seeds, and runtime queries, avoiding drift between environments.
         7. **Improvements Needed.** Wire analytics events for preference toggles and hydrate SMS availability from tenant configuration before widening Annex rollout.
         8. **Styling.** Chips, focus traps, and toast semantics continue to match Annex colour tokens, and backend-driven suggestion text removes redundant hard-coded copy in the modal.
         9. **Efficiency.** Repository helpers batch message inserts and breadcrumb updates, while the modal mutates shallow clones so React renders remain lightweight even with persisted metadata.
         10. **Strengths.** Accessible modal patterns, persisted AI summaries, and knowledge suggestions sourced from `support_articles` keep success workflows observable end-to-end.
         11. **Weaknesses.** Local-only notification storage prevents cross-device preference sync; a follow-up should store channel/digest choices server-side through the learner preferences service.
         12. **Styling & Colour Review.** Error, warning, and success states reuse Annex palettes so toast colours, chips, and banners stay consistent across dashboard and modal surfaces.
         13. **CSS, Orientation & Placement.** Grid utilities ensure preference toggles collapse into single-column stacks on small screens while preserving accessible hit targets.
         14. **Text Analysis.** Support microcopy now references seeded articles (“Resolve recurring billing declines”) and AI summary blurbs kept under 140 characters for clarity.
         15. **Change Checklist Tracker.** Regression passes now include repository timeline hydration, breadcrumb updates, and notification toggle persistence before C1 deployments.
         16. **Release.** Sequence Annex C1 with the learner support migration bundle, reseed knowledge articles via `001_bootstrap.js`, publish enablement notes, and monitor case resolution SLAs post-launch.
      - ✓ 11.C Settings, Preferences & Profile Components — Annex A22 (Profile Management)
         - 11.C.1 ProfileIdentityEditor (frontend-reactjs/src/components/profile/ProfileIdentityEditor.jsx)
         - 11.C.2 SettingsAccordion (frontend-reactjs/src/components/settings/SettingsAccordion.jsx)
         - 11.C.3 SettingsLayout (frontend-reactjs/src/components/settings/SettingsLayout.jsx)
         - 11.C.4 SettingsToggleField (frontend-reactjs/src/components/settings/SettingsToggleField.jsx)
         - 11.C.5 SystemPreferencesPanel (frontend-reactjs/src/components/settings/SystemPreferencesPanel.jsx)
         1. **Appraisal.** Profile identity editing now calculates a completion percentage badge and exposes live tagline/bio character budgets in `ProfileIdentityEditor.jsx`, replacing the static “Ready for publishing” label so Annex A22 can reference exact readiness metrics tied to the learner’s form payload.
         2. **Functionality.** `SettingsAccordion.jsx` persists open state via `persistenceKey`, emits `onToggle` notifications, and wires `aria-controls`/`id` pairs while `SystemPreferencesPanel.jsx` normalises form submission with an internal `handleSystemSubmit`, preventing double submissions across dashboard and profile surfaces.
         3. **Usefulness.** `SettingsLayout.jsx` now renders breadcrumb trails plus a locale-aware “Last saved” stamp, and the panel surfaces reset hooks (`onResetSystem`, `onResetPersonalisation`) so operators can mirror Annex workflows that call for restoring defaults or clearing sponsor signals before re-saving.
         4. **Redundancies.** Toggle meta badges and supporting actions in `SettingsToggleField.jsx` centralise status chips, removing bespoke “Paused/Active” markup from both preferences panel instances while `SystemPreferencesPanel.jsx` funnels sync copy through a single `syncStatus` prop.
         5. **Placeholders.** Sync messaging currently reuses `useSystemPreferencesForm` status strings; future Annex revisions should swap in tenant-localised phrasing once the preferences API returns translated copies.
         6. **Duplicates.** Reset handlers lean on `setSystemPreferencesForm` with `DEFAULT_SYSTEM_FORM` seeds, eliminating repeated manual resets that previously diverged between the dashboard view and profile drawer.
         7. **Improvements Needed.** Follow-up work should add optimistic diffing before invoking `refreshSystemPreferences()` so the new `lastSavedAt` metadata can highlight unsaved local edits instead of always assuming the server source of truth.
         8. **Styling.** Completion, status, and reset affordances share Annex tokens: `border-primary/40`, `text-rose-500`, and `dashboard-pill` classes align notification, digest, and sponsor toggles with the Annex palette regardless of container.
         9. **Efficiency.** Memoised completion summaries and `Intl.DateTimeFormat` formatting avoid recalculating badge labels on every render, while accordion persistence skips extra layout reflows by reading localStorage once during initialisation.
         10. **Strengths.** Learners can now audit when preferences last synced, restore defaults with one click, and review contextual helper text (e.g., digest dependencies) without leaving Annex A22 flows, keeping dashboard and profile behaviour consistent.
         11. **Weaknesses.** Preferences still rely on sequential `refreshSystemPreferences()` calls; adding concurrency guards and explicit loading banners would ensure the persisted open-state UX stays informative during slow network hops.
         12. **Styling & Colour Review.** Toggle cards retain soft white surfaces while new meta badges lean on uppercase slate typography, ensuring accessibility even when supporting actions render inline buttons.
         13. **CSS, Orientation & Placement.** `SystemPreferencesPanel.jsx` keeps `md:grid-cols-3` layouts for dense toggles, guaranteeing the added meta labels and helper text don’t break Annex spacing on tablet breakpoints.
         14. **Text Analysis.** Copy updates (“Restoring preferences from your last sync…”, “Enable email notifications to activate the digest.”) satisfy Annex guidance for action-led microcopy while clearly signalling dependencies between controls.
         15. **Change Checklist Tracker.** QA must now verify badge percentages, breadcrumb links, accordion persistence keys, reset flows, and last-saved timestamps across both dashboard and profile entry points before signing off Annex A22.
         16. **Release.** Ship alongside the preferences API schema update: migrate documentation to include new reset hooks, update automated smoke tests to cover `syncStatus`, and brief support teams on the restored-from-cloud messaging introduced in this pass.
         17. **Database Alignment.** `database/migrations/007_identity_onboarding_dashboard.sql`, `database/install.sql`, and the governance snapshot now enumerate learner system preferences, finance profiles, payment methods, billing contacts, and finance purchases so Annex A22 data flows stay in lockstep with production DDL across bootstrap, migrations, and manual installs.
         18. **Seed Cohesion.** SQL seeders mirror the Node bootstrap fixtures by inserting learner preferences, billing contacts, payment methods, and finance purchase exemplars for `noemi.carvalho@edulure.test`, ensuring Annex walkthroughs surface identical data whether environments are hydrated via Knex seeds or raw SQL.
      - ✓ 12.A Bootstrap & Runtime Wiring (`backend-nodejs/src/bootstrap/bootstrap.js`, `backend-nodejs/src/config/env.js`, `backend-nodejs/src/graphql/gatewayBootstrap.js`, `backend-nodejs/src/graphql/persistedQueryStore.js`, `backend-nodejs/src/graphql/router.js`, `backend-nodejs/src/servers/webServer.js`, `backend-nodejs/src/servers/workerService.js`)
        1. **Appraisal.** GraphQL readiness is now part of the default bootstrap contract: `bootstrap/bootstrap.js` wires `warmGraphQLGateway` alongside database, feature flag, and search cluster lifecycles while `env.graphql` formalises persisted query locations, refresh cadence, and depth/operation limits for every runtime.
        2. **Functionality.** `graphql/gatewayBootstrap.js` warms schema introspection, hydrates JSON and `.graphql` manifests into the shared in-memory store, and schedules safe refreshes via `persistedQueryStore.replaceAll`; readiness emitters in `webServer.js`/`workerService.js` treat the gateway as a first-class dependency and stop handles clear timers deterministically. Vitest coverage in `test/graphql/gatewayBootstrap.test.js` and `test/graphql/persistedQueryStore.test.js` locks in manifest parsing, TTL behaviour, and cache hydration.
        3. **Logic Usefulness.** The bootstrapper downgrades readiness rather than crashing when manifests are missing, emits snapshots with entry counts plus refresh intervals, and feeds env-sourced guard rails straight into `graphql/router.js`, keeping persisted-query policy centralised and reproducible across nodes.
        4. **Redundancies.** Prior duplicated stop semantics in `startCoreInfrastructure` remain eliminated by funnelling descriptors through a single `stopHandler`, ensuring bootstrap helpers (including GraphQL cache timers) tear down without bespoke wiring.
        5. **Placeholders or Stubs.** Persisted query manifests remain optional; when absent, the gateway marks itself degraded so operations can stage manifests independently of code deploys while still exposing meaningful readiness context.
        6. **Duplicate Functions.** The `persistedQueryStore` centralises TTL-aware cache mutation via `set`, `clear`, and `replaceAll`, removing bespoke map resets and allowing manifest refreshes/tests to share the same primitives.
        7. **Improvements Needed.** Surface refresh metrics (success/failure counters, last refresh timestamp) through Prometheus once the observability stack exposes GraphQL-specific gauges, and consider wiring `env.graphql.persistedQueriesPath` into configuration management for environment overrides.
        8. **Styling Improvements.** N/A for runtime wiring; logging already uses structured payloads—ensure follow-up stories keep the `graphql-gateway` logger child consistent with existing naming conventions.
        9. **Efficiency Analysis.** Cached manifests prevent recomputation on every GraphQL call, while readiness retries reuse the generic exponential backoff in `executeWithRetry`; the store prunes expired entries on access so manifests and runtime traffic remain lightweight.
        10. **Strengths to Keep.** Centralised bootstrap orchestration, bounded retry logic, readiness snapshots with manifest health, and dedicated documentation in `backend-nodejs/README.md` give SRE and platform operations a predictable control plane for GraphQL availability.
        11. **Weaknesses to Remove.** Future iterations should prune stale persisted queries by reconciling manifest hashes against live traffic; at present, `replaceAll` overwrites the in-memory cache but lacks differential metrics for removed entries.
        12. **Styling & Colour Review.** Not applicable—ensure Grafana dashboards adopt the new readiness component name when visualising GraphQL status.
        13. **CSS, Orientation & Placement.** Not applicable to backend bootstrapping; document the new readiness component placement in service topology diagrams instead.
        14. **Text Analysis.** Bootstrap log messages highlight manifest paths and entry counts; maintain concise, action-oriented phrasing for on-call operators when extending messaging.
        15. **Change Checklist Tracker.** Add GraphQL manifest validation, readiness probe assertions, and env regression checks (including README GraphQL gateway section) to the release checklist before promoting stacks that rely on persisted queries.
        16. **Full Upgrade Plan & Release Steps.** Roll out by enabling GraphQL readiness in staging, publishing manifests to storage, monitoring readiness degradation signals, and toggling refresh intervals per environment before enabling the feature in production.
      - ✓ 12.B Routing, Middleware & Entry Points (`backend-nodejs/src/middleware/auth.js`, `backend-nodejs/src/middleware/runtimeConfig.js`, `backend-nodejs/src/routes/creation.routes.js`)
        1. **Appraisal.** Middleware now shapes request actors, permissions, runtime config, and domain event lifecycles end-to-end—`auth.js` emits a canonical actor object, `runtimeConfig.js` exposes domain event helpers, and `creation.routes.js` registers contextual defaults for studio endpoints.
        2. **Functionality.** Access tokens hydrate `req.actor`, `req.permissions`, and `req.session`, while runtime middleware adds `req.recordDomainEvent`/`req.registerDomainEventDefaults` for controllers to emit enriched domain events backed by `DomainEventModel.record`. Creation routes seed defaults for project/template entities so downstream handlers inherit entity metadata automatically, and the queue plumbing stays aligned with `migrations/20250301100000_domain_event_dispatch_queue.js`, the governance snapshot (`database/schema/mysql-governance-baseline.json`), and bootstrap seed fixtures in `seeds/001_bootstrap.js`.
        3. **Logic Usefulness.** Feature flag evaluation now leverages actor-aware context, and domain event defaults merge request metadata (trace IDs, correlation IDs, actor roles) with route-specific descriptors, dramatically reducing boilerplate when recording events while ensuring dispatch rows conform to the seeded schema.
        4. **Redundancies.** Permissions derived from JWT scope/claims replace ad-hoc role checks spread across controllers, consolidating permission resolution in `auth.js` while `runtimeConfig` centralises request context enrichment for both REST and GraphQL flows.
        5. **Placeholders or Stubs.** Event emission helpers currently target `DomainEventModel.record`; integrate dispatcher shortcuts in future if controllers require async fire-and-forget semantics beyond the model layer.
        6. **Duplicate Functions.** By funnelling domain-event payload merging into `mergePayload`/`mergeDescriptors`, repeated deep merge logic across controllers can be removed as they adopt the middleware helpers.
        7. **Improvements Needed.** Implement controller-level utilities to automatically invoke `req.recordDomainEvent` after mutating operations (e.g., project creation) and expand permission maps when additional roles (moderator, partner) come online.
        8. **Styling Improvements.** N/A for backend middleware; ensure accompanying documentation references the new request properties so SDK consumers remain aligned.
        9. **Efficiency Analysis.** Actor/permission derivation occurs once per request, and domain event defaults reuse the same array for merged descriptors; additional allocations are minimal compared with controller-level duplication they replace.
        10. **Strengths to Keep.** Strong separation between authentication, runtime configuration, and routing metadata ensures consistent observability, while route-level defaults keep domain event payloads cohesive across REST and future GraphQL layers.
        11. **Weaknesses to Remove.** Introduce graceful fallbacks when `req.recordDomainEvent` fails (e.g., emit logs without throwing) and continue auditing controllers so they rely on middleware-provided actor metadata instead of direct JWT parsing.
        12. **Styling & Colour Review.** Not relevant to backend entry points; keep request-context logging fields stable for dashboard theming parity.
        13. **CSS, Orientation & Placement.** Not applicable; ensure updated middleware ordering is documented in service flow diagrams to prevent regressions when composing Express routers.
        14. **Text Analysis.** Error messages remain concise (“Invalid or expired token”, “Insufficient permissions”) and event helper exceptions clearly describe missing keys to streamline debugging.
        15. **Change Checklist Tracker.** Expand QA sign-off to include domain-event smoke tests, permission-matrix validation for JWT claims, and route metadata assertions before releasing entry-point changes.
        16. **Full Upgrade Plan & Release Steps.** Deploy middleware updates to staging, verify domain event emission via telemetry, audit permission-driven routes for regressions, and coordinate documentation updates before promoting to production.
      - 12.C Controllers & GraphQL Gateways
      - 12.A Bootstrap & Runtime Wiring
         - 12.A.1 bootstrap (backend-nodejs/src/bootstrap/bootstrap.js)
         - 12.A.2 database (backend-nodejs/src/config/database.js)
         - 12.A.3 workerService (backend-nodejs/src/servers/workerService.js)
      - 12.B Routing, Middleware & Entry Points
         - 12.B.1 auth (backend-nodejs/src/middleware/auth.js)
         - 12.B.2 runtimeConfig (backend-nodejs/src/middleware/runtimeConfig.js)
         - 12.B.3 creation.routes (backend-nodejs/src/routes/creation.routes.js)
      - ✅ 12.C Controllers & GraphQL Gateways
         - 12.C.1 EbookController (backend-nodejs/src/controllers/EbookController.js)
         - 12.C.2 schema (backend-nodejs/src/graphql/schema.js)
        1. **Appraisal.** `EbookController.js` now deduplicates and sanitises author, tag, category, and language collections while the GraphQL schema clamps pagination and trims search parameters, aligning back-office payload hygiene with the curated catalogue expectations captured in `user_experience.md`.
        2. **Functionality.** Normalisers convert mixed string/array payloads into trimmed sets, metadata is deep-cloned before persistence, and GraphQL exposes a `prefetch` JSON field so dashboard surfaces can hydrate hero modules alongside feed entries without ad-hoc REST calls. The sanitised collections now match the JSON columns enforced by `EbookModel.js`, keeping catalogue seeds and future content imports schema-valid.
        3. **Logic Usefulness.** Languages are uppercased to keep locale badges consistent across marketing and learner storefronts, while keyword filtering on placements guarantees ad targeting terms mirror the UX taxonomy shared across web, React Native, and Flutter.
        4. **Redundancies.** Centralising pagination parsing removes bespoke limit handling from downstream services and lets React and Flutter clients rely on a single rule-set rather than duplicating array dedupe logic per platform.
        5. **Placeholders or Stubs.** GraphQL still delegates feature-flag awareness to `LiveFeedService`; wiring the new sanitised metadata through gateway-level analytics toggles remains on the backlog before exposing experimental feed variants.
        6. **Duplicate Functions.** Shared helpers (`trimText`, `normalisePaginationInput`, `normaliseArray`) replace one-off string munging that previously lived in controllers, GraphQL resolvers, and client utilities.
        7. **Improvements Needed.** Next iteration should surface currency validation errors from `EbookService` with localized copy so the UX writing guidelines in `user_experience.md` are enforced server-side.
        8. **Styling Improvements.** Sanitised `metadata` payloads give design systems reliable hooks for cover gradients and content warnings, preventing mismatched accent colours across the ebook shelf, dashboard cards, and marketing pages.
        9. **Efficiency Analysis.** Pagination and keyword clamps cap list sizes, guarding the GraphQL gateway and marketplace endpoints against oversized queries while keeping response payloads within telemetry budgets.
        10. **Strengths to Keep.** Consistent Joi validation, shared normalisers, and the new GraphQL `prefetch` surface maintain observability and keep timeline hydration deterministic across channels.
        11. **Weaknesses to Remove.** Ebooks still accept arbitrary metadata structures; a typed contract should eventually govern marketing highlights versus purchase funnels so analytics dashboards remain comparable.
        12. **Styling & Colour Review.** With metadata sanitised, align ebook accent tokens with the brand palette documented in `user_experience.md` to avoid divergent gradients between marketing pages and instructor consoles.
        13. **CSS, Orientation & Placement.** GraphQL prefetch data should feed layout engines so featured posts and placements reserve space before hydration, matching responsive breakpoints encoded in the UX specification.
        14. **Text Analysis.** Normalised pricing errors and Joi feedback should inherit the concise tone-of-voice guidelines (≤120 characters, action-first) referenced in the support copy tables.
        15. **Change Checklist Tracker.** Extend backend QA to cover pagination clamps, keyword trimming, and metadata sanitisation before promoting new feed or marketplace filters to production.
        16. **Full Upgrade Plan & Release Steps.** Roll out the sanitisation helpers, observe API analytics for pagination shifts, stage GraphQL schema changes behind gateway versioning, update client SDKs, and publish the new payload contract to the platform changelog.
      - ✅ 12.D Domain Models & Persistence
         - 12.D.1 ReportingPaymentsRevenueDailyView (backend-nodejs/src/models/ReportingPaymentsRevenueDailyView.js)
         - 12.D.2 LearnerSupportRepository (backend-nodejs/src/repositories/LearnerSupportRepository.js)
        1. **Appraisal.** Daily revenue summaries now support currency scoping and hole-filling for timeline charts, while learner support persistence emits domain events for ticket creation, updates, messaging, and closure.
        2. **Functionality.** Currency filters flow through SQL builders, date windows are generated server-side, repository list views respect status/limit options, and close/add operations refresh breadcrumbs and return mapped artefacts. The base `006_create_learner_support_tables.sql` migration now provisions breadcrumbs, AI summary, follow-up, and knowledge suggestion columns up-front so seeds and runtime models stay aligned without relying on ad-hoc alter statements.
        3. **Logic Usefulness.** Domain events encode ticket state transitions so support analytics, CRM syncs, and notification workers can respond without scraping tables, fulfilling Annex A15 expectations.
        4. **Redundancies.** Centralised limit/currency normalisers prevent controllers and services from reimplementing filter parsing for every dashboard or export routine.
        5. **Placeholders or Stubs.** Event dispatchers still await downstream subscribers for satisfaction surveys and escalation routing; wire those handlers before exposing support telemetry to leadership dashboards.
        6. **Duplicate Functions.** The new helpers replace bespoke pagination parsing scattered across repositories and services, keeping learner support and reporting consistent with the shared toolkit in Annex C1.
        7. **Improvements Needed.** Add currency conversion hooks so finance summaries can express both native and platform base currencies without duplicating reporting SQL.
        8. **Styling Improvements.** Filled date gaps give UX designers stable line charts and card gradients that match the reporting layouts catalogued in `user_experience.md`.
        9. **Efficiency Analysis.** `whereIn` filters and capped case listings reduce redundant message hydration, cutting latency for learners scrolling large support histories.
        10. **Strengths to Keep.** Breadcrumb updates, automatic follow-up recalculation, and serialised attachments maintain the thorough audit trail expected in support experiences.
        11. **Weaknesses to Remove.** Satisfaction updates still rely on caller-provided scores; consider enforcing allowed ranges and storing the rater identity for governance checks.
        12. **Styling & Colour Review.** Domain events should drive consistent badge states (open, pending, closed) so the support timeline palette mirrors the gradients specified in the UX audit.
        13. **CSS, Orientation & Placement.** Filled reporting series align with dashboard spacing assumptions, preventing the empty-day collapse observed in previous user testing.
        14. **Text Analysis.** Event payloads use verb-first labels (“case_created”, “case_closed”) that map cleanly to support copywriting guidelines and notification templates.
        15. **Change Checklist Tracker.** Add coverage for `fillGaps` timelines and list option normalisation to regression suites before each release.
        16. **Full Upgrade Plan & Release Steps.** Deploy reporting changes alongside analytics schema docs, broadcast the new domain events to downstream consumers, backfill historic gaps for SLA dashboards, and validate support timelines with CX before GA.
      - 12.E Services & Integrations
      - ✅ 12.E Services & Integrations (`backend-nodejs/src/integrations/HubSpotClient.js`, `backend-nodejs/src/services/CourseLiveService.js`, `backend-nodejs/src/observability/metrics.js`)
        1. **Appraisal.** `HubSpotClient.request` now wraps every attempt in `recordIntegrationRequestAttempt` while `CourseLiveService` publishes presence gauges through `updateLiveCoursePresenceMetrics`, aligning external CRM syncs with live collaboration telemetry.
        2. **Function.** Exponential backoff, audit logging, and idempotency digests remain, but duration/outcome labels now feed Prometheus histograms and `purgeStaleViewers` trims idle viewers before returning presence snapshots.
        3. **Usefulness.** Integration counters, retry tallies, and live-session totals surface in `/metrics`, letting runbooks correlate CRM throttling with classroom participation.
        4. **Redundancies.** A shared `recordAttemptMetrics` closure replaces repeated `Date.now()` bookkeeping, and metrics helpers eliminate bespoke logging in each retry branch.
        5. **Placeholders or Stubs.** Future Salesforce or marketing connectors still need wiring, but they can now adopt the same metrics contract without reimplementing timers.
        6. **Duplicate Functions.** Retry loops, audit metadata, and metrics emission share one path so new integrations avoid cloning duration/label scaffolding.
        7. **Improvements Needed.** Extend the helper exports to GraphQL/webhook clients and ship alerts when `outcome=retry` exceeds agreed thresholds.
        8. **Styling Improvements.** Constructor guards normalise configuration (`Math.max` on history/idle windows) so inconsistent environment values no longer slip through.
        9. **Efficiency Analysis.** `purgeStaleViewers` and `maybeCleanupSession` reclaim memory for abandoned broadcasts while retry counters highlight 429 storms in HubSpot traffic.
        10. **Strengths to Keep.** Structured audit logging, digest-driven idempotency, and bounded chat history continue to provide durable safety rails.
        11. **Weaknesses to Remove.** Presence metrics still miss persona granularity and should eventually tag instructors versus learners for deeper diagnostics.
        12. **Palette.** Structured JSON logs and Prometheus label keys keep observability dashboards colour-coded without ad-hoc formatting.
        13. **CSS, Orientation & Placement.** Backend modules stay in domain folders—`integrations/`, `services/`, `observability/`—so ownership remains clear.
        14. **Text Analysis.** Timeout and network faults now emit `'timeout'` or `'error'` status codes, giving SRE alerts clearer copy than generic 500s.
        15. **Spacing.** Idle and retention windows default to 120s/900s and clamp to sensible floors, preventing outlier configs from choking cleanup loops.
        16. **Shape.** Course sessions now enforce lifecycle boundaries (active, idle, retired) so downstream APIs never leak empty shells.
        17. **Effects.** Retry counters, success/failure outcomes, and jittered delays expose the effect of upstream throttling directly in dashboards.
        18. **Thumbs.** Document the live-session gauge semantics so support teams can quickly screenshot Grafana slices during incidents.
        19. **Media.** Add sequence diagrams in `docs/observability` explaining how CRM retries and chat presence cleanups interact.
        20. **Buttons.** Future toggles should let ops disable presence metrics or change idle cutoffs via runtime config without code edits.
        21. **Interact.** Integration metrics couple with `/metrics` scraping, enabling operators to compare CRM traffic with live-session churn in real time.
        22. **Missing.** Automated tests for `purgeStaleViewers` and integration retry metrics remain to be added before GA.
        23. **Design.** Observability helpers (`recordIntegrationRequestAttempt`, `updateLiveCoursePresenceMetrics`) encapsulate cross-cutting concerns so service classes stay domain-focused.
        24. **Clone.** Instrumentation helpers prevent future HTTP clients from cloning the same `try/catch` stats scaffolding.
        25. **Framework.** Update backend integration playbooks to include guidance on invoking the new metrics exports.
        26. **Checklist.** Add QA steps verifying that `CourseLiveService.reset()` zeroes gauges and HubSpot retries increment counters during smoke tests.
        27. **Nav.** Link Prometheus metric names into the enablement runbook so operators can jump straight to dashboards.
        28. **Release.** Roll out metrics registration, update Grafana to track the new series, and brief enablement teams on idle eviction before promoting to production.
         - 12.E.1 HubSpotClient (backend-nodejs/src/integrations/HubSpotClient.js)
         - 12.E.2 CourseLiveService (backend-nodejs/src/services/CourseLiveService.js)
      - ✅ 12.F Async Jobs & Observability (`backend-nodejs/src/jobs/communityReminderJob.js`, `backend-nodejs/src/observability/probes.js`, `backend-nodejs/src/observability/metrics.js`)
        1. **Appraisal.** `CommunityReminderJob` now emits background job counters while `communityEventConstants.js` freezes the shared status/channel enums so migrations, models, and seeds describe reminders and participants with the same taxonomy.
        2. **Function.** Each run classifies outcomes (success, partial, idle, skipped, failure) with duration histograms, Twilio configuration short-circuits emit `outcome=skipped` metrics, and `/` plus `/status` aggregate readiness and liveness checks.
        3. **Usefulness.** Operators can read job throughput and failure counts from `/metrics`, confirm stack health via a single JSON payload, and rely on the bootstrap seed data to exercise pending/sent reminders during local smoke tests.
        4. **Redundancies.** The shared `recordBackgroundJobRun` eliminates bespoke logging math, Twilio sends reuse the integration metrics helper introduced for HubSpot, and the new constants module prevents duplicate status arrays in migrations, models, and seeds.
        5. **Placeholders or Stubs.** Remaining Annex A32 jobs still lack wrappers but can now reuse the exported recorder without additional scaffolding.
        6. **Duplicate Functions.** Twilio delivery and CRM metrics rely on the same helper, removing duplicate timer code for outbound integrations.
        7. **Improvements Needed.** Add alerts keyed off `outcome=partial` and instrument the other queue workers with the same recorder.
        8. **Styling Improvements.** Probe responses now package nested readiness/liveness dictionaries, standardising key casing for API consumers.
        9. **Efficiency Analysis.** High-resolution timers convert `process.hrtime.bigint()` into milliseconds so dashboards catch sub-second variance in reminder batches.
        10. **Strengths to Keep.** Config-driven enablement flags, audit trails, and retry loops remain while gaining transparent telemetry.
        11. **Weaknesses to Remove.** Automated regression tests should assert that `/status` respects HEAD requests and that metrics increment as expected.
        12. **Palette.** Health payloads stick to `ready`, `degraded`, and `down`, aligning with existing status colour tokens across ops tooling.
        13. **Layout.** Summary responses embed `liveness` and `readiness` sections so monitoring UIs can slot them into cards without reshaping data.
        14. **Text Analysis.** Error fields bubble up provider codes (e.g., Twilio `code`), improving pager copy when dispatches fail.
        15. **Spacing.** Background job counters include separate `processed`, `succeeded`, and `failed` labels so dashboards can render stacked visualisations cleanly.
        16. **Shape.** New `/` and `/status` endpoints provide canonical health entry points, reducing ad-hoc check shapes across environments.
        17. **Effects.** Integration retries and message failures now surface as metric spikes, visualising external outage impact immediately.
        18. **Thumbs.** Capture screenshots of Grafana tiles once dashboards ingest the new series for on-call runbooks.
        19. **Media.** Incorporate the summary response schema into observability diagrams to explain how readiness cascades across services.
        20. **Buttons.** The job still respects the `enabled` flag; consider surfacing that state through `/status` so operators see toggles at a glance.
        21. **Interact.** `/status` supports HEAD for lightweight probes while returning the same aggregated story as GET.
        22. **Missing.** Backfill Prometheus alerts for `outcome=failure` and expand probe contract tests to cover HEAD semantics and degraded states; Twilio metric stubs are now verified in unit tests.
        23. **Design.** Observability helpers consolidate instrumentation so future queue workers and probes align without bespoke code.
        24. **Clone.** Exported recorders prevent new jobs from rewriting the same instrumentation loops.
        25. **Framework.** Document the background job metric schema (`edulure_background_job_runs_total`, etc.) for the platform governance pack.
        26. **Checklist.** Add release gates verifying `/status` appears in load balancer configs and that metrics registry registers the new counters.
        27. **Nav.** Update operational runbooks to reference `/status` and the job metric names for quick troubleshooting.
        28. **Release.** Stage metrics on a canary worker, update dashboards, and brief on-call rotations before promoting the new observability stack.
         - 12.F.1 communityReminderJob (backend-nodejs/src/jobs/communityReminderJob.js)
         - 12.F.2 probes (backend-nodejs/src/observability/probes.js)
         - 12.F.3 backend-nodejs/src/jobs (found at backend-nodejs/src/jobs)
      - ✅ 12.G Database Seeds & Migrations
         - 12.G.1 20250213143000_creation_studio (backend-nodejs/migrations/20250213143000_creation_studio.js)
         - 12.G.2 002_search_documents (backend-nodejs/seeds/002_search_documents.js)
         - 12.G.3 backend-nodejs/database/migrations (found at backend-nodejs/database/migrations)
      - ✅ 13.A Infrastructure Blueprints (`infrastructure/terraform/modules/backend_service`, `infrastructure/observability`, `infrastructure/docker/nginx.conf`)
        1. **Environment Topology.** `infrastructure/terraform/modules/backend_service` now emits CloudWatch alarms, dashboards, and SSM blueprints so Annex A46 spans compute, networking, and observability metadata in one module.
        2. **Provisioning Controls.** CPU and memory alarms (`aws_cloudwatch_metric_alarm.cpu_high`, `.memory_high`) subscribe to configurable SNS topics, providing automated rollback hooks for deployment orchestration.
        3. **Scaling Context.** Blueprint payload serialises desired/max task counts, target utilisation, and health-check paths, giving pipelines deterministic cues before scaling events.
        4. **Credential Hygiene.** The SSM blueprint parameter (toggled via `blueprint_parameter_name`) stores JSON with subnet IDs, security group, and Secrets Manager references while inheriting environment tags.
        5. **Observability Stack.** `observability.tf` publishes a CloudWatch dashboard that correlates ECS utilisation, ALB throughput, and response time while exporting hashed artefact references consumed by the blueprint registry and Grafana.
        6. **Dashboards.** `infrastructure/observability/grafana/dashboards/environment-runtime.json` mirrors the Terraform metrics, exposes the SSM blueprint stat, and now ships with a checksum tracked by the manifest and parity service.
        7. **Operational Docs.** `infrastructure/observability/README.md` documents data sources, alarm wiring, registry hydration (`environment_blueprints`), and how parity checks escalate blueprint drift alongside dashboard guidance.
        8. **Runtime Exposure.** `infrastructure/docker/nginx.conf` adds an `/ops/runtime-blueprint.json` endpoint plus the `X-Env-Blueprint` header so on-call tooling can fetch the active environment manifest without backend hops.
        9. **Caching & Security.** Blueprint endpoint responses disable caching, inherit strict headers, and default the blueprint path to `/edulure/$host/api/environment-blueprint` for deterministic lookup.
        10. **Manifest Cohesion.** `infrastructure/environment-manifest.json` now embeds blueprint paths, hashed modules/dashboards, version metadata, and an environment-specific registry that the database seed and pipeline tooling ingest.
        11. **Strengths to Keep.** Terraform module remains idempotent, centralises logging, hydrates the blueprint registry, and keeps deployment circuit breaker defaults intact.
        12. **Weaknesses to Remove.** Future iterations should stream alarm state into the registry, extend parity checks to SSM payload integrity, and broaden alert coverage (e.g., throttled requests).
        13. **Change Checklist.** Ensure SNS topics exist, provision the Grafana dashboard via IaC, and publish the SSM parameter before toggling the Nginx header in production.
        14. **Release Steps.** Roll out to staging, verify `/ops/runtime-blueprint.json`, confirm alarms fire via synthetic load, and promote to production alongside updated pipeline manifests.
      - ✅ 13.B Security & Automation Scripts (`scripts/security/generate-license-report.mjs`, `scripts/release/deployment-pipeline.mjs`)
        1. **CI Integration.** License script now supports `--ci`, `--summary-path`, and `--pipeline-manifest` flags so Annex A47 outputs Markdown summaries and JSON manifests for GitHub runners.
        2. **Policy Orchestration.** Violations render into `policy-violations.json`, Markdown digests, and aggregated severity data for downstream alerts.
        3. **Failure Semantics.** `--no-fail-on-violation` allows gated stages to continue while still surfacing findings, aligning with approval workflows.
        4. **Pipeline Manifest.** Generated manifest enumerates inventory, policy-review, and artifact publication steps so Annex B8 has machine-readable checkpoints.
        5. **Deployment Blueprint.** `scripts/release/deployment-pipeline.mjs` now surfaces blueprint metadata (version, module hashes, SSM parameter, runtime endpoint) alongside Terraform directories so Annex A47/B8 runbooks reference the same registry artefacts as parity checks.
        6. **Phase Coverage.** Pipeline plan covers build, security, infrastructure, deployment, and verification phases, including JSON/Markdown outputs that validate the live blueprint endpoint with explicit `curl` headers.
        7. **Command Hygiene.** Markdown renderer escapes backticks, annotates blueprint registry context, and surfaces explicit commands, enabling copy-paste friendly runbooks.
        8. **Manifest Hooks.** Environment manifest references the pipeline script, license manifest, and `environment_blueprints` registry so CI/CD tooling can locate automation outputs deterministically.
        9. **Gaps.** Future work should ingest readiness results automatically, reconcile the blueprint registry against live SSM payloads, and attach severity scoring to npm audit output for richer dashboards.
        10. **Release Steps.** Validate license summary generation locally, commit pipeline manifest outputs in CI artifacts, and announce new commands to release engineers.
      - ✅ 14.A TypeScript SDK & Tooling (`sdk-typescript/scripts/generate-sdk.mjs`, `sdk-typescript/src/runtime/configure.ts`, `sdk-typescript/src/runtime/client.ts`, `sdk-typescript/src/runtime/manifest.ts`, `sdk-typescript/src/generated/.manifest.json`, `sdk-typescript/src/index.ts`)
         - 14.A.1 sdk-typescript/scripts (found at sdk-typescript/scripts)
            1. **Appraise.** Within `sdk-typescript/scripts/generate-sdk.mjs` and runtime modules under `sdk-typescript/src/runtime/*`, the SDK toolchain now exposes manifest-driven metadata, client bootstrapping helpers, and documented CLI ergonomics so API consumers align with backend releases.
            2. **Function.** The generator accepts `--spec`, `--out`, `--force`, `--dry-run`, and `--summary` flags, parses `backend-nodejs/src/docs/openapi.json`, and emits `.openapi-hash` plus `.manifest.json` artefacts alongside regenerated TypeScript bindings.
            3. **Usefulness.** `createSdkClient` now freezes the entire service registry (`AdminMonetizationService`, `AdsService`, `AnalyticsService`, `BillingService`, `CommunitiesService`, `EnablementService`, `EnvironmentService`, `ExplorerService`, `GovernanceService`, `ObservabilityService`, `ReleaseService`, `SecurityOperationsService`, `TelemetryService`, `DefaultService`) while `configureSdk` auto-infers the OpenAPI version from the manifest so runtime consumers, migrations, and seeded data stay anchored to the active surface area.
            4. **Redundant.** Prior ad-hoc scripts and manual version bumps are replaced by a hash-aware generator and manifest helpers (`getSdkManifest`, `describeSdk`, `isManifestFresh`) centralising drift detection.
            5. **Placeholders.** Watch-mode regeneration and multi-spec orchestration remain future work; CLI currently processes a single OpenAPI document per invocation.
            6. **Duplicates.** Service discovery logic is consolidated within `runtime/client.ts`, avoiding repeated imports across downstream packages.
            7. **Improvements Needed.** Next iteration should surface retry configuration and spec diffing directly within the generator summary to pre-empt contract regressions.
            8. **Styling Improvements.** Console output now uses `[api-sdk]` prefixes and tabular summaries, standardising release logs across CI and local runs.
            9. **Efficiency Analysis.** SHA-256 caching skips regeneration when the spec hash is unchanged while still refreshing manifests (including service/model counts), eliminating redundant codegen passes in CI and ensuring seed data remains in lockstep with generated clients.
            10. **Strengths to Keep.** Hash-based idempotence, manifest emission, and service registry freezing deliver predictable SDK builds with runtime safety nets.
            11. **Weaknesses to Remove.** Generator still depends on Node `process.env` for proxies (see npm warning); plan migration to explicit CLI options for proxy handling.
            12. **Palette.** Logging adopts concise severity-neutral phrasing, ensuring automation transcripts remain accessible without colour-coded dependencies.
            13. **Layout.** Runtime modules (`configure.ts`, `client.ts`, `manifest.ts`) now sit under `sdk-typescript/src/runtime`, mirroring generated core/service folders for intuitive discovery.
            14. **Text.** CLI help strings and manifest descriptors emphasise spec paths (`backend-nodejs/src/docs/openapi.json`) so documentation accurately cites source contracts.
            15. **Spacing.** Script refactor aligns with Prettier conventions (two-space indentation) and uses destructuring to keep option parsing compact.
            16. **Shape.** `ConfigureSdkOptions` now extends to `userAgent` and `onConfig`, enabling ergonomic injection of headers and observers without leaking OpenAPI internals.
            17. **Effects.** Summary tables highlight spec hash prefixes and operation counts (e.g., 172 operations in v1.51.0), providing instant visibility into surface area changes.
            18. **Thumbs.** `describeSdk()` returns a human-readable label for release notes, supporting copy-paste into change logs and customer comms.
            19. **Media.** The `.manifest.json` file now persists generator provenance, timestamp, enumerated services, and model counts—ready for embedding into release dashboards that cross-check database schema, migrations, and seed coverage.
            20. **Buttons.** CLI execution examples (`npm --prefix sdk-typescript run generate -- --summary`) give release engineers a single command pathway for regen plus auditing.
            21. **Interact.** `listAvailableServices()` and `getService()` expose discoverable integration points, sourcing keys from the manifest when available so dynamic clients, migrations, and telemetry pipelines agree on the exported service catalogue.
            22. **Missing.** Automated publication to NPM remains manual; integrate with release pipeline once audit trails and signing are finalised.
            23. **Design.** Manifest helpers freeze configuration objects to prevent runtime mutation, aligning with the platform's immutability-first SDK guidelines.
            24. **Clone.** Centralised manifest utilities eliminate repeated JSON parsing across consuming modules, reducing drift between service usage patterns.
            25. **Framework.** Script now reads `package.json` to log the `openapi-typescript-codegen` version, supporting governance requirements for dependency traceability.
            26. **Checklist.** Release steps include running `npm --prefix sdk-typescript run build`, committing `.manifest.json`, and capturing CLI summaries in release notes.
            27. **Nav.** Service registry keys (`adminMonetization`, `ads`, `analytics`, `billing`, `communities`, `enablement`, `environment`, `explorer`, `governance`, `observability`, `release`, `securityOperations`, `telemetry`, `core`) provide quick reference anchors for documentation, typed imports, and database view mapping notes.
            28. **Release.** Shipping workflow: regenerate SDK, review manifest hash, bump package version, publish runtime helpers, and circulate summary tables to downstream teams.
      - ✅ 14.B Update Templates & Release Guides (`update_template/backend_updates/backend_change_log.md`, `update_template/backend_updates/api_changes.md`, `update_template/backend_updates/backend_new_files.md`, `update_template/backend_updates/other_backend_updates.md`)
         - 14.B.1 update_template/backend_updates (found at update_template/backend_updates)
            1. **Appraise.** Backend release templates now incorporate SDK regeneration notes so Annex A47 covers both infrastructure and client distribution narratives.
            2. **Function.** `backend_change_log.md` enumerates the new manifest-aware generator, ensuring infra/automation callouts mention SDK tooling enhancements.
            3. **Usefulness.** `api_changes.md` summary explicitly calls out `.manifest.json` publication (including service/model counts), guiding auditors on where to find spec hashes and how to validate schema, migration, and seeding coverage before sign-off.
            4. **Redundant.** Prior blanket statement of “no new backend files” is narrowed to list the manifest, preventing duplicate explanations across templates.
            5. **Placeholders.** Additional annexes for mobile SDKs remain TODO; current update focuses on TypeScript tooling until parity templates exist.
            6. **Duplicates.** `other_backend_updates.md` centralises developer experience guidance, avoiding repeated CLI references across the pack.
            7. **Improvements Needed.** Future revisions should embed checklist tables capturing command output snippets directly within the templates.
            8. **Styling.** Template bullets now include inline code fences (e.g., `npm --prefix sdk-typescript run generate -- --summary`) to align with release style guides.
            9. **Efficiency Analysis.** Highlighting manifest regeneration reduces time wasted cross-referencing backend commits and client packages during CAB reviews.
            10. **Strengths to Keep.** Templates maintain structured headings (Summary, Validation, Developer Experience) while weaving in SDK-specific steps.
            11. **Weaknesses to Remove.** Need to add automation for capturing CLI output snapshots; currently manual copy-paste is required each release.
            12. **Palette.** Plain text emphasis ensures Markdown renders consistently across Confluence, GitHub, and internal portals without colour reliance.
            13. **Layout.** Manifest mention appears under “Backend New Files,” aligning inventory sections with actual artefact outputs.
            14. **Text.** Language emphasises release accountability (“publish the `.manifest.json` fingerprint”) clarifying action-oriented tasks.
            15. **Spacing.** Section spacing preserved for readability across exported PDFs; bullet indentation unchanged.
            16. **Shape.** Template sections continue to use level-two headings, maintaining compatibility with automated doc stitching scripts.
            17. **Effects.** Callouts instruct capturing CLI summaries, making release notes more actionable for stakeholders scanning for risk cues.
            18. **Thumbs.** CLI examples double as quick-start notes for incident responders verifying SDK freshness mid-cycle.
            19. **Media.** Manifest references pave the way for embedding spec hashes into dashboards without altering template structure.
            20. **Buttons.** Template instructions highlight a single canonical command, reducing release-time branching decisions.
            21. **Interact.** Guidance encourages cross-team collaboration by pointing data consumers to hashed manifests during go/no-go calls.
            22. **Missing.** Need a future appendix for verifying built artefacts in `dist/`; current templates stop at manifest commit confirmation.
            23. **Design.** Release guide copy mirrors the SDK logging prefix `[api-sdk]`, reinforcing consistent nomenclature across artefacts.
            24. **Clone.** Consolidated manifest messaging prevents each functional template from restating context in conflicting ways.
            25. **Framework.** Templates now align with governance requirements to document codegen outputs as part of release evidence packages.
            26. **Checklist.** Action items now include regenerating SDK, capturing CLI summary, listing manifest in new-files inventory, and reconciling manifest service totals against database migrations and seed snapshots.
            27. **Nav.** Clear headings point reviewers to manifest updates without scanning unrelated infrastructure notes.
            28. **Release.** Updated guides instruct teams to run the generator, publish hashes, and attach summaries to the backend change log before CAB submission.
      - ✅ 15.A Docs & unresolved mappings (`backend-nodejs/migrations/20250115104500_navigation_annex.js`, `backend-nodejs/seeds/004_navigation_annex.js`, `backend-nodejs/src/repositories/NavigationAnnexRepository.js`, `backend-nodejs/src/controllers/NavigationAnnexController.js`, `backend-nodejs/src/routes/navigation.routes.js`, `frontend-reactjs/src/api/navigationAnnexApi.js`, `frontend-reactjs/src/context/NavigationMetadataContext.jsx`, `frontend-reactjs/src/components/navigation/AppNotificationPanel.jsx`, `frontend-reactjs/src/pages/handbook/NavigationAnnex.jsx`, `docs/product/navigation-backlog.md`, `docs/operations/navigation-readiness.md`, `docs/design-system/navigation-annex.md`, `docs/strategy/navigation-briefing.md`)
         - 15.A.1 Documentation Coverage Gap (Annex A53 — Product backlog)
            1. **Appraise.** `navigation_annex_backlog_items` now stores the Annex A53 backlog introduced in migration `backend-nodejs/migrations/20250115104500_navigation_annex.js`, replacing ad-hoc Markdown summaries with canonical records.
            2. **Function.** `NavigationAnnexRepository.describe` aggregates backlog rows, dedupes epics, and exposes them through `GET /api/v1/navigation/annex` so the handbook and notification panel use the same payload.
            3. **Usefulness.** `frontend-reactjs/src/api/navigationAnnexApi.js` normalises the response and `NavigationMetadataContext.jsx` feeds it into the UI, giving every surface up-to-date backlog data without duplicating logic.
            4. **Redundant.** The static `frontend-reactjs/src/navigation/metadata.js` file was removed, eliminating divergent route metadata definitions.
            5. **Placeholders.** Seed data in `backend-nodejs/seeds/004_navigation_annex.js` provides deterministic epics (UX-401, UX-402, OPS-218, OPS-219) so environments share the same backlog until live editing arrives. The legacy SQL script remains available under `backend-nodejs/database/seeders/003_seed_navigation_annex.sql` for manual maintenance but is no longer the source of truth.
            6. **Duplicates.** Repository sorting collapses multiple rows per nav item into a single initiative, preventing duplicate backlog cards in the handbook.
            7. **Improvements Needed.** Extend the seeds to cover additional navigation items and add automated tests around `NavigationAnnexRepository` to guard against regression.
            8. **Styling.** `NavigationAnnex.jsx` gained loading and error states while preserving the existing annex layout and typography.
            9. **Efficiency.** The repository queries each annex table once, memoising results inside the request cycle, and the frontend caches results for one minute via `httpClient` response caching.
            10. **Strengths to Keep.** `docs/product/navigation-backlog.md` now documents how the seeds, migration, and API tie together so future updates remain traceable.
            11. **Weaknesses to Remove.** Backlog edits still require manual seeder updates; plan a lightweight admin form or CLI wrapper to reduce friction.
            12. **Palette.** Handbook sections reuse existing slate and primary tokens, avoiding new palette debt while surfacing real backlog content.
            13. **Layout.** Section grouping in `NavigationAnnex.jsx` now key off annex data, ensuring anchors and quick links stay aligned with the database.
            14. **Text.** Updated docs call out the migration and API endpoints, giving contributors concrete instructions for maintaining Annex A53.
            15. **Spacing.** Loading and error callouts respect the 8px grid and rounded corners used elsewhere in the handbook.
            16. **Shape.** The backlog chips still rely on rounded pills, keeping parity with other annex sections.
            17. **Effects.** Notification panel rows maintain existing hover/focus treatments while new annex data is injected.
            18. **Thumbs.** Product epics reference evidence capture (screenshots, logs) inside `docs/product/navigation-backlog.md`, reminding teams to attach artefacts during reviews.
            19. **Media.** The backlog doc instructs teams to archive performance captures and breadcrumbs alongside annex updates.
            20. **Buttons.** “View execution plan” links now route through `NavigationMetadataProvider` navigation callbacks, using the new annex hrefs.
            21. **Interact.** `NavigationMetadataContext` exposes a `refresh` helper so handbook readers can pull fresh data without reloading the page.
            22. **Missing.** Add integration tests that hit `/api/v1/navigation/annex` with different roles to verify scoping logic once fixtures expand.
            23. **Design.** The annex card layout remains unchanged, but now displays real impacted files drawn from the database rather than prose.
            24. **Clone.** Removing the local metadata file prevents future drift between docs, notifications, and handbook content.
            25. **Framework.** Repository logic is plain Knex and JSON parsing, making it easy to port to other services that need annex data.
            26. **Checklist.** `docs/product/navigation-backlog.md` now walks through updating `backend-nodejs/seeds/004_navigation_annex.js`, reseeding the database, and validating the Annex API for release readiness.
            27. **Nav.** Route metadata now flows from the database, so anchors like `/handbook/navigation-annex#feed-registry` map directly to seeded backlog entries.
            28. **Release.** Ship backlog changes by applying the navigation annex migration if needed, rerunning the seed script, validating `/api/v1/navigation/annex`, and smoke-testing the handbook.
         - 15.A.2 Operations Coverage Gap (Annex A54 — Runbooks & enablement)
            1. **Appraise.** `navigation_annex_operation_tasks` captures Annex A54 checklists, ensuring operational tasks align with seeded backlog items.
            2. **Function.** Repository logic filters tasks by role and `include_in_checklist`, feeding `AppNotificationPanel` and `docs/operations/navigation-readiness.md` with identical data.
            3. **Usefulness.** Loading states and error copy in `AppNotificationPanel.jsx` make annex availability visible to operators instead of silently failing.
            4. **Redundant.** Manual instructions referencing `mapNavigationToInitiatives` were removed; the new API serves as the single source of truth.
            5. **Placeholders.** Seeds provide operational tasks for feed, course discovery, quick actions, and upload readiness until dynamic authoring is delivered.
            6. **Duplicates.** Task keys (e.g., `ops-feed-registry-audit`) are unique in the table, preventing duplicate checklist entries when multiple roles share a surface.
            7. **Improvements Needed.** Add automated coverage to verify `include_in_checklist` and cadence sorting when more roles are introduced.
            8. **Styling.** Error banners in the notification panel reuse existing rose colour tokens to highlight annex fetch issues without introducing new styles.
            9. **Efficiency.** Role filtering occurs server-side and the frontend caches responses, reducing redundant work when users reopen the panel.
            10. **Strengths to Keep.** `docs/operations/navigation-readiness.md` now enumerates each annex task with references to the seeded keys, guiding release managers.
            11. **Weaknesses to Remove.** Ownership of annex seeds is not yet codified; assign maintainers per runbook section to avoid stale data.
            12. **Palette.** Notification chips and banners continue using the established slate and primary palette.
            13. **Layout.** Checklist rows retain the flexible grid introduced previously, accommodating annex data without overflow.
            14. **Text.** Operational docs instruct teams to query `/api/v1/navigation/annex?role=instructor` so they can verify seeds from tooling.
            15. **Spacing.** Loading and error list items respect the standard padding and gap tokens.
            16. **Shape.** Checklist cards maintain rounded-rectangle styling, ensuring annex tasks feel native to the panel.
            17. **Effects.** Interactions (hover/focus) remained intact for the “View runbook” CTA thanks to unobtrusive data injections.
            18. **Thumbs.** Tasks call for archiving evidence (e.g., screenshots, console logs) reinforcing operational accountability.
            19. **Media.** Readiness docs now reference screenshot capture requirements tied to annex task IDs.
            20. **Buttons.** Runbook links point at updated anchors within the operations handbook, using annex hrefs seeded in the database.
            21. **Interact.** Operators can revisit the panel after refreshing the annex API to confirm tasks cleared, aided by the new loading states.
            22. **Missing.** Add CLI tooling to insert annex tasks during incident retros once requirements expand beyond the seed set.
            23. **Design.** The operations section header still brands the list as Annex A54, reinforcing context while new data streams in.
            24. **Clone.** Eliminating hard-coded checklists avoids copy-paste drift between docs, UI, and runbooks.
            25. **Framework.** Annex tasks are plain SQL rows, making it easy for other services to consume them if needed.
            26. **Checklist.** Release checklist now requires updating seeds, verifying the API response, and confirming notification panel rendering during staging sign-off.
            27. **Nav.** Runbook anchors (e.g., `#navigation-registry-validation`) are referenced directly from annex hrefs stored in the database.
            28. **Release.** Ship operational updates by seeding new tasks, re-running `npm --workspace backend-nodejs run seed`, validating `/api/v1/navigation/annex`, and rehearsing the runbook.
         - 15.A.3 Design System Dependencies (Annex A55 — `user_experience.md`)
            1. **Appraise.** Design dependencies are now persisted in `navigation_annex_design_dependencies`, aligning Annex A55 with the actual token usage across navigation surfaces.
            2. **Function.** The repository groups tokens, QA checks, and references per navigation item and surfaces aggregate data for the notification panel and handbook.
            3. **Usefulness.** `docs/design-system/navigation-annex.md` references the database-backed annex so designers know exactly how to update seeds when tokens shift.
            4. **Redundant.** The removed metadata module no longer duplicated token lists; the annex API is authoritative.
            5. **Placeholders.** Seeds cover feed spacing, course skeleton palettes, and instructor upload progress tokens until further design dependencies are catalogued.
            6. **Duplicates.** Dependency keys enforce uniqueness (e.g., `feed-focus-outline`), avoiding repeated QA steps across surfaces.
            7. **Improvements Needed.** Expand seeds to capture additional navigation components and add automated linting to ensure components adopt required tokens.
            8. **Styling.** Notification panel chips and QA lists now show live annex data while keeping original design treatments.
            9. **Efficiency.** Aggregated sets dedupe tokens/refs so repeated entries are collapsed before reaching the UI.
            10. **Strengths to Keep.** The annex API supports future consumers (e.g., Storybook) without adding bespoke endpoints.
            11. **Weaknesses to Remove.** Manual seed edits risk human error; consider exposing a design ops CLI for safer updates.
            12. **Palette.** No new palette requirements—existing token badges continue using neutral slate styles.
            13. **Layout.** Design annex sections in the handbook still align with the responsive grid while listing seeded dependencies.
            14. **Text.** QA copy references specific accessibility targets (focus-visible, prefers-reduced-motion) lifted from the seeds.
            15. **Spacing.** Token chips and QA lists honour the same spacing tokens as before, now populated dynamically.
            16. **Shape.** Rounded token capsules mirror other design system callouts, reinforcing consistency.
            17. **Effects.** Hover styles for reference links remain unchanged, confirming data injection didn’t regress focus cues.
            18. **Thumbs.** Annex instructions still call for capturing contrast checks and screenshots to document design sign-off.
            19. **Media.** Handbook references point designers back to source files for visual audits.
            20. **Buttons.** No new buttons added; existing interactions remain stable with live data.
            21. **Interact.** Designers can refresh the annex context to verify token updates once seeds are rerun.
            22. **Missing.** Add automated comparison between Figma tokens and annex seeds to flag drift.
            23. **Design.** Annex-driven data ensures design reviews use the same references displayed in the UI.
            24. **Clone.** Removing hard-coded lists prevents divergence between design docs and application state.
            25. **Framework.** Simple SQL-backed storage keeps annex data portable across web and mobile pipelines.
            26. **Checklist.** `docs/design-system/navigation-annex.md` documents how to run the curl command against `/api/v1/navigation/annex` to verify design dependencies.
            27. **Nav.** Handbook anchors still segment design tasks by navigation item, now sourced from seeded data.
            28. **Release.** Design sign-off requires updating seeds, seeding the database, validating the API output, and confirming notification panel plus handbook rendering.
         - 15.A.4 Strategy & Stakeholder Communication (Annex A56 — `user_experience.md`)
            1. **Appraise.** Strategy pillars, narratives, and metrics are stored in `navigation_annex_strategy_narratives` and `navigation_annex_strategy_metrics`, synchronising Annex A56 across interfaces.
            2. **Function.** `NavigationAnnexRepository` groups metrics by pillar and surfaces aggregated narratives for the notification panel and docs.
            3. **Usefulness.** `docs/strategy/navigation-briefing.md` now maps seeded metrics (e.g., `nav-click-depth`, `upload-readiness-pass-rate`) directly to API output, aiding stakeholder briefings.
            4. **Redundant.** Previous prose-only goals have been replaced with measurable targets seeded in the database.
            5. **Placeholders.** Initial seeds cover retention, activation, and efficiency pillars while leaving room to expand coverage.
            6. **Duplicates.** Metric keys are unique per narrative, preventing duplicate KPI cards in the UI.
            7. **Improvements Needed.** Hook analytics ingestion to update annex metrics automatically instead of manual seed edits.
            8. **Styling.** Strategy cards retain existing primary badges and typography while showing dynamic data.
            9. **Efficiency.** Narrative grouping ensures only relevant metrics are sent to the client, keeping payloads lean.
            10. **Strengths to Keep.** The API enables dashboards or external reports to consume the same stakeholder messaging without scraping docs.
            11. **Weaknesses to Remove.** Baseline data still requires manual verification; automate sourcing from analytics systems.
            12. **Palette.** No palette changes—strategy cards continue using subdued primary backgrounds for readability.
            13. **Layout.** Notification panel strategy section handles loading/error states gracefully with annex-driven content.
            14. **Text.** Docs and UI copy emphasise measurable outcomes, reflecting seeded baseline and target values.
            15. **Spacing.** Strategy list items keep consistent padding, ensuring metrics remain scannable.
            16. **Shape.** Rounded cards continue to match other annex sections, now populated dynamically.
            17. **Effects.** Hover/focus styles on metric rows remain unaffected by the data source change.
            18. **Thumbs.** Stakeholders are prompted to archive evidence (e.g., dashboard exports) per seeded metric as part of release comms.
            19. **Media.** Briefing doc encourages attaching analytics snapshots corresponding to annex metrics.
            20. **Buttons.** No CTA changes; strategy section focuses on at-a-glance metrics.
            21. **Interact.** Annex API enables tooling to fetch metrics filtered by role (e.g., instructor vs. admin) thanks to repository scoping.
            22. **Missing.** Introduce automated alerts when annex metrics fall outside targets once analytics integrations land.
            23. **Design.** Strategy cards remain on brand while communicating seeded KPIs, ensuring executives see accurate goals.
            24. **Clone.** Centralising metrics in the database prevents drift between decks, docs, and UI summaries.
            25. **Framework.** The simple schema supports future exports (CSV, PDFs) without bespoke transformations.
            26. **Checklist.** `docs/strategy/navigation-briefing.md` explains how to rerun seeds and validate annex data via curl, tying strategy updates to tangible steps.
            27. **Nav.** Pillar order in the notification panel mirrors seeded display orders, keeping leadership narratives predictable.
            28. **Release.** Update seeds, reseed the database, validate annex API output, and brief stakeholders with refreshed metrics to close Annex A56.
