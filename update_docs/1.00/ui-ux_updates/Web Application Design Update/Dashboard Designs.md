# Dashboard Design Specification

## Provider Dashboard
- **Hero Metrics Row:** Revenue MTD, Active Learners, Conversion Rate with delta chips.
- **Engagement Trends:** Dual-axis chart for course views vs. community participation.
- **Communities Widget:** List of top communities with growth, active moderators, pending approvals.
- **Asset Performance:** Table showing recent uploads with completion rate, share count, storage usage.
- **Tasks & Alerts:** Inline list from notifications (expiring events, flagged posts).

## Learner Dashboard (if accessible via toggle)
- Summary of enrolled courses, progress, streak, next live session.
- Recommendations based on follow graph; emphasise new communities to join.

## Admin Dashboard
- **Compliance Overview:** Chart of policy incidents by severity.
- **Audit Log Snapshot:** Table showing recent role changes and payout approvals.
- **System Health:** API latency metrics, storage utilisation.

## Interaction Principles
- Allow users to rearrange widgets; persist layout per user.
- Provide "View report" CTA from each widget linking to deeper analytics.
- Include filters for timeframe (7d, 30d, 90d) and segmentation (course, community).
