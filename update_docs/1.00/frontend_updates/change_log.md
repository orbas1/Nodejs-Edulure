# Frontend Change Log – Version 1.50 Task 2

- Introduced an authenticated content library route (`/content`) featuring presigned upload flows, analytics sidebars, and embedded PowerPoint/PDF/Ebook viewers backed by the new `/api/content` endpoints.
- Replaced stub login/register screens with real authentication flows consuming the backend, including MFA placeholders, error messaging, and AuthContext session management.
- Rebuilt the `httpClient` abstraction on top of axios with error normalisation, token header support, upload progress hooks, alongside IDB caching (`idb-keyval`) and PropTypes coverage to stabilise API interactions and enforce component contracts.
- Updated build tooling via `npm install` to capture new dependencies (`epubjs`, `idb-keyval`) and ensured production builds succeed under Vite.
- Added a `RuntimeConfigProvider` to hydrate feature flags/runtime configuration via `/api/runtime`, gating admin navigation, surfacing support contacts, and aligning React with backend governance controls.
- Introduced checkout surface integrating Stripe Elements and PayPal buttons, wired to the new commerce API client with coupon/tax support, optimistic order previews, webhook-safe redirects, and analytics events for funnel monitoring.
- Documented new environment variables (`VITE_STRIPE_PUBLISHABLE_KEY`, `VITE_PAYPAL_CLIENT_ID`) and runtime config dependencies so QA can provision client-side credentials that align with backend providers.
