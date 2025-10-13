# Page Updates – Version 1.50 Task 2

## `/login`
- Replaced static marketing copy with a production form leveraging `AuthContext.login`, inline error states, and MFA placeholders.
- Adds navigation to `/content` after successful authentication to streamline instructor workflows.

## `/register`
- Mirrors hardened authentication styling with actionable onboarding copy and real form state handling via shared `FormField` component improvements.

## `/content`
- New instructor content hub listing Cloudflare R2 assets with status tags, action buttons, analytics sidebar, and embedded viewers.
- Supports uploads with checksum generation, presigned PUT submission, ingestion confirmation, and client-side caching.

## `/feed`
- React feed now consumes live `/api/communities` endpoints via `communityApi.js`, replacing mock data with authenticated pagination, aggregated feeds, and community-specific queries.
- `Feed.jsx` orchestrates community switching, feed pagination, and resource loading states with accessible error handling, ensuring aggregated views skip redundant resource calls while member-only hubs render role badges and metadata.
- `CommunityProfile.jsx`, `CommunitySwitcher.jsx`, and `TopBar.jsx` introduce production-ready resource drawers, load-more controls, focus-visible switcher states, and localisation-friendly metadata formatting aligned with design overlays.

## `/explorer`
- Launched the cross-entity Explorer surface that hydrates communities, courses, ebooks, tutors, and events from `/api/explorer/search`, wiring tab counts to live result totals and persisting filters in controlled React state so navigation between entities never loses context.
- Added adaptive filter rails that materialise only when relevant facets are returned from the backend (category, price, availability, proficiency, location) and expose clear-all/reset-to-saved interactions with analytics IDs captured for each combination.
- Integrated saved search governance with inline create, rename, pin, apply, and delete actions that call the new saved-search endpoints; modal flows harden validation, optimistic loading states, and success/error toasts for production telemetry.
- Embedded a geospatial panel that renders backend-provided coordinates via `react-simple-maps` and the bundled `world-110m.json` topojson so learners can scan global supply quickly; markers cluster by entity type, highlight hovered cards, and support keyboard focus for accessibility.
- Hardened empty, error, and zero-result states with prescriptive education, quick-start filters, and instrumentation hooks that align with the explorer QA scripts captured in the design documents.

## `/analytics`
- Promoted the explorer intelligence dashboard into production: authenticated providers and operations users can navigate to `/analytics` to review KPI tiles, manual refresh controls, range toggles, search and CTR charts, entity breakdown tables, ads metrics, experiment status, forecast outlooks, query spotlights, and alert feeds that hydrate from `ExplorerAnalyticsService` endpoints with WCAG-compliant dark mode styling, empty-state messaging, and 401-safe fallbacks.

## `/profile`
- Replaced the legacy stub with a production profile dashboard that hydrates `/api/profiles/{id}/overview` via `useProfileOverview` (React Query + cache TTL) and renders hero metrics, verification badges, follower/engagement insights, programme shelves (courses, communities, ebooks), quick actions, and an activity timeline.
- Added resilient loading, skeleton, and error states plus cache revalidation on focus and manual refresh so learners always see accurate stats even when aggregations are rebuilding.
- Surfaced actionable CTAs (edit profile, manage availability, view statements) gated by feature flags/runtime config values, mirroring design specifications from `Profile Look.md`, `Profile Styling.md`, and `dashboard_drawings.md`.

## `/dashboard/instructor/pricing`
- Introduced a monetisation workspace that consumes the `dashboard.pricing` aggregate to render course offer funnels, subscription tier summaries, live session pricing telemetry, and revenue mix progress bars with CTA rails for exporting finance reports, configuring pricing rules, and promoting sessions.
- Navigation now exposes a Monetisation tab for instructors, and the dashboard search overlay indexes the new route so providers can pivot directly from analytics or course management views.
- Layout, progress visualisations, and insight copy mirror the monetisation overlays specified in `dashboard_drawings.md`, `menu_drawings.md`, and `Application_Design_Update_Plan/Application Design Update.md`.

## Layout & Navigation
- `MainLayout` now renders auth-aware navigation items linking to the content library, explorer analytics, and login/register flows. Navigation visibility for the admin console and analytics dashboard honours backend feature flag snapshots and authentication to prevent unauthorised access.
- `AuthContext` provider wraps the app in `main.jsx` to propagate session state across routes and components.

## `/admin`
- Implements runtime flag gating: when `admin.operational-console` is disabled the page renders a disable banner with the configured escalation channel and hides operational widgets.
- When enabled, the page fetches `/api/admin/console` snapshots via `adminApi.js`, hydrates KPI tiles, approvals, incidents, refunds, support backlog, and policy sections, and surfaces lookback selectors, invite CTAs, and resilient loading/error states that mirror the operational console wireframes.
- Queue cards render status/urgency/severity badges, SLA countdowns, and latest-event summaries to keep agents aligned with backend analytics, while policy cards expose owner/review metadata for compliance teams.
