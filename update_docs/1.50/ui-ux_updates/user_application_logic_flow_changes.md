# Learner Application Logic Flow Changes (v1.50)

## Architectural Updates
- Migrated to centralized `LearnerEventHub` for broadcasting lesson completion, assignment submission, and chat events to maintain state parity across tabs.
- Implemented background sync scheduler running every 3 minutes when app active; reduces stale data in timeline, assignments, and chat.
- Standardized optimistic updates for progress adjustments with server confirmation banners and rollback handling.

## Onboarding Journey
1. **Account Creation**
   - Supports email/password, Google, Apple sign-in. Validates password strength, ensures consent toggles complete, and stores referral code if provided.
   - Successful registration triggers welcome email and sets user status to `needs_profile`.
2. **Profile Setup**
   - Multi-step wizard: avatar selection, interests, learning goals, preferred communication channel. Each step autosaves; incomplete steps flagged in navigation dots.
   - Selection of interests seeds recommendation engine.
3. **Cohort Discovery**
   - Explore cohorts carousel filtered by interests. Joining a cohort updates timeline and home hero CTA immediately.
   - If no cohort selected, app surfaces guided onboarding tips and prompts to schedule call with advisor.
4. **First-Run Checklist**
   - After joining, checklist tracks tasks (Review Orientation, Introduce Yourself, Schedule First Session). Completion triggers celebration animation and enables streak tracking.

## Daily Workflow Logic
### Home Feed Refresh
- On app launch, system fetches prioritized tasks: upcoming sessions, overdue assignments, mentor updates.
- Timeline cards sorted by urgency using scoring algorithm (due soon > new content > community highlights).
- Support chip state derived from open ticket count; displays indicator when mentor message pending.

### Focus Actions
- Tapping "Resume Lesson" attempts to open last incomplete lesson. If lesson requires prerequisites, modal instructs user.
- "Join Live" fetches next live session; if no session within 15 minutes, button disabled with tooltip "No live sessions soon".
- "Review Notes" opens note workspace filtered to last touched module; background sync ensures latest transcripts available offline.

## Lesson Consumption Flow
- When lesson opened, progress tracked at 5% increments; reaching 90% prompts micro-reminder to finish.
- Completion triggers `lesson_completed` event updating progress ring, awarding XP, and unlocking next module.
- If lesson includes quiz, completion gated until quiz submitted. Quiz failure generates remediation suggestions and requeue of lesson in timeline.
- For live sessions, join button initiates handshake with video service; fallback to web join link if native fails.

## Assignments & Assessment Flow
- Assignment list fetches grouped data: active, upcoming, past. Each change in status triggers local notifications and updates timeline order.
- Submission process saves drafts to local storage to prevent loss during connectivity drops.
- After submission, status transitions to `submitted`; when mentor feedback arrives, event updates card, sends push notification, and anchors feedback tab.
- Peer review assignments follow step-based gating; cannot proceed to submission until required peer reviews complete.

## Community & Messaging Flow
- Chat hub uses WebSockets; offline queue ensures messages typed offline send when connection restored.
- Mentions trigger notification center entries. Thread read state synced across devices via server timestamp.
- Reaction interactions update count instantly; backend reconciles duplicates to ensure accurate totals.
- Support requests route to Zendesk integration; ticket ID stored in app for status tracking.

## Unified Inbox Flow
- Inbox aggregates notifications, direct messages, announcements, and billing alerts from multiple services into normalized feed.
- Tab selections (All, Mentions, Announcements, Billing) update query parameters and fetch scoped datasets with caching for offline viewing.
- Bulk actions dispatch batched API requests; success returns updated counts and removes items locally. Failures show inline retry chips.
- Mute thread toggles update notification preferences per thread; escalations create support tickets with reference to originating entity.

## Notifications & Alerts
- Notification center aggregates events from assignments, lessons, chat, billing. Each item includes actionable CTA; tapping deep-links to relevant screen.
- Snooze functionality allows hiding notifications for 24 hours; stored server-side.
- Billing alerts escalate with email if unresolved for 48 hours.

## Consent Capture Flow
1. **Entry Points**
   - Consent drawer accessible from onboarding checklist, profile preferences, and any feature requiring elevated permissions (marketing emails, research studies). When triggered mid-task, app caches context to resume after completion.
2. **Disclosure Stage**
   - Drawer loads consent card with plain-language summary, legal reference number, and link to full policy. System fetches latest version hash to avoid stale acceptance.
   - Tracks jurisdiction context (GDPR, COPPA, regional) based on profile metadata; unsupported locales display fallback message and disable acceptance until localisation complete.
3. **Decision Stage**
   - Toggle or Accept/Decline buttons require biometric/PIN confirmation on supported devices; fallback to password re-auth if biometric disabled. Submission posts to compliance service, awaiting cryptographic receipt before closing drawer.
   - Decline path prompts optional feedback survey (multi-select reasons) and offers scheduling call with advisor; results stored for product analytics.
