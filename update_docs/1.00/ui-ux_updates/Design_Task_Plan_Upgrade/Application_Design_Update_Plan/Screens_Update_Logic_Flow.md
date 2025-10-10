# Screens Logic Flow — Narrative Description

## Learner Journey
1. **Launch → Onboarding/Login:** Detect auth state. If new, show onboarding carousel → signup → profile setup. If returning, go to Home.
2. **Home → Resume:** Tap primary CTA triggers `resumeCourse` deep link → Lesson Player. Upon completion, success modal offers share + rate course.
3. **Home → Learn:** Bottom nav to Learn listing. Selecting course opens detail with CTA to start. Add to library triggers toast and updates Library list.
4. **Lesson Player → Quiz:** End-of-lesson autoprompt offers `Take quiz`. On completion, record score, show reinforcement tips, then route back to next lesson or Home.
5. **Community Access:** From Home community cards or nav tab. Compose post uses modal sheet; on publish, feed updates optimistically while request resolves.
6. **Library Management:** Library tab -> downloads manager. Actions (download/delete) update storage meter in real time.
7. **Profile/Settings:** Profile tab surfaces achievements, leads to Settings. Accessibility toggles apply instantly across app; store preferences locally and sync to cloud.
8. **Support Flow:** From Settings or error states, open Support Chat. If offline, show schedule call modal.

## Provider Journey
1. **Login → Dashboard:** Display metrics widgets and alerts. If compliance tasks outstanding, modal overlay blocks other actions until acknowledged.
2. **Create Content:** FAB → modal with options. Choosing Upload launches 5-step wizard with progress indicator. Each step validates before proceeding.
3. **Community Moderation:** Notification of flagged content opens moderation queue. Approve/Reject actions show confirmation bottom sheet.
4. **Analytics Drilldown:** Tap on revenue card → Audience Insights screen with filters. Back returns to dashboard preserving scroll state.
5. **Team Collaboration:** Team Management allows inviting members; invite modal collects email, role. Success banner displayed.

## System Handling
- **Offline State:** If network lost, show persistent banner and disable actions requiring sync. Provide route to Downloads.
- **Session Timeout:** After 60 min inactivity, prompt re-auth; maintain unsaved data locally.
- **Notification Routing:** Deep links open relevant screen with context (e.g., comment → thread detail anchored to comment ID).

## Data Sync Logic
- Home screen fetches summary endpoints sequentially with caching (courses → community → events). On refresh, use parallel fetch with skeleton states.
- Lesson player preloads next lesson assets once progress ≥80%.
- Provider analytics caches last seven days; manual refresh icon triggers API call and updates timestamp.

## Error Recovery
- Failed uploads queue for retry; show inline error card with CTA “Retry” or “Contact support”.
- Lesson playback errors show fallback download option.
- API 403 reroutes to subscription upsell (if restricted content) or contact support.
