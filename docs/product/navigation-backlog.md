# Navigation remediation backlog (Annex A53)

This backlog turns the navigation and shell findings from `user_experience.md` into discrete epics with code anchors.

## UX-401 Shell registry {#ux-401-shell-registry}
- **Objective** – unify route metadata and breadcrumb helpers across shells.
- **Scope** – `frontend-reactjs/src/layouts/MainLayout.jsx`, `frontend-reactjs/src/navigation/routes.js`, `frontend-reactjs/src/components/navigation/AppTopBar.jsx`.
- **Deliverables** – central metadata provider, navigation annex page, regression tracking for breadcrumbs.

## UX-402 Curriculum discovery {#ux-402-curriculum-discovery}
- **Objective** – align course discovery UI with skeleton loaders and route registry exports.
- **Scope** – `frontend-reactjs/src/pages/Courses.jsx`, `frontend-reactjs/src/components/navigation/AppSidebar.jsx`, `frontend-reactjs/src/navigation/routes.js`.
- **Deliverables** – lazy metadata loading, skeleton QA benchmarks, quick links into operational handbook.

## UX-403 Community cohesion {#ux-403-community-cohesion}
- **Objective** – standardise community notification slots and chat entry points.
- **Scope** – `frontend-reactjs/src/pages/Communities.jsx`, `frontend-reactjs/src/components/navigation/AppNotificationPanel.jsx`, `frontend-reactjs/src/navigation/utils.js`.
- **Deliverables** – notification annex surfacing operations, telemetry hooks for mention metrics.

## UX-404 Tutor marketplace {#ux-404-tutor-marketplace}
- **Objective** – consolidate tutor CTA hierarchy and metadata exports.
- **Scope** – `frontend-reactjs/src/pages/TutorProfile.jsx`, `frontend-reactjs/src/components/TopBar.jsx`.
- **Deliverables** – CTA audit, runbook updates for mentor readiness, cross-shell button harmonisation.

## UX-405 Library previews {#ux-405-library-previews}
- **Objective** – introduce consistent ebook hero previews and metadata badges.
- **Scope** – `frontend-reactjs/src/pages/Ebooks.jsx`, `frontend-reactjs/src/components/content/EbookReader.jsx`.
- **Deliverables** – preview caching runbook, alt-text QA hooks, annex coverage for content ops.

## UX-406 Announcement composer {#ux-406-announcement-composer}
- **Objective** – share autosave, toast, and button handling across announcement workflows.
- **Scope** – `frontend-reactjs/src/pages/dashboard/LearnerCommunities.jsx`.
- **Deliverables** – autosave QA scenarios, macro updates for announcement templates, annex references.

## UX-407 Live scheduling {#ux-407-live-scheduling}
- **Objective** – connect scheduler to unified availability API and accessibility defaults.
- **Scope** – `frontend-reactjs/src/pages/dashboard/DashboardCalendar.jsx`.
- **Deliverables** – scheduler QA plan, mentor readiness runbook linkage, motion token adoption.

## UX-408 Content ingest {#ux-408-content-ingest}
- **Objective** – standardise upload queue behaviour and telemetry across shells.
- **Scope** – `frontend-reactjs/src/utils/uploads.js`, `frontend-reactjs/src/pages/dashboard/InstructorCourseCreate.jsx`.
- **Deliverables** – upload readiness indicator, monitoring requirements, annex link for operations enablement.
