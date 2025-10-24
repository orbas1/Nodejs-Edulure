# Navigation design system dependencies (Annex A55)

This annex lists the design system work tracked for the navigation remediation effort.

## Token adoption
- **Navigation surface spacing** – ensure `AppTopBar` and `AppSidebar` consume `--space-4`, `--space-6`, and `--radius-xxl`.
- **Notification treatments** – align `AppNotificationPanel` with `--color-primary-soft`, `--shadow-card`, and responsive badge radii.
- **Upload queue** – expose `--uploads-progress-radius` and adopt it in `InstructorCourseCreate` for the upload readiness bar.

## QA checklist
1. Verify focus-visible outlines in shell components use tokenised colour scales.
2. Confirm skeleton shimmer respects `prefers-reduced-motion` and uses shared spacing tokens.
3. Validate mention badges meet 4.5:1 contrast ratio in light and dark themes.
4. Audit CTA button hierarchy across Tutor marketplace and quick actions for consistent icon placement.
5. Ensure progress indicators share the annex radius token and animate within motion guardrails.

## Asset references
- `frontend-reactjs/src/components/navigation/AppTopBar.jsx`
- `frontend-reactjs/src/components/navigation/AppNotificationPanel.jsx`
- `frontend-reactjs/src/pages/dashboard/InstructorCourseCreate.jsx`
- `frontend-reactjs/src/styles/tokens.css`
