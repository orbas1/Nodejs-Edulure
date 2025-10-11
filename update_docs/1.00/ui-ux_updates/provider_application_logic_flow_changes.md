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

## 11. Financial Operations & Compliance Handling
1. Payout centre aggregates transactions; when provider requests payout, system validates bank verification and tax compliance before queuing disbursement job.
2. Disbursement status updates propagate to payout timeline; anomalies trigger alert banner and open incident detail drawer.
3. Invoice resend action triggers email service call and logs event; download initiates signed URL creation with expiry timer displayed to user.
4. Compliance checklist tracks completion state; uploading document stores metadata, triggers review workflow, and displays pending approval badge.

## 12. Promotion & Marketplace Workflow
1. Creating promotion opens stepper; each step autosaves draft to prevent loss. Audience selection queries segmentation service for eligible cohorts.
2. Incentive configuration enforces guardrails (max discount, date ranges). Review step previews learner-facing card using dynamic data.
3. Publishing promotion schedules notifications per channel; analytics service records baseline metrics for control group comparison.
4. Pausing or editing live campaign triggers confirmation modal and updates all dependent notifications to prevent stale messaging.

## 13. Support & Incident Response
1. Help centre dock surfaces relevant articles using current route context; selecting contact option pre-fills ticket form with metadata.
2. Status incidents broadcast via websocket; provider acknowledgement dismisses banner and logs event for audit.
3. Support tickets sync bi-directionally with CRM; updates reflect in-app with status timeline and option to add notes for success manager.

## 14. Experimentation & QA
1. When provider enables experiment, system duplicates baseline entity, stores variant metadata, and starts traffic allocation job.
2. Analytics service collects conversion metrics; UI displays significance indicator and recommendation (promote, continue, stop).
3. Approval of QA checklist transitions content state from `in_review` to `ready_to_publish`, unlocking publish button and notifying assigned reviewers.

## 15. Tutor Scheduling & Live Classroom Operations
1. Tutor accesses **Schedule** tab; calendar loads with availability slots. Dragging to create slot opens sheet for duration, price, and modality, validating against global preferences and conflicting bookings.
2. Publishing availability triggers backend update and surfaces confirmation toast; system queues reminder to refresh availability weekly. Slots can be bulk-edited via multi-select referencing `provider_app_wireframe_changes.md`.
3. Incoming booking appears in **Requests** column with learner details, agenda, and notes. Tutor can Accept, Propose new time, or Decline with reason codes; responses dispatch notifications and update booking status in real time.
4. Accepted booking moves to **Upcoming Sessions**; pre-session checklist prompts tutor to upload resources, configure moderation settings, and assign co-hosts. Compliance banner surfaces if payout/tax info incomplete.
5. Starting live classroom from dashboard generates Agora token, opens host console with stage preview, roster, chat, and moderation tools referencing `Admin_panel_drawings.md`. Host can promote co-hosts, mute all, enable recording, and trigger polls.
6. Post-session summary collects attendance, engagement metrics, chat transcript, and recording status. Tutor adds recap notes and marks session as completed; payout readiness step confirms rate, travel time, and optional adjustments before submitting to finance workflow.
