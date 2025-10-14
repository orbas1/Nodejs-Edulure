# Widget Functions Overview – Application Design Update v1.50

## Focus Shortcuts Widget (Learner Home)
- Displays four primary actions with dynamic badge counts. Functions include deep linking, permission checks, and analytics events.
- Badge logic pulls from assignments, live sessions, saved notes, and resource recommendations.

## Cohort Health Widget (Provider Dashboard)
- Aggregates attendance, completion, satisfaction scores. Includes trend arrow and CTA to view analytics.
- Supports filter by timeframe (Week, Month, Quarter) updating values and sparkline.

## Timeline Widget
- Groups events by day with sticky headers. Each item can open detail screens or mark tasks complete.
- Supports lazy loading when scrolling; ensures events sorted by start time and priority.

## Notification Chip
- Persistent chip tracking unread messages/support tickets. Tapping opens action sheet with navigation to chat or help.
- Displays dot indicator for high priority notifications.

## Automation Summary Widget
- Provider view listing active automations with status (Running, Paused) and performance metrics (Messages sent, Open rate).
- CTA to open automation builder or logs.

## Progress Ring Widget
- Visualizes completion percentage with gradient stroke. Accepts target values (e.g., weekly learning hours) and displays delta vs goal.
- Animated transitions when progress updates; accessible text alternative provided.

## Resource Carousel
- Horizontal scrolling list of recommended resources with quick actions (Save, Share). Automatically cycles every 10 seconds when idle.
- Supports offline caching for previously loaded items.

## Analytics Insight Card
- Presents AI-generated insight text, confidence score, and CTA (Take Action, Dismiss). Accepting creates tasks.
- Tracks user responses for model tuning.

## QA Considerations
- Ensure each widget handles empty states gracefully (e.g., no resources, no notifications).
- Test widget refresh intervals, caching behavior, and accessibility labels.
