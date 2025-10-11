# Frontend Change Log – Version 1.50 Task 2

- Introduced an authenticated content library route (`/content`) featuring presigned upload flows, analytics sidebars, and embedded PowerPoint/PDF/Ebook viewers backed by the new `/api/content` endpoints.
- Replaced stub login/register screens with real authentication flows consuming the backend, including MFA placeholders, error messaging, and AuthContext session management.
- Rebuilt the `httpClient` abstraction on top of axios with error normalisation, token header support, upload progress hooks, alongside IDB caching (`idb-keyval`) and PropTypes coverage to stabilise API interactions and enforce component contracts.
- Updated build tooling via `npm install` to capture new dependencies (`epubjs`, `idb-keyval`) and ensured production builds succeed under Vite.
- Added a `RuntimeConfigProvider` to hydrate feature flags/runtime configuration via `/api/runtime`, gating admin navigation, surfacing support contacts, and aligning React with backend governance controls.
- Replaced the placeholder community feed with authenticated API integrations: `Feed.jsx`, `CommunityProfile.jsx`, and `CommunitySwitcher.jsx` now consume live community/feed/resource endpoints, expose accessible loading/error states, paginate resource drawers, and render metadata consistent with the updated design overlays.
