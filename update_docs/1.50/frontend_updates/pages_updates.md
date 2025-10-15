# Pages Updated – Version 1.50

## Global Shell & Marketing Pages
- `MainLayout` now displays a persistent service status badge in the desktop navigation and mobile menu, mirroring capability manifest output so marketing, feed, and static pages communicate active incidents without custom wiring.【F:frontend-reactjs/src/layouts/MainLayout.jsx†L24-L260】
- Injected the shared `ServiceHealthBanner` below the header to surface outages or degraded capabilities with refresh controls and impacted feature lists across all publicly-routed pages.【F:frontend-reactjs/src/components/status/ServiceHealthBanner.jsx†L1-L96】【F:frontend-reactjs/src/layouts/MainLayout.jsx†L214-L219】

## Authenticated Dashboard
- Dashboard header copy now references live health telemetry rather than a static “all systems green” placeholder, and the dashboard shell renders the banner component so operators can triage outages from within cohort, analytics, or governance modules.【F:frontend-reactjs/src/layouts/DashboardLayout.jsx†L1-L380】
- Mobile drawer inherits the same status badge and descriptive messaging, ensuring incident visibility when administrators switch roles or navigate via small screens.【F:frontend-reactjs/src/layouts/MainLayout.jsx†L180-L205】

### Governance Control Centre
- New admin governance surface aggregates DSR queue metrics, overdue escalations, and policy timelines with severity-coded summary cards so compliance teams can triage from a single page.【F:frontend-reactjs/src/pages/dashboard/AdminGovernance.jsx†L58-L184】
- The page wires into the compliance API client and React Router so navigation menus, breadcrumbs, and CTA buttons respect RBAC gating and reuse the existing dashboard chrome.【F:frontend-reactjs/src/api/complianceApi.js†L1-L86】【F:frontend-reactjs/src/App.jsx†L1-L150】

### Creation Studio Workspace
- Introduced `/dashboard/instructor/creation-studio` featuring project list management, readiness summaries, and collaborative presence controls fed by the creation service APIs.【F:frontend-reactjs/src/pages/dashboard/InstructorCreationStudio.jsx†L1-L229】【F:frontend-reactjs/src/api/creationStudioApi.js†L1-L213】
- Creation studio summary now surfaces catalogue distribution across courses, e-books, communities, and ad assets with progress bars so instructors can plan staffing against the live production mix.【F:frontend-reactjs/src/pages/dashboard/instructor/creationStudio/CreationStudioSummary.jsx†L84-L132】
- Added analytics dashboard section presenting KPI strip, engagement metrics, ads spend, ranking insights, and scam risk banner with CSV export so instructors can respond to monetisation and fraud signals from the studio shell.【F:frontend-reactjs/src/pages/dashboard/instructor/creationStudio/CreationAnalyticsDashboard.jsx†L1-L260】【F:frontend-reactjs/src/api/creationStudioApi.js†L1-L110】
- Added reusable subcomponents for the creation wizard stepper, collaborator presence panel, and template-driven project creation flow to maintain production-grade UX consistency across studio screens.【F:frontend-reactjs/src/pages/dashboard/instructor/creationStudio/CreationWizardStepper.jsx†L1-L164】【F:frontend-reactjs/src/pages/dashboard/instructor/creationStudio/CreationCollaboratorsPanel.jsx†L1-L175】【F:frontend-reactjs/src/pages/dashboard/instructor/creationStudio/CreationAssetLibrary.jsx†L1-L274】
- Shared creation studio utility helpers drive readiness summaries, session lookups, and step-state transitions with dedicated Vitest coverage to protect key instructor workflows; helpers now deliver type-specific scoring for courses, e-books, communities, and ad assets.【F:frontend-reactjs/src/pages/dashboard/instructor/creationStudio/creationStudioUtils.js†L1-L640】【F:frontend-reactjs/src/pages/dashboard/instructor/creationStudio/__tests__/creationStudioUtils.test.js†L1-L200】
- Template filters, project lists, and launch modals align to the supported creation catalogue so instructors can draft courses, e-books, communities, and ad campaigns without manual reconfiguration.【F:frontend-reactjs/src/pages/dashboard/instructor/creationStudio/CreationAssetLibrary.jsx†L162-L289】【F:frontend-reactjs/src/pages/dashboard/instructor/creationStudio/CreationProjectList.jsx†L1-L205】
- Updated dashboard navigation to surface the creation studio hub and align search metadata with the new workspace entry point.【F:frontend-reactjs/src/layouts/DashboardLayout.jsx†L1-L420】【F:frontend-reactjs/src/App.jsx†L1-L260】

## Learner Profile
- Added a privacy & consent ledger that fetches live consent records, renders grant metadata, and exposes inline revocation actions that call the compliance API with optimistic loading states.【F:frontend-reactjs/src/pages/Profile.jsx†L830-L870】【F:frontend-reactjs/src/hooks/useConsentRecords.js†L1-L52】
- Profile shell now surfaces consent status counts in the hero, ensuring governance posture is visible alongside revenue, community, and affiliate insights.【F:frontend-reactjs/src/pages/Profile.jsx†L798-L826】
