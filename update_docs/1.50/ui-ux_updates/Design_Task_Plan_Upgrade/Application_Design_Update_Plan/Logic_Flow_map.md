# Logic Flow Map – Application Design Update v1.50

## Key Journeys
1. **Learner Onboarding** – account creation → profile setup → cohort selection → onboarding checklist → home feed personalization.
2. **Lesson Consumption** – timeline entry → lesson detail → content playback → interactions (quiz, notes) → completion → feedback.
3. **Assignment Submission** – assignment list → detail → submission form → file upload → confirmation → mentor feedback.
4. **Provider Cohort Creation** – dashboard → create cohort → curriculum builder → pricing setup → communication preferences → publish.
5. **Provider Messaging** – alert notification → open messaging hub → compose response → send → follow-up automation.
6. **Analytics Review** – provider dashboard → analytics tab → apply filters → view insights → export/share report.

## Diagram Overview
- Each journey mapped using BPMN-style diagrams in Figma with swimlanes for user, app UI, backend services.
- Decision nodes highlight conditions (e.g., prerequisites met? payment complete?).
- Error paths documented separately with fallback UI states.

## Integration Touchpoints
- Authentication services for onboarding and secure actions.
- Content service for lesson streaming, transcripts, resources.
- Messaging service (WebSocket) for real-time updates.
- Analytics service for KPI retrieval and insights.
- Payment service for billing interactions.

## Event Triggers
- `lesson_completed`, `assignment_submitted`, `cohort_published`, `message_sent`, `notification_acknowledged` events propagate to analytics and push notifications.
- Automation triggers configured when thresholds met (e.g., `engagement_low`).

## Deliverables
- Exported flow charts (PNG/SVG) stored in `/update_docs/1.50/assets/logic_maps`.
- Companion documentation describing entry/exit criteria, success metrics, fail states, and instrumentation requirements.

## Review Schedule
- Weekly cross-team review to validate flows with engineering.
- Accessibility and QA teams review flows for potential blockers (e.g., multi-step processes requiring alternative paths).
