# Provider Application Logic Flow Changes (v1.50)

## Overview
The provider application logic was re-architected to prioritize transparency, automation, and proactive nudges. Each core journey was mapped against trigger points, data dependencies, and cross-channel notifications to ensure consistent outcomes across native, push, and email touchpoints.

## Global State Management
- Implemented event-driven architecture using centralized event bus (`ProviderAppEventHub`) to broadcast key state changes (cohort updated, message sent, payment processed).
- Introduced optimistic UI pattern for create/update actions with rollback handlers when server responses fail.
- Standardized error handling: categorized into validation, permission, network, and system; surfaced via inline banners with contextual remediation steps.
- Added background sync interval (5 minutes) to refresh dashboards, schedule, and analytics data when app remains idle.

## Onboarding Flow
1. **Registration Initiation**
   - Triggered from sign-up screen (email/password or SSO). Validates email uniqueness, password strength, and acceptance of terms.
   - Upon success, user flagged as `status=invited`, receives verification email.
2. **Email Verification**
   - Deep link returns user to app; token validated server-side. If expired, user is prompted to request new link.
   - Successful verification transitions status to `pending_profile`.
3. **Profile Completion Wizard**
   - Step 1: Business basics (name, category, timezone). Autosaves draft after every field blur.
   - Step 2: Credentials & compliance (upload documents). File uploads queue with progress bars; failed uploads retriable.
   - Step 3: Payment setup (banking integration via Plaid). Completed integration triggers background verification job.
   - Step 4: Platform orientation (tour with progress). On finish, status becomes `ready_to_build`.
4. **Checklist Activation**
   - Checklist tasks populate (Create Cohort, Add Team Member, Publish First Lesson). Each completion updates progress bar and sends micro-celebration toast.

## Cohort Lifecycle Flow
### Creating a Cohort
- Entry via "Create" floating button. Modal collects cohort name, description, target audience, start date.
- On submit, backend creates cohort draft, returns ID; UI routes to multi-step setup (Curriculum → Pricing → Communication → Review).
- Each step autosaves and validates required data. Incomplete steps indicated on progress tracker.
- Final review displays summary with edit anchors. Publish action triggers validation suite (content completeness, price rules, compliance). Success transitions cohort to `upcoming` status and notifies linked learners.

### Managing Active Cohorts
- **Dashboard Update:** When attendance data arrives, system recalculates cohort health score and updates KPI card.
- **Assignments:** Provider marking an assignment triggers workflow: status change `pending_review` → `in_review` → `graded`. Push notifications to learner upon status updates.
- **Announcements:** Posting announcement writes to messaging service, pins message in cohort feed, and optionally triggers email broadcast if toggle enabled.
- **Risk Alerts:** If engagement drops below threshold, background job emits `cohort_risk` event. Dashboard surfaces alert card with recommended interventions.

### Ending Cohorts
- Provider taps "Complete Cohort" action after final session. Flow prompts to confirm deliverables (final grades, feedback surveys). Once completed, cohort marked `archived`, data moves to analytics backlog, and learners receive graduation email.

## Lesson Publishing Logic
- **Drafting:** Lessons remain `draft` until all required metadata (title, objective, duration, module) validated.
- **Scheduling:** When scheduling, system checks for conflicting timeslots, prerequisites completion, and resource availability.
- **Publishing:** Trigger sends notifications to assigned cohorts, updates curriculum accordion, and indexes lesson for search.
- **Versioning:** Editing a published lesson creates `version+1` draft. Provider can preview delta, run diff view, and schedule replacement. Upon publish, old version archived but accessible in history.

## Scheduling & Calendar
- Calendar operations use concurrency-safe updates. Dragging session triggers `session_move_requested` event, server validates resources, responds with `session_move_confirmed` or failure reason (resource conflict, outside schedule window).
- Bulk edits processed sequentially; UI displays progress indicator and partial failure summary with retry options.
- Integrations with Google/Outlook: toggling sync initiates OAuth handshake; once connected, events mirrored with unique external IDs to prevent duplicates.

