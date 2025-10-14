# Forms Strategy – Application Design Update v1.50

## Goals
- Simplify data entry for learners and providers across onboarding, assignments, cohort setup, and settings workflows.
- Ensure consistent validation, inline guidance, and accessibility compliance.

## Component Inventory
- Text input (single-line, multi-line), dropdown, segmented control, date/time picker, checkbox, radio, toggle switch, file upload, signature pad.
- Composite components: stepper forms, review summary screens, form-level banners (error/success/info).

## Layout Patterns
- Mobile forms use single column with 24px vertical spacing between fields; section headers 32px margin above.
- Provider tablet/desktop variants allow two-column layout for grouped fields (e.g., billing info) maintaining 24px gutter.
- Sticky action bar with primary and secondary buttons at bottom for long forms.

## Validation & Feedback
- Real-time validation triggered on blur; required fields flagged with asterisk and `aria-required`.
- Error state includes red border (#DC2626), error icon, helper text describing remediation.
- Success states provide subtle green underline (#10B981) and optional check icon for multi-step forms.
- Form-level errors summarized in banner at top referencing invalid fields with anchor links.

## Accessibility
- Labels always visible; placeholder used for hints only.
- Provide descriptive aria labels for icon-only controls (e.g., attachments, microphone).
- Keyboard navigation order sequential; focus ring visible 3px (#A5B4FC).
- Form controls meet 48x48 touch target, with 8px spacing between controls.

## Specialized Workflows
- **Onboarding Stepper:** 4 steps with progress indicator, ability to save and exit, resume via deep link.
- **Assignment Submission:** File upload supports drag-and-drop, progress indicator, status list of attachments with remove action.
- **Payment Setup:** Mask sensitive data, integrate secure keyboard, provide microcopy on security and privacy.
- **Survey Forms:** Use Likert scales, slider controls, open text; randomize order for unbiased responses.

## Error Handling
- Provide fallback message for server errors with retry option; log error ID for support.
- Offline mode caches form data; prompt user to submit when reconnected.

## QA Checklist
- Validate keyboard covering inputs on mobile, ensure view scrolls appropriately.
- Confirm screen reader reads label, hint, error in correct order.
- Test dynamic type scaling to ensure no truncation or overlapping elements.
- Ensure form submission disabled until required fields met; primary button disabled state accessible.
