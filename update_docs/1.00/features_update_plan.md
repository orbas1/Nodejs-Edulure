# Version 1.00 Feature Update Plan

## Phase 0 – Programme Mobilisation (Weeks 0-2)
1. **Scope & Governance**
   - Confirm feature inventory across General Area, Communities 2.0, Explorer, Dashboards, Commerce, Ads, Flutter parity, and supporting infrastructure.
   - Establish cross-functional squads (Infrastructure, Learning Content, Social & Profiles, Communities, Discovery, Commerce, Mobile, QA/Compliance, Data & Analytics).
   - Lock definition of done (performance, accessibility, localisation, mobile parity, documentation, analytics).
2. **Architecture & Compliance Foundations**
   - Run architecture review boards for Cloudflare R2 topology, Agora live classrooms, Meilisearch cluster, profile component architecture, and admin panel extensions.
   - Complete privacy impact assessments, PCI readiness for Stripe/PayPal, DRM/legal reviews for ebooks, and policy updates for spam/bad word enforcement.
   - Define API versioning strategy, service boundaries, database migration approach, and rollback protocols.
3. **Environment Preparation & Tooling**
   - Provision dev/staging environments: R2 buckets, Meilisearch clusters, Agora sandboxes, feature flagging, CI/CD pipelines, and infrastructure-as-code templates.
   - Update automated testing suites (unit, integration, contract, end-to-end, load) for backend, frontend, and Flutter.
   - Instrument observability stack (metrics, logs, tracing) with dashboards for asset latency, community engagement, search adoption, payments, and ads.

## Phase 1 – Infrastructure & Platform Enablement (Weeks 2-5)
1. **Cloudflare R2 Migration Layer**
   - Configure domain-specific buckets, IAM policies, lifecycle rules, multi-region replication, signed URL services, and monitoring alerts.
   - Build upload microservice with antivirus scanning, media conversion triggers (PowerPoints, recordings), and checksum validation.
   - Implement dual-write adapters, migration scripts, and rollback tooling; execute pilot migrations for sample courses/ebooks.
2. **Core Backend Services**
   - Establish service scaffolding for Content (courses/ebooks/powerpoints), Social (follows/feeds), Communities, Explorer/Search, Ads, and Notifications.
   - Define GraphQL/REST endpoints, DTOs, event schemas, and background job orchestration (queues, workers, schedulers).
   - Create database migrations, seeders, and test datasets covering user types, roles, communities, ads, and search indexes.
3. **Security & Compliance Controls**
   - Implement IAM least-privilege roles, audit logging, data retention policies, encryption (at-rest/in-transit), and incident response runbooks.
   - Integrate spam/bad word detection services into feeds, chat, reviews, and community posts; schedule penetration tests.

## Phase 2 – General Area & Learning Experiences (Weeks 4-8)
1. **Live Feed & Social Signals**
   - Design feed aggregation rules, ranking algorithms, moderation queues, and notification triggers for course, community, tutor, and ad updates.
   - Develop feed UI (web + Flutter) with filters, highlights, CTA widgets, and personalised recommendations driven by follow graph.
2. **Course Commerce & Delivery**
   - Build storefront UI (categories, bundles, previews), checkout flows (Stripe/PayPal), and order management.
   - Implement course management: module builder, drip scheduling, PowerPoint ingestion, recordings storage, quizzes, assignments, notes, exams, grading, and progress tracking.
   - Integrate Agora for live classrooms with scheduling, ticketing (free/paid), interactive quizzes, recordings storage, and post-session analytics.
3. **Ebook Upgrade Programme**
   - Redesign ebook storefront and reader (typography controls, theming, multimedia, annotations, highlights, offline mode).
   - Deliver author tools (chapter management, accessibility checker, preview, DRM-lite with watermarking/device binding).
   - Sync reading analytics to dashboards; ensure Flutter reader parity.
4. **Tutor Hourly Hire**
   - Build tutor marketplace with profile pages, availability calendars, maps, pricing, verification badges, chat initiation, booking, and review flows.
   - Integrate payments, refund logic, notifications, and live classroom hooks.

## Phase 3 – Social Graph & Profile System (Weeks 6-10)
1. **Follow Graph Infrastructure**
   - Model follow/unfollow/block/mute relationships, privacy settings, and audit logs; update user settings UI.
   - Expose API endpoints and integrate with notifications, recommendations, and moderation workflows.
2. **Component-Based Profile Redesign**
   - Finalise design tokens, component library (headers, stats, achievements, community cards, affiliate widgets, timelines).
   - Implement backend aggregation services (followers, course progress, revenue, tier points, ads performance) with caching.
   - Deliver responsive React components, Flutter widgets, CSS styling, accessibility conformance, and localisation.
   - Run migration scripts for new profile tables, achievements, preferences; create seeding utilities and rollback plans.
3. **Dashboard Integration**
   - Update user and instructor dashboards with new profile components, finance modules, analytics widgets, ID verification, instructor onboarding, and community listings.
   - Extend admin panel with profile moderation, affiliate oversight, and analytics.

