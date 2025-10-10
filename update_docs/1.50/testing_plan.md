# Version 1.10 Testing Plan

## 1. Purpose & Context
- Deliver an end-to-end validation strategy for Version 1.10 so new storage, learning content, social, community, explorer, and mobile capabilities launch with enterprise quality.
- Close the systemic gaps raised in the pre-update issue report (backend coverage, dependency governance, database resilience, immature clients) by ensuring every remediation has automated and manual verification before promotion.
- Align QA execution with the seven cross-functional tasks and six milestones defined for the release so testing evidence gates progression.

## 2. Objectives
1. Certify that foundation work from Task 1 hardens security, API contracts, dependency tooling, and database migrations without regressions.
2. Validate Cloudflare R2, PowerPoint workflows, and the upgraded ebook suite (Task 2) across web and mobile with analytics, DRM, and offline behaviour intact.
3. Prove the social graph, activity feeds, and component-based profiles (Task 3) operate end-to-end with correct privacy, notifications, and analytics signals.
4. Confirm Communities 2.0 (Task 4) delivers engagement, chat, monetisation, and admin tooling that scales under load and honours compliance requirements.
5. Verify Explorer & Meilisearch search (Task 5) returns relevant, performant, and privacy-compliant results tied to follow, community, and content data.
6. Provide full regression, accessibility, localisation, security, and release-readiness evidence (Task 6) with sign-off on documentation and support artefacts.
7. Demonstrate learner and provider mobile apps (Task 7) reach feature parity, performance, and store compliance while respecting secure storage expectations.

## 3. Scope
- **In Scope:** Backend REST/GraphQL services, database migrations, queue/worker jobs, web frontend, Flutter user & provider apps, Cloudflare R2 asset flows, Meilisearch cluster, analytics pipelines, payment integrations, notification/monitoring tooling, release documentation.
- **Out of Scope:** Legacy provider mobile experience removed in change log, deprecated storage buckets, speculative roadmap items slated for post-1.10.

## 4. Test Phases & Coverage
| Phase | Alignment | Functional Focus | Non-Functional Focus |
| --- | --- | --- | --- |
| Foundation Hardening | Task 1 / Milestone 1 | Environment validation, API contract conformance, migration rehearsal, dependency workflows. | Security baseline, configuration hardening, audit logging, error masking. |
| Content Pipelines | Task 2 / Milestone 2 | R2 uploads/downloads, PowerPoint conversion, ebook reader UX, analytics events, offline sync. | Load on R2, DRM penetration, accessibility (WCAG 2.1 AA), latency budgets. |
| Social Graph & Profiles | Task 3 / Milestone 3 | Follow/mute/block flows, feed aggregation, profile component rendering, analytics dashboards. | Abuse simulation, caching strategy, privacy enforcement, localisation. |
| Communities 2.0 | Task 4 / Milestone 4 | Community CRUD, posts, polls, chat, gamification, paywalls, affiliate payouts, admin consoles. | Scalability of feeds/chat, financial reconciliation, compliance, moderation resilience. |
| Explorer & Release Readiness | Tasks 5–6 / Milestone 5 | Search relevance, explorer UI, saved searches, regression packs, documentation audits, beta feedback closure. | Search performance, zero-result monitoring, security testing, release runbooks. |
| Mobile Store Launch | Task 7 / Milestone 6 | Feature parity validation, offline/online transitions, push notifications, store package checks. | Device performance, crash monitoring, accessibility gestures, secure storage, store policy compliance. |

## 5. Detailed Test Suites
### 5.1 Foundation Hardening
- **API Contract Testing:** Postman/Newman or Pact tests to ensure unified response envelopes, validation, and error handling per fix suggestions 1.3.
- **Security Automation:** OWASP ZAP and static analysis for CORS restrictions, rate limiting, password policy enforcement, and secret validation (fix suggestion 1.4).
- **Migration Drills:** Run Knex migrations with rollback verification, checksum comparison for R2 dual writes, and data retention checks (fix suggestion 3.2).
- **Dependency Governance:** CI pipelines for npm audit, Flutter pub outdated, and Renovate/Dependabot PR smoke checks (fix suggestion 2.3).

### 5.2 Cloudflare R2 & Content Pipelines
- **Upload & Conversion E2E:** Simulate instructor uploads (large deck, ebook, community asset) verifying signed URLs, antivirus scans, conversion outputs, and failure recovery.
- **Learner Playback:** Cross-browser/device tests for slide navigation, captions, transcripts, offline caching, and telemetry; validate analytics dashboards for completion metrics.
- **DRM & Compliance:** Attempt unauthorised downloads, link sharing, and offline expiry bypass; confirm watermarking, download limits, and consent prompts.
- **Mobile Parity:** Device farm runs ensuring Flutter apps respect offline caching, notifications, and data synchronisation.

