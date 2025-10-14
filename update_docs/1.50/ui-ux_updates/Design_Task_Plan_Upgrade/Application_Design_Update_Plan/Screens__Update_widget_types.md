# Widget Types Catalogue – Application Design Update v1.50

## Informational Widgets
- **Hero Banner:** Large hero with CTA, progress summary, background illustration.
- **Metric Card:** Displays single KPI with icon, delta, and supporting text.
- **Insight Card:** AI-generated recommendations with action buttons.

## Action Widgets
- **Focus Shortcuts:** Icon tiles enabling quick navigation to frequent actions.
- **Checklist Module:** Interactive list with checkboxes, progress bar, and optional deadlines.
- **Automation Control:** Start/pause toggles for automation workflows.

## Communication Widgets
- **Message Preview:** Latest messages snippet with sender avatar, timestamp, and quick reply action.
- **Notification Center:** List of notifications segmented by type with mark-as-read controls.
- **Announcement Banner:** High-priority message with dismiss/acknowledge buttons.

## Learning Widgets
- **Timeline Entry:** Card summarizing lesson or event with status indicator.
- **Resource Carousel:** Horizontal list of recommended content with actions.
- **Progress Ring:** Visual representation of completion/streak metrics.

## Support Widgets
- **Support Chip:** Persistent entry for help with status indicator.
- **Feedback Prompt:** Modal or card requesting feedback after key events.
- **Status Toasts:** Temporary overlays for success/error info.

## Configuration Widgets
- **Settings Toggle Grid:** Layout of toggles grouped by category.
- **Profile Summary Card:** Editable card with avatar, name, quick actions.
- **Billing Overview:** Card showing plan, renewal date, and manage link.

## Widget Composition Guidelines
- Each widget defined with data contract, states (default, loading, empty, error), and analytics mapping.
- Widgets support theming (dark/light) and dynamic text scaling.
- Documented in component library with usage guidelines, do/don't examples.
