# Pages Updated

## Dashboard Landing
- Consolidated hero metrics for all roles with adaptive content based on `rbacContext.role`.
- Added onboarding carousel for first-time visitors with checklists for completing profiles, enabling MFA, and joining communities.
- Implemented skeleton loaders and shimmering states to mitigate layout shifts.

## Course Catalogue
- Introduced faceted search with accessible filter drawers and query-state persistence in the URL.
- Lazy-loaded course cards with intersection observers and responsive image sets.
- Inline enrollment microcopy clarifies prerequisites and tuition assistance options per tenant.

## Community Hub
- Added moderated threads with AI-assisted toxicity detection and manual override audit trail.
- Implemented offline drafts stored in IndexedDB with auto-sync once connectivity resumes.
- Enhanced event calendar with drag-and-drop scheduling and ICS export per timezone.

## Provider Booking
- Calendar now reflects buffer windows, SLA breach alerts, and travel distance overlays powered by Mapbox static maps.
- Introduced conflict detection for overlapping appointments and automated escalation prompts.
- Payment summary now itemizes taxes, promo codes, and payout schedule to improve transparency.

## Serviceman Dispatch
- New dispatch board surfaces priority tiers, route optimization hints, and equipment checklists.
- Mobile-first layout with sticky action buttons for accept/decline and route navigation triggers.
- Integrated live chat widget with transcripts archived via compliance service.

## User Profile
- Multi-step profile wizard with autosave, contextual tooltips, and verification status indicators.
- Privacy preferences segmented into marketing, analytics, and functional toggles tied to consent ledger.
- Added MFA setup guidance, recovery codes download, and device management list.

## Settings & Compliance Center
- Added data export/erase workflow compliant with GDPR and CCPA with secure download links expiring in 15 minutes.
- Enhanced API token management with hashed display, last-used timestamp, and scope assignment.
- Embedded security advisories feed with recommended remediation actions.