### 5.3 Social Graph & Profiles
- **Relationship Matrix:** Validate follow/unfollow, mute, block, privacy toggles, and moderation escalation workflows; include rate limit and abuse cases.
- **Feed Integrity:** Seed activity events and confirm ordering, deduplication, and notification dispatch across web/mobile/provider clients.
- **Profile Components:** Visual regression (Chromatic/Appium snapshots) for modular components, responsive layouts, and design token adherence.
- **Analytics Verification:** Ensure recommendation dashboards capture follow conversions, follower growth, and time-series accuracy.

### 5.4 Communities 2.0
- **Engagement Workflows:** Test posts (multimedia, polls), pinned resources, events, maps, classroom links, leaderboards, and streaks.
- **Chat & Notification:** Evaluate real-time chat concurrency, offline re-sync, notification scheduling, and push delivery using synthetic load.
- **Monetisation:** Validate subscription tiers, affiliate commissions, payouts, refunds, and audit logs; include negative scenarios and gateway failure fallbacks.
- **Admin & Moderation:** Confirm role-based permissions, moderation queues, appeals, audit trails, and incident runbooks.

### 5.5 Explorer & Search
- **Indexing Pipelines:** Verify full and incremental ingestion from communities, courses, profiles, ebooks, events; ensure queues process retries and dead-letter handling.
- **Relevance & Synonyms:** Execute curated search scripts covering synonyms, typo tolerance, boosting, saved searches, and voice queries on mobile.
- **Performance:** Load test Meilisearch (latency <300ms, availability), measure zero-result rate, and monitor instrumentation dashboards.
- **Privacy:** Ensure user-level history preferences apply, GDPR deletion propagates, and blocked users do not appear in search results.

### 5.6 Quality, Release & Mobile Launch
- **Regression Automation:** Expand unit, integration, and end-to-end suites per task 6.1 with cross-repo execution via CI orchestrators.
- **Accessibility & Localisation:** WCAG audits (axe-core, manual screen reader), localisation checks, RTL layout verification.
- **Beta & Support Readiness:** Capture beta survey insights, ensure documentation (knowledge base, support scripts) updated, and confirm monitoring/alerting dashboards function.
- **Store Submission Checks:** Validate bundle identifiers, privacy manifests, push notification entitlements, review guidelines, and crash/error monitoring integration.

## 6. Test Data & Environments
- **Environments:** Dedicated dev, QA, staging mirroring production topology with isolated Cloudflare R2 buckets, Meilisearch cluster, and feature flag service.
- **Data Management:** Synthetic but realistic datasets covering courses, communities, ebooks, followers, monetisation flows, and localisation strings; anonymised production snapshots when compliance allows.
- **Seeding:** Automated seeder scripts executed per pipeline; rollback after each cycle to maintain integrity.

## 7. Tooling & Automation
- **CI/CD:** GitHub Actions (or equivalent) triggering lint/test suites, security scans, migrations, mobile builds, and deploy previews.
- **Test Frameworks:** Jest, Playwright/Cypress, Supertest, k6/Artillery, Flutter integration tests, Appium, Pact, axe-core, OWASP ZAP.
- **Monitoring:** Grafana, Sentry, DataDog (or alternatives) capturing latency, error rates, and user behaviour; integrate with PagerDuty/Slack for alerts.
- **Traceability:** Maintain Zephyr/TestRail (or Notion) mapping features to test cases; link to change management for audits.

## 8. Entry & Exit Criteria
- **Entry:** Feature complete in staging, feature flags configured, migrations approved, telemetry dashboards in place.
- **Exit:**
  - 100% of planned test cases executed with pass rate ≥ 98% or risk-accepted deviations documented.
  - Zero P0/P1 defects open; P2 defects have mitigation/plan before launch.
  - Performance targets met (e.g., R2 <250ms median, Meilisearch <300ms, chat concurrency tolerance) with evidence.
  - Security, accessibility, and compliance sign-offs logged.
  - Release documentation, runbooks, and support playbooks updated with last test cycle outcomes.

## 9. Reporting & Governance
- Daily QA stand-ups with task leads; shared dashboard summarising execution, defects, and risk burndown.
- Milestone readiness reviews require presentation of coverage metrics, failing test remediation plans, and go/no-go recommendations.
- Maintain risk register referencing unresolved issues with owner, impact, contingency, and timeline.

## 10. Risk & Mitigation Highlights
- **Backend/API gaps:** Mitigated via contract testing and staged deployment toggles before clients integrate.
- **Complex migrations:** Use blue/green deployment rehearsals with rollback metrics and checksum validation.
- **Mobile store delays:** Parallelise QA with store asset preparation; maintain phased rollout plan and crash monitoring gating.
- **Relevance tuning drift:** Schedule post-launch validation scripts and guardrails for configuration changes.

## 11. Approvals & Ownership
- **QA Lead:** Accountable for execution, reporting, and defect triage.
- **Engineering Leads:** Approve readiness per task stream (Infrastructure, Content, Social, Communities, Explorer, Mobile).
- **Product & Compliance:** Sign off on release readiness once exit criteria satisfied.
- Testing artefacts stored alongside update documentation with versioned history for audits.
