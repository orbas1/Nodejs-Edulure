# Button System

## Hierarchy
- **Primary:** Filled button using `--accent-electric`, white text, drop shadow disabled; reserved for main CTAs per screen.
- **Secondary:** Outline button with 1px border using `--accent-electric`, transparent background; for supportive actions.
- **Tertiary:** Text button with accent-coloured text and underline on hover; used in tables and inline actions.
- **Destructive:** Filled button using `--accent-crimson`, emphasises irreversible actions (delete, revoke access).

## States
| State | Treatment |
| --- | --- |
| Default | Standard background, 8px border radius, medium weight typography |
| Hover | Slightly lighter accent (`#5C8CFF`), drop shadow `var(--shadow-low)` |
| Active | Background darkens, apply `transform: scale(0.98)` |
| Disabled | Reduce opacity to 0.4, disable pointer events, maintain text contrast |
| Loading | Replace label with spinner component, maintain width to avoid layout shift |

## Responsive Patterns
- Mobile uses full-width primary buttons with 56px height, 16px padding.
- Multi-action toolbars collapse tertiary buttons into kebab menu at widths <900px.
- Floating action button appears on mobile feed; uses accent gradient and drop shadow `--shadow-high`.

## Accessibility
- Hit area minimum 44x44px.
- Provide `aria-live="polite"` updates when loading completes.
- For icon-only buttons, include descriptive `aria-label` and tooltip on hover.

## Usage Examples
```
<Button variant="primary" icon="plus" size="md">Create Community</Button>
<Button variant="secondary" icon="download" size="sm">Export CSV</Button>
<Button variant="tertiary" appearance="danger" icon="trash">Remove</Button>
```
