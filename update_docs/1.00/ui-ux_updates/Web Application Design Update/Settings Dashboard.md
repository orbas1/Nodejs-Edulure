# Settings Dashboard Layout – Web Application v1.00

## Overview Tab Structure
- **Hero Card:** 640×200px showing account completeness percentage with radial progress (thickness 12px) and CTA "Complete profile".
- **Quick Toggles:** Grid of 4 toggle cards (Dark mode, Email digest, Two-factor auth, Weekly summary). Each card 200×160px with icon and switch.
- **Recent Activity:** Table of last 5 changes (Setting, User, Date, Details).
- **Support Shortcuts:** Card with links to Help centre, Contact support, Status page.

## Layout
- Use 12-column grid: Hero spans columns 1–8, Quick toggles 9–12 stacked two rows.
- Recent activity table spans columns 1–8, support shortcuts columns 9–12.
- Provide 32px spacing between modules.

## Interactions
- Radial progress animates from 0 to value on load (duration 1s, ease-out).
- Toggle cards update instantly, show "Saved" toast bottom-left.
- Activity table rows clickable to open detail drawer.

## Accessibility
- Provide textual equivalent for completion percentage.
- Ensure toggles accessible via keyboard and labelled.
