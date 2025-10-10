# Screens Update Logic Flow

1. User authenticates; global navigation loads user role to display correct dashboard variant.
2. Dashboard widgets fetch analytics aggregates; quick actions leverage same context to prefill forms.
3. When selecting media asset, state machine transitions from library view → detail → conversion timeline.
4. Community hub uses tab router to load feed, events, resources, and leaderboard; moderation actions update store and re-render.
5. Explorer flows route search parameters through query builder, apply filters, and record telemetry before returning cards.
6. Settings updates propagate to backend services and emit audit events; UI confirms success and refreshes dependent screens.
