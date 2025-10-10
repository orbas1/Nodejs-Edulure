# Cards

## Card System Principles
- **Touch Comfort:** Maintain 16px outer padding and 12px internal spacing to prevent accidental taps on small screens.
- **Content Hierarchy:** Reserve top third for primary imagery or metrics, middle for titles and supporting copy, bottom for actions.
- **State Variants:** Define resting, hover (for desktop previews), pressed, loading, and disabled states with consistent elevation tokens.

## Core Card Types
### Course Resume Card
- Thumbnail or slide preview with progress ring overlay showing percentage and last viewed slide/page.
- Primary CTA "Resume" plus secondary links to discussion threads and resource attachments.
- Context chip indicating format (Slides, Ebook, Audio) and estimated time to completion.

### Community Card
- Cover image with tier badge, member count, and activity indicator (green dot for live discussions).
- Action strip with "Enter Hub", "Events", and quick share icon; long-press reveals moderation tools for admins.
- Surface top pinned announcement and upcoming event preview within expandable footer.

### Explorer Discovery Card
- Entity icon and short description, tag pills for topic, and trust badges (e.g., "Verified Instructor").
- Save/follow toggle in top-right corner with microcopy feedback.
- Optional mini-metric row (rating, enrolments) to support decision-making.

### Analytics Snapshot Card (Provider)
- Spark-line or radial gauge with comparison indicator vs previous period.
- Quick filter chips for timeframe; tapping opens modal drill-down with segment filters.
- Toast confirmation when filters applied to maintain context.

### Alert & Task Card
- High-contrast border aligned with semantic colour (success, warning, error).
- Checklist pattern with progress bar for multi-step tasks (e.g., "Complete Onboarding").
- Swipe gestures to snooze, complete, or escalate.

## Accessibility Considerations
- Minimum 44px actionable targets for buttons and interactive chips.
- Provide text alternatives for icon-only controls and ensure card backgrounds maintain 4.5:1 contrast against text.
- Animations limited to 200ms easing with respect for reduced-motion setting.