4. **Confirmation & Logging**
   - Success state surfaces toast summarising action, updates consent timeline, and invalidates cached feature flags dependent on consent (e.g., personalised recommendations).
   - Background job queues CDC event; if API response delayed >5s, UI shows persistent status pill until acknowledgement arrives, preventing duplicate submissions.

## Privacy Dashboard Flow
- **Overview Load:** On navigation, app fetches aggregated privacy metrics (active consents count, open DSR requests, data category footprint) via privacy summary endpoint with caching TTL 60s to limit repeated calls.
- **Timeline Interaction:** Selecting an event card opens detail modal with timestamp, legal basis, and actions (View Evidence, Contact Support). Critical incidents include share sheet for notifying guardians and escalate button that opens chat with compliance advocate.
- **Data Category Drilldown:** Tapping a category expands detail sheet enumerating data fields, retention policy, encryption status, and purge eligibility. Eligible items expose "Request Redaction" CTA launching consent workflow pre-filled with data category context.
- **SLA Tracking:** Open DSR requests display countdown chips; when <24h remaining, chip turns amber and triggers push notification. Completion updates timeline and archives status in local cache for offline visibility.

## Scam & Fraud Education Flow
1. **Content Discovery**
   - Privacy dashboard hero banner cycles educational campaigns; tapping opens playlist view filtered by "Safety" taxonomy. Analytics event `safety_content_opened` logged with cohort metadata for measurement.
2. **Module Consumption**
   - Each module uses card-based player with progress indicator. Video modules track 90% watch threshold; article modules require scroll depth + comprehension quiz. Failure to meet completion criteria keeps module flagged as "In Progress".
3. **Assessment & Certification**
   - Quizzes present scenario-based questions with explanations for incorrect answers. Achieving ≥80% triggers completion modal awarding "Safety Certified" badge, offers share CTA, and registers certification in compliance ledger for risk scoring.
4. **Escalation & Reporting**
   - Each module footer includes "Report Suspicious Activity" button launching pre-filled support ticket referencing education context. Submission attaches module ID for analytics correlation.

## Profile & Personalization Logic
- Skills & goals module tracks progress using backend metrics; updating a goal triggers recalculation of recommended resources.
- Preference toggles adjust push notification categories and theme selection; persisted via user settings API.
- Billing updates validated with payment provider; pending states display until confirmation.
- Wallet tile retrieves current balance and upcoming charges; tapping loads wallet detail route with transaction history paginated by month.
- Finance alerts triggered when invoice overdue >3 days; alert CTA deep-links to checkout with invoice context appended.

## Wallet & Transactions Flow
- Wallet detail fetches ledger with infinite scroll; ledger entries grouped by category and support filter toggles (Purchases, Refunds, Rewards).
- Add Funds flow integrates with payment gateway, supports saved payment methods, and updates balance optimistically pending confirmation.
- Withdraw requests validate identity verification before submission; status updates propagate via push notification and inbox entry.
- Transaction detail view allows invoice download, dispute initiation (creating support ticket), and tagging spending for analytics.

## Analytics & Motivation
- Streak system resets after 48 hours inactivity; recovery grace provided via push reminder at 36 hours.
- XP points awarded for lesson completion, assignment submission, community participation; thresholds unlock badges.
- Weekly summary generated Sunday evening; available via home hero and emailed digest.

## Offline Mode
- App caches last 10 lessons (video transcripts, attachments) and upcoming assignments. Offline banner indicates limited functionality.
- Actions queued offline (note edits, assignment drafts) sync upon reconnect with conflict resolution prompts.

## Creation Companion Workflow
1. **Project Sync & Filtering**
   - On entry, service loads cached projects and communities, then triggers background sync for remote updates. Filter selection recalculates urgency weighting (requires attention > drafts > published) to sort cards.
   - Offline banner shows last sync time; manual refresh triggers queue replay before fetching API data.
2. **Status Changes & Reviews**
   - Approve/Request Changes actions optimistically update card state, append queue entry, and surface toast indicating immediate update or queued sync. Requesting changes prompts modal for reviewer notes; submission updates metadata map and pending action list.
   - Outline approvals within detail sheet update metadata and log reviewer/time; offline queue persists payload to Hive.
3. **Community Sharing**
   - Share dialog enforces non-empty message and deduplicated tags. Submission posts to `/communities/:id/posts` when online; offline path queues share with context (project id, community id, payload snapshot).
   - After sync, project pending actions remove queue entry; UI displays success toast referencing community name.
4. **Queue Replay & Error Handling**
   - Sync routine processes queue sequentially; 5xx errors mark actions as deferred (message displayed in pending strip) while 4xx/410 mark failed with actionable copy.
   - Authentication failures remove queue entry and prompt sign-in; offline detection halts replay until connectivity restored.

## Error Handling & Support
- Validation errors highlight fields with contextual microcopy. Provide direct link to support if repeated failure occurs.
- Critical system errors display fallback screen with status code, retry, and copyable error ID.
- Chat fails gracefully with inline error message and retry button.

## Deprecations
- Deprecated legacy "Goals" modal replaced with comprehensive goals module in profile.
- Removed redundant "Announcements" list; integrated into Feed cards with filter chips.
