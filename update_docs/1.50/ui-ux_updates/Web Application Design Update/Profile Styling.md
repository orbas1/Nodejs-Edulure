# Profile Styling Guidelines

## Typography & Colour
- Headline (name) uses `--font-lg` at weight 700.
- Secondary info uses `--text-secondary` colour.
- Buttons adopt accent palette consistent with button spec.

## Layout
- Two-column layout on desktop: main column (8 units) for content, side column (4 units) for badges and affiliations.
- On tablet/mobile, stack sections with sticky CTA bar at bottom for follow/message.

## Component Styling
- Stats chips: 12px radius, background `rgba(76, 125, 255, 0.12)`, icon + label.
- Highlight carousel cards adopt card styling with accent border when featured.
- Activity timeline uses vertical line with accent dots per entry.

## Interaction States
- Follow button toggles between primary and outline state; include transition.
- Sticky CTA bar shrinks to icon-only when user scrolls past 60% page height.
- Provide focus outlines for keyboard navigation around sub-nav links.

## Accessibility
- Ensure contrast ratio > 4.5:1 for text on hero backgrounds; apply gradient overlay if needed.
- Provide skip-to-content link to jump past hero.
