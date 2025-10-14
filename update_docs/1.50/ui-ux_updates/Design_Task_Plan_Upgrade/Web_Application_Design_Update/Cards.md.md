# Card Patterns – Web Application Design Update v1.50

## Card Types
- **Feature Cards:** Marketing callouts with icon, headline, description, CTA.
- **Metric Cards:** Dashboard KPIs with value, delta, sparkline, filter pill.
- **Content Cards:** Cohort previews, resource listings, blog posts with imagery and metadata.
- **Insight Cards:** Data-driven recommendations with action buttons.
- **Testimonial Cards:** Quote, avatar, role, rating stars.

## Anatomy
- Container radius 16px (marketing) / 12px (dashboard), padding 24px (desktop) / 16px (tablet).
- Header label (uppercase Body S), main title (Heading M), supporting copy (Body M), CTA (Button or link).
- Optional media slot top or left for imagery.
- Footers for metadata, tags, or secondary actions.

## Interaction States
- Hover: subtle lift (translateY(-4px)) + stronger shadow; CTA button hover color shift.
- Focus: 3px gradient outline with offset; maintain accessibility for keyboard.
- Selected: gradient border 2px, checkmark overlay optional.

## Responsive Behavior
- On mobile, cards stack vertically with full-width layout. Media repositioned above text.
- Multi-column layouts adjust from 3-column (desktop) to 2-column (tablet) to 1-column (mobile).

## Accessibility
- Ensure contrast ratio 4.5:1 for text. Provide alt text for imagery within cards.
- Maintain logical focus order for interactive elements.

## Implementation Notes
- Use CSS utility classes or component library (React) with variants `feature`, `metric`, `content`.
- Provide Storybook examples showing states and responsive behavior.
- Track interactions via analytics events (e.g., `card_feature_cta_click`).