## Messaging & Notifications Flow
- Messaging uses WebSocket channel for real-time updates. When provider sends message, message state transitions: `sending` → `sent` (server ack) → `delivered` (recipient receipt) → `read` (recipient open event).
- Saved replies management persists templates; selecting template injects content and logs usage analytics.
- Notifications center aggregates events with priority ranking. Actions (Mark read, Snooze) update state and propagate to server to ensure cross-device consistency.
- SLA indicator calculates time since last learner message; if threshold exceeded, triggers `response_overdue` alert and surfaces reminder.

## Analytics & Insights Flow
- Data pipeline fetches metrics hourly. When provider changes filters, API query executed with caching to reduce load.
- Insight cards derived from rule engine. When new insight generated, app displays toast and inserts into insights feed. Provider can dismiss or mark as resolved; state persists for reporting.
- Report Builder export requests queue asynchronously; once ready, server sends push/email with download link. UI shows progress tracker and handles expiration of links.

## Billing & Payouts Flow
- Payment setup integrates with payment processor. Status updates displayed in payout panel and wallet overview.
- When new payment processed (learner purchase), backend emits `payment_received` event; UI updates revenue KPI, ledger, wallet balance, and sends notification.
- Payout scheduling logic ensures threshold met before initiating transfer; provider can expedite (with fee). Actions validated for compliance.
- Invoice center exposes invoice generation, reminder scheduling, and download endpoints; actions logged for audit.
- Promo and coupon management updates pricing rules service; changes propagate to checkout within 5 minutes with rollback support.

## Tutor Management Flow
- Tutor directory fetches aggregated tutor profiles with filters; selecting filter updates query parameters and caches results.
- Assigning tutor to cohort triggers capacity check and sends confirmation to tutor with calendar invite.
- Payout adjustments recalculate earnings projections and update finance ledger; approval workflow required for large changes.
- Compliance checklist monitors onboarding tasks; completion unlocks ability to receive assignments and payouts.

## Creation Studio Flow
- Entry tiles map to creation wizards; selecting tile loads respective workflow with ability to resume drafts.
- Draft autosave occurs every 10 seconds; snapshots stored per user and versioned for restore.
- AI assistant suggestions fetched contextually based on step; user actions logged for analytics on adoption.
- Publishing from studio triggers validation pipeline and, upon success, notifies relevant management dashboards to refresh.

## Course & Ebook Management Flow
- Dashboard tabs lazy-load content; switching tabs triggers targeted API calls with caching to reduce redundant fetches.
- Updating pricing validates currency rules, promotional overlaps, and notifies finance service to adjust revenue forecasts.
- Royalty split adjustments require dual confirmation (owner + finance admin) and update payout schedules.
- Automation rules saved to workflow engine; toggling on/off updates active triggers immediately.

## Community Oversight Flow
- Community builder stepper enforces required fields before proceeding; preview updates in real time as configuration changes.
- Member management actions (promote, suspend) update membership service and notify affected users; suspension triggers content review.
- Moderation queue subscribes to flagged content feed; actions logged with timestamp, moderator ID, and resolution notes.
- Community switcher state persisted per user; unread counts pulled via WebSocket and cached for quick transitions.

## Settings & Permissions Logic
- Role-based access controls define capabilities (Owner, Manager, Mentor, Support). UI hides unauthorized actions and displays tooltip when limited.
- Team invites create `pending_invite` entries; recipients accept via email deep link. Declined invites recorded with reason.
- Security tab surfaces active sessions; provider can revoke which triggers server to invalidate tokens and log event.

## Error & Recovery Patterns
- Network failures prompt retry dialog with offline queue storing pending messages or updates until connectivity restored.
- Critical errors route to fallback screen with support contact and log reference ID.
- Data validation issues highlight fields, scroll to first error, and provide inline helper text referencing design language guidelines.

## Automation & Integrations
- Automations allow providers to define triggers (learner misses session, new signup) and actions (send message, assign resource). Flow builder uses node-based UI; backend executes via rule engine.
- Integration status monitored; failed sync attempts produce banner alerts with remediation checklist.

## Telemetry & Monitoring
- Added instrumentation for key flows: cohort creation funnel, lesson publish time, message response time, support ticket resolution.
- Logs feed into analytics dashboards accessible to internal teams; anomalies trigger alerts for QA follow-up.

## Sunset Logic
- Legacy modules (Static Reports, Old Announcements) now redirect to new experiences with migration info. User actions tracked to ensure adoption; plan to retire redirects in v1.52.
