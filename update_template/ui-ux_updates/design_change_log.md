# Design Change Log

## Design System Updates
- Expanded color palette with new semantic tokens (`infoMuted`, `warningBold`, `successSoft`) ensuring WCAG compliance.
- Updated typography scale to improve readability on dense dashboards (16px base, 1.25 modular scale).
- Introduced iconography for safety alerts and compliance statuses with accessible labels.

## Layout Adjustments
- Adopted container queries for responsive dashboards, maintaining consistent spacing and hierarchy across breakpoints.
- Replaced card shadows with border-based elevation to support dark mode contrast.
- Simplified navigation sidebar with collapsible sections and sticky footer for account actions.

## Component Enhancements
- New KPI tile component supports trend indicators, target badges, and inline tooltips.
- Multi-step wizard redesigned with progress bar, optional step guidance, and validation summary page.
- Notification center displays grouped alerts with contextual icons and snooze actions.

## Accessibility Improvements
- All interactive elements now have minimum 44px touch target.
- Added focus-visible styling aligned with brand colors for keyboard navigation.
- Ensured charts include text alternatives and tabular data downloads.

## Prototype & Handoff
- Figma library updated to version 7.3 with detailed annotations for engineering.
- Design tokens synced via Style Dictionary pipeline to frontend repo.
- Redlines provided for complex layouts (admin analytics, provider scheduling, serviceman dispatch).

