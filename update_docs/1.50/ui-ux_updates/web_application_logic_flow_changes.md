# Web Application Logic Flow Changes (v1.50)

## Architectural Foundation
- Implemented unified state management using Redux Toolkit with normalized entities for cohorts, lessons, learners, and analytics insights.
- Introduced server-driven UI pattern for marketing modules allowing CMS-managed layouts without redeploys.
- Added WebSocket layer for real-time updates (chat, notifications, live sessions) integrated with fallback polling.
- Global shell polls the capability manifest `/api/v1/runtime/manifest`, broadcasting service availability banners and status badges to all layouts so outage messaging and refresh controls remain consistent across contexts.【F:frontend-reactjs/src/context/ServiceHealthContext.jsx†L1-L165】【F:frontend-reactjs/src/components/status/ServiceHealthBanner.jsx†L1-L96】

## Authentication & Session Management
- Login flow now supports email/password, Google, Microsoft, and SAML SSO. After authentication, the header populates with **Feed, Communities, Explore, Create, Dashboard, Profile avatar dropdown** while user redirected based on role (Learner, Provider, Admin).
- Session tokens refreshed via silent refresh every 20 minutes; inactivity logout after 60 minutes with modal warning at 55 minutes.
- Multi-factor authentication optional; enforced for enterprise tenants. Setup wizard integrated into Security settings.

## Marketing Funnel Logic
- Prospect interactions tracked through analytics; CTA clicks trigger nurture automation via webhook.
- Cohort catalog filters persist in query parameters enabling sharable URLs. Sorting and filtering updates use debounced dispatch to reduce API load.
- Enroll/Join Waitlist buttons open modal capturing lead info and preferred start date; data sent to CRM integration.

## Dashboard Routing
- Role-based routing ensures learners access Learning dashboard while providers see Management dashboard. Shared components (notifications, messages) adapt content by role.
- Breadcrumbs generated dynamically reflecting navigation hierarchy (Dashboard → Cohorts → Cohort Detail → Lesson Overview).
- Header nav order remains consistent post-routing; clicking avatar dropdown exposes role switcher, account preferences, finance settings, and sign out.

## Cohort Management Flow
- Cohort list fetches paginated data with server-side filtering. Selecting row loads detail view with lazy-loaded tabs to optimize performance.
- Curriculum tab fetches modules and lessons; editing lesson triggers drawer with autosave and version history.
- Member management actions (invite, remove, change role) executed via API; success updates table instantly, failure triggers toast with retry.
- Analytics tab requests aggregated metrics, caches by filter selection for 10 minutes.

## Content Publishing Flow
- Content creation wizard parallels provider mobile experience: Steps (Details, Content Blocks, Assessment, Review). Each step validates fields before allowing proceed.
- Publishing triggers asynchronous job; UI shows progress indicator and final confirmation when job completes. Notifications inform assigned cohorts.
- Versioning stores previous iterations accessible via history modal; revert action available.

## Messaging & Notifications
- Messaging panel loads conversation list via WebSocket subscription. Fallback to REST when connection lost. Messages stored locally to allow quick scroll.
- Notifications center aggregates events with severity levels. Mark-as-read updates server and removes badge counts across sessions.
- Email preferences controlled via Notifications settings; toggling triggers API call and success toast.

## Analytics & Reporting
- Analytics hub uses modular widgets configured via JSON schema. Users can reorder widgets; layout saved per user.
- Report builder exports (PDF, CSV) processed asynchronously; job status displayed in notification panel with download link.
- Insights engine triggers suggestions (e.g., "Learners with low engagement"). Accepting suggestion creates task in task list.

## Resource Library Flow
- Filters update URL state. Selecting resource opens modal with preview, metadata, and action buttons (Assign, Download, Save).
- Assign action opens secondary modal to choose cohort and schedule; success triggers toast and updates assigned count.
- Version history accessible via tab; revert downloads previous version.

## Settings Flow
- Settings navigation uses nested routes. Each subsection loads form with initial data fetched on demand.
- Changes use optimistic updates; failure reverts values and surfaces error summary.
- Team management invites send email via backend service; UI displays pending invites and allows resend.
- Finance settings manage wallet funding sources, tax forms, payout schedules, and invoice downloads with validation gating before activation.
- Account preferences persist notification cadence, accessibility options, localization, and privacy toggles with change history logged for audit.

## Community & Events
- Community feed fetches paginated discussions; posting comment triggers optimistic append and server confirmation.
- Event registration interacts with calendar integration; successful registration updates user’s personal schedule and triggers email confirmation.
- Live session viewer integrates with WebRTC; fallback to embedded stream if browser unsupported.
- Community switcher maintains state of last visited community, stores pinned communities, and syncs unread counters via WebSocket updates.

