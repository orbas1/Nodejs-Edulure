# Version 1.50 – Features to Add

## Web Application
### 1. Enterprise Platform Upgrade
- **Infrastructure hardening**: implement audit logging microservice, WAF configuration, rate limiting middleware, and automated backup jobs.
- **Environment cleanup**: refactor configuration loader to default safe values for non-sensitive settings (e.g., pagination limits, feature flags) while reducing `.env` to critical secrets; publish `.env.example` with mandatory keys only.
- **Security remediations**: encrypt sensitive columns (PII, financial data) via KMS, replace plaintext credentials, enable antivirus scanning service, and roll out phishing/scam warning banner service across UI.
- **Compliance tooling**: add GDPR consent ledger table and data subject request workflow with admin approval queue.
- **Observability & readiness**: create uptime dashboards, log correlation IDs, health-check endpoints, and runbook repository covering incident response, rollback, and communication procedures.

| Table | Purpose | Key Columns |
| --- | --- | --- |
| `audit_events` | Track system and user actions for compliance | `id`, `actor_id`, `actor_role`, `event_type`, `entity`, `payload`, `ip_address`, `created_at` |
| `consent_records` | Store GDPR consents and revocations | `id`, `user_id`, `policy_version`, `consent_type`, `granted_at`, `revoked_at`, `channel` |
| `dsr_requests` | Manage data subject requests (access, deletion) | `id`, `user_id`, `request_type`, `status`, `submitted_at`, `due_at`, `handled_by` |
| `security_incidents` | Track reported scams/fraud attempts | `id`, `reporter_id`, `category`, `description`, `status`, `resolved_at`, `notes` |

### 2. Role & Permission Enforcement
- Introduce RBAC policies with middleware on backend endpoints and guard components on frontend.
- Add admin console for managing roles, permissions, and audit logs of changes.
- Ensure dashboards (learner, instructor, admin) only surface authorised widgets and menu entries.
- Provide granular permission sets for community moderators, finance operators, and ads managers, including approval workflows.

| Function/Module | Description |
| --- | --- |
| `authorizeRequest(role, permission)` | Backend helper enforcing route-level permissions and returning structured errors. |
| `usePermissionGate(permission)` | Frontend hook to conditionally render components based on user capability. |
| `PermissionsAdminPanel` | Interface to assign roles, view audit logs, and export permission matrices. |

### 3. Creation Studio & Content Ecosystem
- Launch **Creation Studio** workspace that guides users through creating courses, e-books, and communities with AI-assisted templates.
- Implement asset library with Google Drive import/export and internal storage support.
- Add course assessments, scheduling, and review capture workflows.
- Build Edulure Ads manager for campaign creation, targeting, placement management, and analytics dashboards.
- Provide creation templates for communities (membership tiers, moderation rules) and e-books (chapter structures, design themes).
- Enable collaborative editing with role-based access, commenting, and version history.

| Table | Purpose | Key Columns |
| --- | --- | --- |
| `creation_projects` | Track works-in-progress in the studio | `id`, `owner_id`, `type (course/ebook/community)`, `status`, `metadata`, `created_at`, `updated_at` |
| `ads_campaigns` | Manage advertising campaigns | `id`, `owner_id`, `name`, `budget`, `start_at`, `end_at`, `targeting_rules`, `status` |
| `community_posts` | Store posts in community feeds | `id`, `community_id`, `author_id`, `content`, `attachments`, `visibility`, `created_at` |
| `creation_templates` | Store reusable templates per asset type | `id`, `type`, `title`, `schema`, `version`, `created_by`, `is_default` |
| `collaboration_sessions` | Track co-editing sessions and permissions | `id`, `project_id`, `participant_id`, `role`, `joined_at`, `left_at` |

### 4. Integrations & AI Enablement
- Integrate HubSpot and Salesforce for CRM sync; schedule background jobs for pushes/pulls and reconciliation logs.
- Connect Slack for event notifications (enrolments, payments, support tickets).
- Add Google Drive picker for content import/export.
- Implement pluggable AI providers (OpenAI, Claude, XAI Grok) with tenant-level toggles, BYO API key storage, usage metering, and safety filters.
- Provide integration health dashboard showing sync status, error counts, and retry actions.
- Supply AI governance controls (prompt templates, safety filters, content moderation) configurable per tenant.

| Function/Service | Description |
| --- | --- |
| `syncCrmContacts(provider)` | Synchronises user/course data with selected CRM. |
| `notifySlack(channel, payload)` | Sends structured notifications to Slack workspaces. |
| `generateAiAssistance(provider, prompt, context)` | Requests AI output for creation studio, with provider fallbacks. |
| `storeExternalApiKey(provider, encryptedKey, owner)` | Persists tenant-provided API keys securely for AI integrations. |
| `integrationStatusMonitor()` | Aggregates health metrics and exposes dashboards/alerts. |

### 5. Payments, Finance & Policies
- Finalise payment flow integrations (checkout, refunds, chargebacks) ensuring compliance with non-custodial wallet rules.
- Build financial dashboards for learners and admins showing invoices, payouts, ledger entries, and tax docs.
- Publish About Us, Terms & Conditions, Privacy Policy, Cookies Banner, and Refund Policy pages with CMS backing and version history.
- Implement scam detection heuristics and manual review queues for suspicious transactions.
- Implement automated financial reconciliation with payment provider reports and ledger adjustments.
- Provide wallet guardrails preventing internal balance storage while supporting third-party payment methods.

