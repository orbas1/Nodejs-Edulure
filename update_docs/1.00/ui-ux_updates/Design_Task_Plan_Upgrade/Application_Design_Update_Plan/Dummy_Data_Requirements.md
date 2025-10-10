# Dummy Data Requirements — Mobile Application Prototyping

## Data Sources
- **Courses Dataset:** 24 sample courses covering AI, Design, Marketing. Each entry includes `id`, `title`, `coverImage`, `category`, `duration`, `progressPercent`, `nextLessonTitle`, `instructorName`.
- **Community Threads:** 18 posts with nested comments (max depth 2). Fields: `threadId`, `author`, `avatar`, `timestamp`, `body`, `badge`, `mediaType`, `mediaUrl`, `reactions` (👍, 💬, 🔄 counts).
- **Events & Cohorts:** 12 upcoming events with `startDate`, `timeZone`, `registrationStatus`, `location`, `capacity`, `registeredCount`.
- **Provider Analytics:** Metrics per week for revenue, enrolments, completion rate. Provide arrays with 12 data points for sparkline charts.
- **Notifications:** 15 notifications covering success, warning, info states. Include `ctaLabel`, `ctaType`, `deepLink`.

## Content Guidelines
- Copy uses placeholder brand names (“Edulure Labs”, “SkillTracks AI”). Avoid lorem ipsum; ensure meaningful preview text.
- Provide multi-language strings (EN, FR, ES) for 5 key flows (onboarding, notifications) stored as nested JSON for localisation testing.
- Include accessible alt text for images (<=80 characters) describing context (“Instructor Amara presenting AR workshop”).

## Media Assets
- **Images:** Use royalty-free assets from Unsplash collections `edulure/mobile-v1` stored in design repo. Provide 3 resolutions: 600×400, 1200×800, 1800×1200.
- **Illustrations:** 6 vector scenes (SVG) for empty states (no courses, offline, no notifications). Provide asset names + Figma node IDs.
- **Lottie Animations:**
  - Upload processing (3s loop, <250 KB).
  - Celebration confetti (2s burst triggered on completion).
- **Icons:** Outline set from Feather, custom filled icons for premium features.

## Data Relationships
- Link courses to community threads via `courseId` for contextual sidebars.
- Provider analytics tied to `cohortId` to filter metrics.
- Settings toggles reference `preferenceId` to persist state.

## Edge Cases to Simulate
- Empty states (no internet, no community posts) with recommended actions.
- Error states (failed upload) with error codes.
- Long names (up to 40 characters) for courses and user names.
- High numbers (e.g., 12,450 learners) to test numeral formatting.

## Delivery Format
- Provide JSON files under `/design_prototypes/data/mobile/` segmented by feature.
- Include CSV exports for analytics to feed into charting prototypes.
- Document update script to sync data with Figma plugin (`Google Sheets Sync`).

## Maintenance Plan
- Review dummy data quarterly to align with curriculum changes.
- Tag updates in `design_change_log.md` when data schema shifts.
- Provide contact for data steward (Product Ops) to approve modifications.
