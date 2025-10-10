# Version 1.00 Provider Application Logic Flow Changes

## 1. Onboarding & Account Activation
1. Provider lands on welcome screen and chooses sign up method (Email, Google, Microsoft).
2. Form validation runs client-side; if valid, server issues verification email and logs onboarding state as `awaiting_verification`.
3. Clicking verification link opens profile wizard. Required fields (business name, teaching focus, timezone) validated before proceeding.
4. Payout preferences step triggers compliance check (tax form status, banking availability). Incomplete steps flagged within wizard checklist.
5. Completion logs telemetry event `provider_onboarded_v1` and unlocks dashboard modules. System enqueues welcome tour prompts for first login.

## 2. Dashboard Guidance & Task Management
1. On first login, guided tour highlights hero guidance panel, analytics widgets, and task timeline.
2. Task timeline fetches tasks from orchestration service (overdue, due today, upcoming). Each task is context-linked to relevant module.
3. Provider interacts with task (e.g., “Publish Draft Course”); on success, task status updates to completed and the list rerenders without full page refresh.
4. Snooze/dismiss actions trigger confirmation toast and update analytics on task deferral reasons.

## 3. Content Pipeline: Course Creation & Asset Upload
1. Provider selects **Create → Course** from floating CTA. Course skeleton created with status `draft` and default module.
2. Course builder loads with auto-saved state every 10 seconds. Key metadata (title, description, pricing) required before enabling publish action.
3. Adding lessons spawns nested records; dragging lessons updates ordering API and re-syncs navigation tree.
4. Choosing **Add Asset** opens asset library. Provider can upload new file or attach existing. Upload path:
   - Dropzone accepts file → client validates size/type → request upload URL.
   - File uploads with progress feedback; backend triggers optimisation worker.
   - Worker emits status events (processing, success, error) consumed by UI stepper.
5. Once assets attached and assessments configured, publish checklist evaluates readiness (mandatory sections, pricing, community access). If passes, provider can publish.
6. Publishing updates course status to `live`, schedules announcement to selected communities, and prompts optional share modal.

## 4. Live Course Maintenance
1. When a course is live, editing triggers versioning: UI prompts to create draft version.
2. Draft changes tracked separately; provider can preview updates using Preview toggle.
3. Upon republish, system archives previous version, updates learners with change log, and optionally notifies followers.

## 5. Community Event Lifecycle
1. From community hub, provider clicks **Schedule Event**.
2. Modal collects event details, tier access, co-hosts, streaming link, and optional ticketing.
3. Validation ensures no conflicts with existing events and verifies host permissions.
4. On confirmation, event record stored, community feed receives announcement card, and calendar widget refreshes.
5. Reminder notifications scheduled (24h and 1h before). Provider can start event from event card.
6. After event ends, post-event summary prompts provider to upload recording and share recap; decline action records reason for telemetry.

## 6. Affiliate Offer Management
1. Provider navigates to Affiliate tab and selects **Create Offer**.
2. Form captures course/community selection, commission type (percentage/fixed), validity dates, and cap.
3. Submitting offer calls monetisation service to generate unique referral links and update payout ledger.
4. UI presents confirmation modal with sharing options (copy link, email promoters). Offer list updates in real time with status chips.
5. Providers can pause or edit offers; actions log to audit trail and update promoters via notifications.

## 7. Follow & Learner Relationship Management
1. Notification drawer surfaces new follow requests with trust indicators.
2. Accept action updates social graph, triggers welcome automation, and logs event to analytics.
3. Decline/block requires confirmation; system revokes pending invites and updates privacy settings.
4. Follow analytics widget refreshes to display conversion funnel and anomalies (e.g., high decline rate) with recommended actions.

## 8. Support & Compliance Workflows
1. Provider opens Support hub and submits ticket if needed. Form auto-fills organisation info and attaches context (current page, session logs if permitted).
2. Ticket creation triggers acknowledgement toast and adds item to Support tab with status tracking.
3. Compliance settings (DRM, moderation) require confirmation modal summarising impact. On confirm, backend updates policy service and app displays success banner.
4. Every change writes to audit log accessible from Settings.

## 9. Notifications & Messaging
1. Header bell badge counts unread items by priority. Clicking opens drawer segmented into Alerts, Messages, Tasks.
2. Selecting an alert marks it read, updates feed, and optionally opens related module in side panel to reduce navigation.
3. Messaging composer supports attachments; sending message pushes to conversation thread with delivered/read states from real-time service.

## 10. Mobile-Specific Logic
1. Mobile layout surfaces primary actions via bottom nav; tapping Create reveals sheet with same options as desktop.
2. Modals present as full-screen; progress saved when user swipes down to close to prevent data loss.
3. Background sync keeps analytics and tasks updated; offline mode caches drafts and retries on reconnect.