| Table | Purpose | Key Columns |
| --- | --- | --- |
| `financial_statements` | Summarise learner/instructor financial data | `id`, `user_id`, `period`, `income`, `expenses`, `tax_withheld`, `generated_at` |
| `refund_requests` | Manage refund workflows | `id`, `order_id`, `requestor_id`, `reason`, `status`, `resolved_by`, `resolved_at` |
| `wallet_transactions` | Log wallet-related actions without holding balances | `id`, `user_id`, `transaction_type`, `external_reference`, `amount`, `status`, `created_at` |
| `scam_reports` | Store flagged activities for review | `id`, `reporter_id`, `entity_type`, `entity_id`, `reason`, `risk_score`, `handled_by`, `resolved_at` |

### 6. Experience, Navigation & Social Graph
- Refresh UI with new colour palette, typography, spacing, and accessible component library.
- Rebuild navigation menus (header, footer, dashboards) with vector icons and contextual shortcuts.
- Ensure live feeds, messaging centre, notifications, and chat bubbles are fully featured and synced with Firebase push notifications.
- Complete community functionality: memberships, followers/following visualisations, post creation, moderation, and analytics.
- Implement ranking/matching algorithms for course recommendations and community suggestions.
- Deliver multi-language toggle, translation files, and locale-aware formatting across UI and communications.
- Add onsite scam warning banners, contextual fraud education, and reporting entry points on relevant pages.
- Provide analytics dashboards (engagement, ads performance, learning progress) accessible per role with export options.

| Table | Purpose | Key Columns |
| --- | --- | --- |
| `community_memberships` | Track user participation in communities | `id`, `community_id`, `user_id`, `role`, `joined_at`, `status` |
| `user_followers` | Maintain follower/following graph | `id`, `follower_id`, `followed_id`, `created_at`, `muted` |
| `notification_preferences` | Store per-channel notification settings | `id`, `user_id`, `channel`, `is_enabled`, `frequency`, `last_updated` |
| `ranking_insights` | Capture algorithm outputs for transparency | `id`, `user_id`, `context`, `result`, `score`, `generated_at` |

| Module | Description |
| --- | --- |
| `LiveFeedService` | Aggregates posts, ads, and announcements with moderation hooks. |
| `ScamWarningBanner` | Displays contextual alerts and links to report scams. |
| `AnalyticsDashboard` | Role-aware analytics with export (CSV/PDF) and scheduled reports. |

### 7. Documentation, Policies & Setup
- Update README, setup guide, update index, change log, and onboarding tutorials reflecting new flows and configuration.
- Produce policy pages with localisation support and CMS integration for About, Terms, Privacy, Cookies, Refund, and Financial disclosures.
- Provide training material for admins/instructors (videos, checklists) and support scripts for scam handling and ads operations.
- Document `.env` parameters, hardcoded defaults, and infrastructure expectations (services, ports, secrets management).
- Supply QA playbooks, regression scripts, and acceptance criteria for each feature area (dashboards, payments, communities, creation studio).

## Phone Flutter Application
### 1. Enterprise Readiness & Configuration
- Add configurable base API URL (through secure storage) with static endpoints, plus environment switcher UI in developer settings.
- Mirror security/compliance updates: consent flows, GDPR requests, scam warnings, and policy pages (About, Terms, Privacy, Refund).
- Implement social logins, payment flows, and wallet constraints identical to web.
- Provide crash reporting, analytics, and remote config to align with enterprise observability.
- Add secure storage for BYO AI keys and user credentials with biometric unlock support where available.

### 2. UX/UI & Performance
- Apply new design system to Flutter widgets; ensure consistent colour styles, typography, and icon vectors.
- Reorganise screens and navigation (tab bar, drawer) for clarity; optimise widget composition for low app size.
- Upgrade messaging, inbox, chat bubbles, notifications (Firebase integration), and live feed interactions with offline caching.
- Deliver creation studio companion flows (draft viewing, approvals, analytics) optimised for mobile use cases.
- Add community feed authoring tools with media uploads, polls, and moderation flags.
- Implement adaptive layouts for tablets and large-screen devices while maintaining performance budgets.

### 3. Functional Completion & Documentation
- Ensure all mobile-accessible dashboards and community features are fully functional while deferring complex admin-only modules to responsive web.
- Add financial management screens for viewing statements, payouts, and linked payment methods.
- Update README & setup guide to cover environment configuration, dependencies, and QA steps.
- Provide in-app tutorials, tooltips, and FAQ access for mobile users.
- Implement notification preference management, language switching, and scam reporting directly within settings.
- Document parity checklist ensuring each mobile feature has backend coverage, analytics, and support playbooks.

| Module | Key Functions |
| --- | --- |
| `AppConfigService` | Manages API base URL, environment switching, persistence. |
| `NotificationService` | Handles Firebase push registration, in-app notification centre, message routing. |
| `FinanceScreen` | Displays invoices, statements, payment methods with secure interactions. |
| `MobileCreationStudio` | Provides lightweight project overview, approvals, and AI-assisted drafting on mobile. |
| `CommunityFeedModule` | Enables posting, moderation, and analytics on the go. |
| `ScamAlertCenter` | Surfaces warnings, user reports, and education content. |

## Cross-Cutting Requirements
- Complete automated and manual testing suites (unit, integration, E2E) across web/backend/mobile with documented pass results.
- Ensure database migrations and seeders cover new tables (audit events, consent records, creation projects, ads campaigns, financial statements, etc.).
- Provide comprehensive README/setup documentation reflecting environment changes, integrations, and testing procedures.
- Establish analytics taxonomy covering dashboards, creation studio, ads, payments, and community engagement.
- Implement feature flag strategy enabling gradual rollout and tenant-specific toggles (AI providers, integrations, ads modules).
- Ensure fraud/scam response workflows integrate with notifications, support tools, and reporting dashboards.
- Maintain parity tracker linking each requirement (web + mobile) to owners, status, and QA evidence for release governance.
