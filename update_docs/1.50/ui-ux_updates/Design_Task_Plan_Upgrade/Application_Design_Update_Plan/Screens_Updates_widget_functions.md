# Screens Updates Widget Functions

| Widget | Function | Telemetry | Notes |
| --- | --- | --- | --- |
| Revenue Spark-line | Visualise 7-day earnings trend; click to open detailed analytics. | Logs expand/collapse, compare selections. | Powered by analytics microservice. |
| Conversion Progress Ring | Shows PowerPoint processing status; updates via websocket. | Emits stage transitions, failure reasons. | Must display fallback when offline. |
| Leaderboard Card | Ranks top community members; CTA to view profile. | Tracks CTA clicks and filter use. | Uses social graph service. |
| Announcement Tile | Highlights pinned updates/events. | Measures dismissal and reminder requests. | Should support scheduled publishing. |
| Search Result Card | Presents summary with follow/enrol CTAs. | Logs CTA conversion, scroll depth. | Variation testing for layout. |
| Notification Toggle Row | Controls channel preference per event. | Captures toggle state change, revert actions. | Provide inline description and audit badge. |
