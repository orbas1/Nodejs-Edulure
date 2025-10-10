# Form Design Guidelines

## Structure
- Group related fields into sections with subheadings; use accordions for advanced settings.
- Provide progress indicator for multi-step flows (upload, onboarding, monetisation setup).
- Auto-save drafts every 30 seconds and when navigating between steps.

## Field Patterns
- **Text Inputs:** 48px height, 12px padding; floating label pattern with accent-coloured active underline.
- **Selects & Comboboxes:** Support search, multi-select chips, and async loading for large datasets (communities, tags).
- **Date & Time Pickers:** Provide combined date-time selection, respect locale format, and default to user's timezone.
- **Toggle Switches:** Used for binary preferences (public/private). Provide descriptive label and helper text.
- **Slider Controls:** Manage commission rates with real-time percentage display and min/max markers.

## Validation & Feedback
- Validate on blur for single-step forms; on step submission for wizards.
- Display inline error message beneath field using `--accent-crimson` text and icon.
- Provide summary of errors at top for complex forms with anchor links to each field.
- Show success checkmark on completion; provide "View" CTA to inspect created entity.

## Accessibility
- Associate labels with inputs using `for`/`id` attributes; include `aria-describedby` for helper text.
- Ensure error messages are announced via `role="alert"`.
- Offer keyboard navigation for steppers (arrow keys to switch steps) and lists (up/down keys).

## Specialised Flows
- **Asset Upload:** Step 1 details & metadata, Step 2 file upload with progress/resume, Step 3 access control & pricing, Step 4 confirmation.
- **Community Event Creation:** Stepper with event info, speaker lineup, monetisation options, preview.
- **Settings Bulk Update:** Provide checkboxes to apply changes to multiple communities, preview of impacted items, undo toast.
