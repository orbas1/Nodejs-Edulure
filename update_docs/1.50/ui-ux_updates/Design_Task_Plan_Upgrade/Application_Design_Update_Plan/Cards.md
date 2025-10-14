# Cards – Application Design Update v1.50

## Purpose & Goals
- Establish consistent card patterns for dashboards, timelines, assignments, cohort summaries, and notifications across learner and provider apps.
- Ensure cards communicate hierarchy, state, and actions clearly while remaining flexible for localization and dynamic content.

## Card Categories
1. **Metric Cards** – Display KPIs, progress, streaks. Includes iconography, primary value, delta, and CTA link.
2. **Content Cards** – Lessons, resources, assignments with thumbnail, metadata, actions (Resume, Assign, Share).
3. **Communication Cards** – Announcements, notifications, support tickets with priority flags and quick actions.
4. **Task Cards** – Checklist items with status toggles, due dates, and dependency indicators.
5. **Profile Cards** – Learner/mentor profiles, achievements, badges with avatar, stats, and message buttons.

## Anatomy Specification
- **Container:** 16px padding (mobile), 24px (tablet+), radius 16px (learner) / 12px (provider), shadow tokens `card/base` and `card/hover`.
- **Header:** Optional label or icon, uses uppercase Body Small, color `text-muted`.
- **Title:** Primary text style `Heading S` (learner) or `Heading M` (provider) with 2-line clamp.
- **Supporting Text:** `Body M` with 3-line clamp; ellipsis to indicate overflow.
- **Metadata Row:** Icon + text chips for due date, cohort, category; uses `Body S`.
- **Action Row:** Buttons or icon actions aligned right; support for up to 2 buttons plus overflow menu.
- **Status Indicator:** Badge/pill in top-right or left border for states (New, Overdue, Completed, Live).

## States & Variations
- **Default:** Standard background with drop shadow.
- **Hover/Focus:** Elevation increase + 4px lift, border accent (#6366F1) for keyboard focus.
- **Selected:** Outline 2px gradient, check icon overlay on top-left.
- **Disabled:** Reduced opacity 60%, interactions blocked.
- **Error:** Left accent bar (#DC2626) with tooltip explaining issue.
- **Success:** Subtle green background tint (#ECFDF5) for confirmation cards.

## Responsive Behavior
- Cards adjust width based on grid: full-width on mobile, two-column on small tablets, multi-column on desktop.
- Content cards convert metadata row into stacked layout when width <320px.
- Action row condenses to icon-only buttons on narrow screens; overflow menu used for secondary actions.

## Interaction Patterns
- Entire card clickable when primary action single; otherwise, use explicit buttons to avoid accidental taps.
- Provide haptic feedback on mobile when card includes toggle actions.
- Use progress bars or rings within card for assignment completion or cohort health.

## Accessibility Requirements
- Maintain minimum contrast ratio 4.5:1 for text. Ensure focus outline visible (3px) and non-overlapping with card content.
- Provide aria-labels describing card content and actions for screen readers.
- Support dynamic text resizing; titles wrap gracefully and maintain spacing.

## Content Guidelines
- Titles limited to 60 characters; supporting text 140 characters to avoid overflow.
- Use consistent verb-first action labels ("Resume Lesson", "Review Submission").
- Include context (cohort, module) for cross-surface clarity.

## Implementation Checklist
- Update Flutter `CardKit` component with new tokens, states, and variants.
- Update React Native wrappers and storybook documentation.
- Provide QA test cases for visual regression, accessibility focus order, and state transitions.