## Support Flow
- Help center search uses Algolia integration; results shown as user types. Clicking article opens detail page with feedback controls.
- Contact form collects issue type, description, attachments; submission triggers support ticket creation and confirmation message.
- Chatbot widget provides automated troubleshooting with escalation path to live agent.

## Purchase & Checkout Flow
- Pricing selection pushes chosen SKU into checkout context; promo codes validated asynchronously with error messaging.
- Wallet balance check occurs before payment initiation; if insufficient, prompt to add funds or select alternate method.
- Payment submission integrates with PCI-compliant service; success triggers order confirmation event, failure surfaces retry with saved state.
- Post-purchase logic enrolls user into selected cohort/course, sends receipts, and queues onboarding checklist tasks.

## Admin Control Panel Flows
- Admin landing aggregates KPIs via consolidated API; clicking tile deep links to corresponding module with filters pre-applied.
- Governance actions (role permission updates, feature toggles) require MFA confirmation and log entries with diff snapshots.
- Audit log supports filtering and export; export job processed asynchronously with download link delivered through notifications.

## Learner Panel Flow
- Panel loads personalized feed via combined timeline service merging assignments, announcements, wallet alerts.
- CTA interactions (Resume lesson, Join live session) deep link into respective modules with context preserved.
- Support quick links open modal layered on current page to avoid navigation loss.

## Instructor Panel Flow
- Task board retrieves tasks grouped by status; drag-and-drop triggers PATCH request updating status and order.
- Quick create cards launch creation wizards pre-seeded with instructor defaults and template selections.
- Messaging shortcuts open chat drawer scoped to selected cohort; unread counts sync via WebSocket.

## Messaging & Inbox Flow
- Inbox loads folder metadata, caches results for offline viewing; new messages push via WebSocket and update unread counters globally.
- Selecting conversation loads message history with lazy pagination; sending message posts to API, updates UI optimistically.
- Mentions trigger notifications and highlight within thread; attachments uploaded via pre-signed URLs.
- Floating chat bubble retains last open thread context and persists across routes using global state store.

## Profile & Preference Flow
- Profile edits occur inline; each save call updates user profile API and emits success toast. Autosave triggers after 2s inactivity.
- Privacy toggles update visibility for sections (portfolio, testimonials); changes propagate to public profile endpoints.
- Preference adjustments (language, time zone) update localization context and trigger UI rerender.

## Finance & Wallet Flow
- Wallet dashboard fetches balance, pending payouts, and ledger entries; ledger pagination supports infinite scroll.
- Add funds initiates payment micro-service; successful top-up updates balance in real time.
- Transfer requests validate amount vs. limits; confirmation triggers payout job and status notifications.
- Finance settings handle tax form uploads (with status) and invoice downloads stored in secure blob storage.

## Informational & Compliance Pages Flow
- Static content pulled from CMS with versioning; updates require admin approval before publish.
- Table of contents component listens to scroll events to update active section indicator.
- Feedback form at bottom logs suggestions to compliance inbox.

## Privacy Console Flow
- **Dashboard Load:** Hitting `/dashboard/privacy` triggers parallel requests for consent summary, open DSR queue, and data footprint metrics. Results cached for 5 minutes per tenant; stale caches invalidated when new consent event posted.
- **Metric Card Actions:** Clicking "Manage" on Active Consents opens side panel listing policy versions with status badges. Each row supports toggle, view policy, and "Download Evidence" action retrieving signed PDF receipts from secure storage.
- **Activity Timeline:** Filter chips (Consent, Export, Incident) update query parameters and refetch paginated events. Selecting item reveals drawer with event metadata, legal basis, SLA state, and escalation CTA linking to support ticket creation pre-filled with event ID.
- **Trust Resources:** Download links sign requests to CDN with 5-minute expiry; analytics event logs file type and user role. Expired certifications highlight in amber and present "Request Update" CTA sending notification to compliance team.

## Consent Management & Audit Trail Flow
- **Consent Toggle Workflow:** When user toggles marketing consent, UI displays confirmation modal summarising impact, requiring MFA if enabled. Backend call to compliance service returns receipt ID; UI stores in local state for timeline update.
- **Decline Path:** Declining prompts optional feedback form; submission posts to analytics pipeline and surfaces recommended support articles. If user declines mandatory consent (e.g., Terms update), modal enforces "Sign Out" option with explanation.
- **Export/Deletion Requests:** CTA opens guided wizard (Step 1: Confirm identity, Step 2: Select data scope, Step 3: Review). Wizard tracks progress and prepopulates last known address/timezone to align with jurisdiction rules. Completion triggers asynchronous job; UI displays request card with countdown, status, and ability to add comments/evidence.
- **Audit Evidence:** Each action logs to `data_partition_archives` reference; UI offers "Copy Event ID" button and shares context with operator dashboard for cross-squad traceability.

