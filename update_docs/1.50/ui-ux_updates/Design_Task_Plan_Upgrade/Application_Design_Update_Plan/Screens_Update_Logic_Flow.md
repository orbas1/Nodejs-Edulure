# Screen Logic Flow Documentation – Application Design Update v1.50

## Purpose
Detail the interactions, decision points, and state transitions associated with each major screen cluster to support implementation and QA test coverage.

## Home & Dashboard
- **Entry Conditions:** User authenticated, data sync triggered. Timeline items sorted by urgency algorithm.
- **Interactions:** Focus shortcuts perform context checks (prerequisite completion) before deep linking. Support chip opens action sheet; state indicates pending responses.
- **Exit Points:** Navigation to lessons, cohorts, calendar, or support retains scroll position for return.

## Cohort Detail
- **Tab Switching:** Maintains state per tab; caching strategy ensures previously visited tabs load instantly.
- **Announcement Pinning:** Pin/unpin updates feed order and triggers broadcast to members.
- **Member Filters:** Multi-select filters applied client-side; search query debounced 250ms.

## Lesson Player
- **Playback:** Video events update progress tracker; completion gate ensures required steps finished (quiz submission) before marking complete.
- **Transcript Drawer:** Toggle retains open state across lessons. Search results highlight matching timestamps.
- **Notes:** Autosave every 5 seconds; conflict resolution prompts when edits occur offline.

## Assignments
- **Submission Flow:** Validate required fields, upload attachments sequentially with retry. On submit, state `submitted` and show confirmation panel.
- **Rubric Review:** Expandable panels; selection triggers score calculation and stores comment.
- **Peer Review:** Stepper enforces completion of reviews before final submission; progress indicator updates after each review.

## Messaging
- **Conversation Sync:** WebSocket updates thread list; offline mode queues messages. Reaction updates propagate to other participants.
- **Saved Replies:** Template insertion merges tokens ({{learner_name}}) with real data; preview before send.
- **Notification Integration:** Replying clears corresponding notification center entry.

## Provider Dashboard & Analytics
- **KPI Refresh:** Auto-refresh every 5 minutes; manual refresh via pull-to-refresh gesture.
- **Drill Downs:** Tapping KPI opens detail modal or route; back navigation returns to original scroll position.
- **Insights:** Accepting insight creates task and logs action for analytics.

## Settings
- **Form Autosave:** Certain preferences auto-save on toggle; others require explicit Save button.
- **Security Actions:** Device revoke prompts confirmation and triggers background API call; UI updates after success.

## Error Paths
- Document fallback states for network errors, permission issues, and data unavailability. Provide user messaging and retry logic for each.

## Instrumentation
- Map each key interaction to analytics event naming (e.g., `home_focus_tile_tap`, `lesson_complete_confirmed`). Ensure consistent parameters (cohort_id, lesson_id, user_role).

## QA Coverage
- Provide test cases covering success, failure, and edge scenarios (empty states, large data sets, offline actions).
- Link to regression plan referencing automation scripts and manual test checklists.
