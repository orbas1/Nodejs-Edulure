# Resource Dependencies – Web Application v1.00

## Design Tooling
- **Figma Project:** `Edulure v1.00 – Web` containing page flows, component library, and interaction specs.
- **Design Tokens Plugin:** Figma Tokens syncs values to JSON consumed by build pipeline.
- **Lottie Animations:** Stored in `resources/lottie/` for hero micro-animations.

## Development Dependencies
- **Frontend Stack:** React 18, TypeScript 5, Vite build system.
- **Component Library:** Custom design system built on top of Radix UI primitives (Dialog, Tabs, Tooltip).
- **Charting:** `@visx/visx` for visualisations with custom theming.
- **State Management:** Zustand for lightweight global state, React Query for data fetching.

## Analytics & Monitoring
- Segment for behavioural tracking.
- Sentry for error monitoring with release tags `web@1.00.x`.
- LogRocket for session replay focusing on onboarding flows.

## Third-Party Services
- **Search:** Algolia index `edulure_web_v1` powering command palette and knowledge base.
- **Messaging:** Stream Chat for real-time conversations.
- **Video Hosting:** Mux for course playback with analytics overlay.
- **Payments:** Stripe Connect for provider payouts.

## Asset Pipelines
- Build script `yarn assets:optimize` -> `yarn assets:manifest` ensures metadata alignment.
- Use Cloudflare R2 for asset storage with signed URLs.
- CDN caching strategy: 30-day TTL for static assets, 5-minute revalidation for JSON manifests.

## Documentation & Collaboration
- Confluence space `EDU-WEB` storing meeting notes and decisions.
- Storybook instance deployed at `design.edulure.com/web/v1` for component preview.
- Notion board `Web v1.00 Launch` tracking copy updates and QA tasks.

## Governance
- All updates require entries in `design_change_log.md` and, where logic impacted, `web_application_logic_flow_changes.md`.
- Weekly design-engineering sync reviews open tickets from `Design_Task_Plan_Upgrade`.
- Archive retired assets and dependencies at version freeze in `/update_docs/1.00/archives/`.