## Scam & Fraud Education Flow
- **Campaign Surfacing:** Privacy dashboard hero rotates campaigns; events push `safetyCampaignViewed` metrics with persona + locale tags. CTA directs to education library filtered by campaign ID.
- **Content Interaction:** Library rows expand inline to show summary, resources, and "Mark as Complete" button gating behind reading/watching progress. Videos embed secure player with DRM; completion tracked via 90% playback threshold event.
- **Acknowledgement Tracking:** Policy advisory cards include "Acknowledge" button logging timestamp and IP. Non-acknowledged advisories trigger reminder banner after 48 hours and escalate to email digest.
- **Report Fraud Shortcut:** Persistent footer button opens modal capturing channel (Email, Phone, App), description, attachments. Submission generates ticket with severity auto-classified based on campaign context and user role.

## Comment Management Flow
- Moderation queue polls flagged comments; moderators can approve/reject/edit with actions logged.
- Escalate action assigns case to admin and notifies via Slack webhook.
- Automation rules builder saves conditions to rules engine; changes propagate to moderation service without redeploy.

## Creation Studio & Content Wizards Flow
- Creation Studio tiles deep link to respective wizards with ability to resume drafts; draft state stored per user in backend.
- Wizard step transitions validate required fields; failing validation displays inline error summary and prevents advance.
- Publish actions trigger asynchronous jobs; job status tracked in notifications and creation studio dashboard.

## Course Management Flow
- Course list supports bulk selection; actions (Publish, Archive, Assign) dispatch batched API calls.
- Detail view allows editing metadata, scheduling, and resources; changes autosave with version history accessible.
- Enrollment analytics update when filters change; results cached to reduce load.

## Ebook Management Flow
- Ebook grid fetches paginated results; sorting by downloads or rating supported.
- Editing metadata or pricing triggers validation for compliance (e.g., minimum price). Updates require confirmation.
- Publishing new version invalidates cached downloads and notifies purchasers.

## Tutor Management Flow
- Tutor directory search queries backend with filters; results show availability badges.
- Assigning tutor opens modal to select cohorts; submission updates assignments and notifies tutor.
- Performance analytics card loads evaluation data; sending feedback logs message in tutor profile history.

## Communities Creation & Management Flow
- Creation form submissions create community record, assign creator as admin, and trigger welcome announcement draft.
- Management tabs lazy-load relevant data; moderation actions update counts and send notifications to moderators.
- Community switcher persists favorites locally and syncs ordering preferences to user profile.

## Community Feed Flow
- Feed uses incremental fetching; posting content updates feed optimistically and broadcasts via WebSocket to members.
- Composer quick actions open specific modals (Poll builder, Resource upload) with contextual validation.
- Comment threads support nested replies; moderation flags propagate to comment management queue.

## Main Site Feed Flow
- Personalized content generated server-side using user persona; feed merges marketing, community highlights, ad placements, and instructor spotlights delivered by the live feed aggregation service.【F:backend-nodejs/src/services/LiveFeedService.js†L73-L144】
- Infinite scroll loads next batch when near bottom; sticky filters (Context, Community, Search) update query parameters and trigger refetch, while Analytics/Highlights toggles map to `includeAnalytics` and `includeHighlights` flags on the API to keep UI in sync with REST and GraphQL responses.【F:backend-nodejs/src/docs/openapi.json†L13840-L13940】【F:backend-nodejs/test/graphqlFeedRoutes.test.js†L12-L116】
- Analytics snapshot widget queries `/feed/analytics` when toggled on, caching by range selection (7d/30d/90d/180d/365d) to avoid redundant requests during navigation.【F:backend-nodejs/test/feedHttpRoutes.test.js†L12-L97】
- Newsletter subscription inline form posts to marketing automation; success displays thank-you banner.

## Performance Optimizations
- Code splitting implemented for major routes; lazy loading with suspense fallback skeletons.
- Asset prefetching for frequently visited pages (Dashboard, Cohort detail).
- Implemented caching strategies using Service Worker for offline viewing of marketing pages.

## Error Handling & Monitoring
- Global error boundary displays friendly message with reload option; logs error to monitoring service.
- API errors categorized and surfaced via toast notifications with context. 401 errors trigger re-auth flow.
- Added instrumentation for navigation events, conversion funnel, and API latency to support telemetry dashboards.

## Deprecations
- Removed legacy Backbone-based admin panel; traffic redirected to new React experience.
- Sunsetted old notifications dropdown replaced by full-screen center.
