# Form Design Plan – Web Application v1.50

## Goals
- Streamline data entry across marketing lead forms, authentication, cohort management, and settings.
- Provide consistent validation, error handling, and accessible markup.

## Layout
- Desktop: two-column forms for complex sections (billing, cohort creation); maintain 24px gutters.
- Tablet/mobile: single-column layout with grouped sections separated by 32px spacing.
- Include progress indicators for multi-step forms (e.g., onboarding questionnaire, lesson builder).

## Components
- Inputs (text, number, email), text areas, selects with search, multi-select chips, date/time pickers, toggle switches, checkboxes, radio groups.
- File upload dropzones with preview thumbnails and status indicators.
- Inline tooltips for contextual guidance (hover/focus).

## Validation
- Real-time validation triggered on blur and on submit. Error states: border color #DC2626, helper text with icon.
- Success states: subtle green underline (#16A34A) and check icon for completed steps.
- Form-level alerts summarizing issues with anchor links to fields.

## Accessibility
- Labels persist above fields; placeholders used for hints only.
- Provide `aria-describedby` linking to helper/error text.
- Ensure keyboard navigation order logical; focus styles visible.

## Specialized Forms
- **Lead Capture:** Minimal fields (name, email, role); includes marketing consent checkbox.
- **Cohort Creation:** Stepper (Basics → Curriculum → Pricing → Publish). Autosave after each step.
- **Billing:** PCI-compliant fields, inline validation, plan selector with comparison cards.
- **Support Ticket:** Category select, rich text description, attachment support, severity dropdown.

## Error Handling & Offline Support
- Display friendly error messages with actionable guidance.
- Save drafts locally for lengthy forms; prompt to resume when returning.

## QA Checklist
- Test across browsers (Chrome, Safari, Firefox, Edge) and devices.
- Validate screen reader announcements, dynamic text scaling, localization (long strings).
