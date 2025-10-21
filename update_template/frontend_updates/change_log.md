# Frontend Change Log

## Release 2024.11 "Equinox"

### Highlights
- **Role-aware dashboards:** Admin, provider, serviceman, and learner experiences now surface contextual analytics backed by role-based access controls enforced in the API gateway and session middleware.
- **Profile modernization:** Unified profile editor with guided onboarding, live validation, and localized support for 8 languages.
- **Performance uplift:** Client bundle size reduced by 18%, core vitals stabilized under 1.8s Largest Contentful Paint across tier-2 devices, and WebSocket fallbacks now gracefully degrade to Server-Sent Events.
- **Security hardening:** Cross-site request forgery protection expanded to cover multi-tab sessions, CORS tightened to allowlist tenant domains, and privileged actions gated behind step-up verification flows.
- **Accessibility & UX polish:** WCAG 2.2 AA compliance achieved for primary flows, color contrast tuned, and keyboard navigation audited across dashboards.

### Detailed Changes
1. Migrated global state to RTK Query with persistent caching for analytics panels, preventing redundant fetch bursts on dashboard navigation.
2. Introduced modular layout primitives with CSS Grid and container queries for consistent breakpoints between desktop, tablet, and mobile.
3. Refined provider booking widgets to expose availability, travel buffers, and SLA breach alerts in a single responsive card design.
4. Implemented progressive image loading for catalog tiles with skeleton placeholders to eliminate layout shift while assets hydrate.
5. Added audit logging hooks around admin bulk operations, forwarding telemetry to the backend `auditTrail` topic with tenant scoped metadata.
6. Hardened JWT refresh logic by binding tokens to device fingerprints and revoking idle sessions after 20 minutes of inactivity.
7. Added `X-Edulure-Tenant` propagation across every network request to align with backend multi-tenancy enforcement.
8. Replaced deprecated charting library with a11y-first alternative delivering interactive annotations compatible with screen readers.
9. Integrated consent management banner storing granular marketing, functional, and analytics preferences in secure local storage.
10. Established centralized error boundaries with user-friendly fallback messaging and retry affordances for transient API errors.

### Fixed Defects
- Resolved an issue where admin impersonation sessions could bypass MFA prompts after a password reset.
- Corrected provider payout reports that previously displayed in UTC instead of localized tenant time zones.
- Fixed serviceman dispatch modals that failed to render when optional add-on services were absent.
- Addressed regression causing Safari to block cross-subdomain cookies on first login attempt.

### Compatibility Notes
- Minimum browser versions: Chrome 110, Firefox 102, Safari 16.4, Edge 110.
- React runtime upgraded to 18.3 with concurrent features enabled; legacy IE support removed.
- Frontend API contract aligned with backend `v3` endpoints; earlier `v2` routes officially deprecated.

### Testing Summary
- Unit tests: 428 passing (Vitest `npm run test -- --run`)
- Integration tests: 64 passing (Playwright smoke suite `npm run test:e2e`)
- Accessibility: Axe CI, manual screen reader audit (NVDA + VoiceOver)
- Performance: Lighthouse CI median score 94 desktop / 92 mobile
- Security: OWASP ZAP passive scan (no medium or higher findings)

### Deployment Checklist
- [x] Environment configuration updated with new CORS allowlist entries per tenant.
- [x] Feature flags toggled via LaunchDarkly for phased rollout.
- [x] CDN cache purge scheduled post-deploy.
- [x] Rollback plan documented with traffic shift guidelines.

