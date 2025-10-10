# Form Design Specification – Web Application v1.00

## Layout Principles
- Forms align within 8-column span on desktop (max width 640px) and full width on mobile.
- Use vertical rhythm of 24px between fields, 32px before section headings.
- Multi-column forms use 2-column layout with 24px gutter at ≥1024px; collapse to single column below.

## Field Components
| Type | Height | Label | Helper/Error | Notes |
| --- | --- | --- | --- | --- |
| Text Input | 48px | 14px uppercase eyebrow + 16px label | Helper 14px/20px grey, error 14px crimson | Supports prefix icons (20px) with 12px padding |
| Textarea | Min 120px height | Label top-aligned | Character counter bottom-right (12px) | Auto-resize up to 320px |
| Select | 48px | Floating label | Dropdown list 320px width, option height 44px | Include search for >7 items |
| Date Picker | 48px | Inline label | Calendar overlay 320×360px | Supports range selection |
| Toggle | 24px track, 44px interactive | Label right aligned | Optional description below | Animates 120ms |
| Slider | Track 4px height | Label above | Value pill 32px radius | Steps defined per field |

## Validation & Messaging
- Real-time validation triggers on blur; asynchronous validation displays inline spinner.
- Error messages appear below field with icon `warning-16.svg`.
- Success states use green outline `1px solid rgba(52,211,153,0.48)`.
- Provide summary banner at top for multi-step forms listing unresolved errors with anchor links.

## Multi-Step Flow
- Stepper header 64px height with progress track 4px tall across top.
- Each step includes left column (form) and right column (summary) at ≥1280px; on mobile summary collapses to accordion below.
- Auto-save triggered every 15 seconds and on step change.

## Accessibility
- Labels use `for` attribute referencing input `id`.
- Inputs support keyboard navigation, including `space` toggling checkboxes and toggles.
- Ensure form instructions appear before interactive controls.
- Use `aria-live="polite"` for validation feedback.

## Visual Styling
- Input background: `rgba(15,23,42,0.68)` with inset shadow `0 0 0 1px rgba(148,163,184,0.24)`.
- Focus state: `0 0 0 2px rgba(56,189,248,0.64)` glow + border.
- Disabled: `rgba(15,23,42,0.32)` background, text `rgba(203,213,245,0.48)`.
- Inline icons tinted `rgba(148,163,184,0.64)` and lighten on hover.

## Specific Forms
1. **Course Creation Wizard**
   - Step 1: Details (title, subtitle, category, difficulty). Step 2: Curriculum builder (drag-and-drop list with 48px row height). Step 3: Pricing (slider for price, toggle for subscription). Step 4: Preview & publish.
   - Provide side rail showing course completeness (progress ring 64px) and checklist.
2. **Community Event Scheduler**
   - Fields: Event name, description, date/time picker, host selection (searchable select), capacity slider, streaming link.
   - Include timezone helper text auto-detected.
3. **Support Ticket Form**
   - Fields arranged in 2-column layout: issue category, subject, description, attachment uploader (drag area 320×180px).
   - Provide deflection links (FAQ) above submit button.

## Integration Notes
- Use `react-hook-form` with Zod schema for validation.
- Pre-fill data from API when editing; highlight changed fields with subtle border glow.
- Provide `onBeforeUnload` prompt if unsaved changes exist.