## Phase 4 – Communities 2.0 Overhaul (Weeks 8-14)
1. **Community Core & Content**
   - Redesign schemas for communities, posts, categories, comments, replies, maps, classrooms, calendars, tier points, leaderboards, streaks, and paywalls.
   - Implement content lifecycle (create, edit, schedule, archive), moderation queue, reporting tools, and audit logs.
   - Build community feed with filters, pinned posts, hero/announcement blocks, map embeds, classroom integration, and resource library.
2. **Roles, Governance & Monetisation**
   - Configure role management (members, admins, moderators, owners), permissions matrix, onboarding flows, and escalation paths.
   - Launch subscription/paywall tiers with Stripe integration, entitlement checks, proration, refunds, and analytics.
   - Build affiliate marketplace (link creation, commission settings, earnings dashboard, withdrawals, instructor dashboard integration).
3. **Communication & Engagement**
   - Upgrade chat/inbox with channels, DMs, read receipts, Agora hooks, notifications, and spam filtering.
   - Implement calendar syncing, event reminders, online presence tracker, classroom scheduling, and leaderboard calculations.
   - Add ad placements, community affiliates section, and admin panel oversight.
4. **Mobile Parity**
   - Deliver Flutter screens for all community features (feed, posts, maps, chat, calendars, leaderboards, admin tools, affiliates, paywalls).
   - Implement offline caching, push notifications, deep links, and analytics tracking.

## Phase 5 – Explorer & Search (Weeks 10-15)
1. **Navigation & UX**
   - Add Explorer to global navigation, header, and onboarding flows; design saved searches, quick filters, and breadcrumbs.
   - Create desktop/tablet/mobile layouts with entity cards (communities, profiles, courses, ebooks, tutors, ads) including CTAs.
2. **Search Infrastructure**
   - Deploy Meilisearch cluster with replication, backup, monitoring, and security controls.
   - Build ETL pipelines for data ingestion (initial imports, incremental updates via queues, scheduled reindexing); include analytics instrumentation.
   - Implement ranking logic using popularity, follow graph, tier points, course ratings, tutor availability, and geolocation.
3. **Front-End & Mobile Integration**
   - Develop React components (autocomplete, facets, filters, sort, infinite scroll, voice search toggle).
   - Build Flutter explorer module with offline recent searches, voice search, deep links into communities/courses/tutors, and analytics.
   - Connect explorer to notifications, follow suggestions, and ad placement.

## Phase 6 – Commerce, Ads & Finance (Weeks 12-16)
1. **Payments & Subscriptions**
   - Finalise Stripe/PayPal integration across courses, ebooks, live classrooms, tutor bookings, and community paywalls.
   - Implement finance dashboards, reconciliation scripts, payout workflows, tax/VAT handling, and refund automation.
   - Integrate ID verification and KYC flows for instructors and affiliates.
2. **Edulure Ads Suite**
   - Build advertiser dashboard (campaign creation, budgets, targeting, ad types, creatives management).
   - Implement PPC/PPI/PPConversion tracking, metrics dashboards, traffic predictions, and recommendation engine for placements.
   - Integrate ads into feeds, explorer, communities, and dashboards with compliance checks.
3. **Analytics & Reporting**
   - Deliver widgets for statistics, graphs, community health, course performance, ebook engagement, search conversions, tutor utilisation, and ad ROI.
   - Provide export capabilities, scheduled reports, and admin insights.

## Phase 7 – Quality Assurance & Launch (Weeks 14-18)
1. **Comprehensive Testing**
   - Execute unit, integration, contract, and end-to-end suites across backend, frontend, Flutter; include smoke tests for feature flags.
   - Perform load/stress testing for R2 delivery, Agora live classrooms, community feeds/chat, Meilisearch queries, and ad serving.
   - Run accessibility (WCAG 2.1 AA), localisation, usability, penetration, and privacy compliance tests.
2. **Data Validation & Seeding**
   - Populate staging with representative datasets (communities, ads, courses, ebooks, tutors, followers, paywalls) using automated seeders.
   - Validate migrations, run rollback drills, verify analytics dashboards, and rehearse incident response scenarios.
3. **Go-Live Readiness**
   - Produce release notes, update documentation, knowledge base, support scripts, and training assets.
   - Conduct beta programme (staff → champions → public), collect feedback, triage defects, and monitor readiness KPIs.
   - Coordinate launch calendar across web deployment and Flutter app store submissions; ensure feature flags for staged rollout.
4. **Post-Launch Operations**
   - Establish war room with daily telemetry reviews, customer feedback loops, and escalation pathways.
   - Transition ownership to support/operations with runbooks, SLAs, and backlog grooming for Version 1.01 enhancements.

## Cross-Phase Enablers
- **Documentation:** Maintain living ADRs, API specs, component guidelines, migration playbooks, and training manuals.
- **Change Control:** Weekly steering committee reviewing progress, risks, dependency blockers, and scope adjustments.
- **Risk Management:** Maintain risk register with mitigation/contingency plans (infrastructure, compliance, mobile parity, payments).
- **Training & Enablement:** Workshops for instructors, community managers, support, sales, and admins covering new tooling.
- **Telemetry & Experimentation:** Configure dashboards, alerts, A/B testing harnesses (explorer ranking, follow recommendations, ad placements), and feedback pipelines.
