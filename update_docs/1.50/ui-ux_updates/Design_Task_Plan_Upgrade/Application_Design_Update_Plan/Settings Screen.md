# Settings Screen

## Layout
- Left navigation on tablet with section list; on phones use sticky segmented control at top.
- Main content uses two-column layout on large devices (form + contextual preview) and stacked sections on phones.
- Top summary banner shows account status, plan tier, storage usage, and quick links to billing/support.

## Key Interactions
- Scrollspy indicator highlights current section as user scrolls.
- Save indicators appear inline with toggles or inputs; autosave for toggles, explicit CTA for forms.
- Global search within settings allows fuzzy search for preferences.

## Visual Treatments
- Card-based sections with 16px padding, subtle divider lines between grouped controls.
- Icons in navigation adopt monochrome style to avoid distraction.
- Alerts (billing overdue, verification pending) pinned to top of relevant sections with action buttons.

## Accessibility
- Provide jump links to Accessibility settings, including voiceover-friendly descriptions.
- Ensure focus order respects visual layout when navigating via keyboard/controller.
- Support dynamic type scaling without layout breakage by allowing wrapping labels and multi-line toggles.
