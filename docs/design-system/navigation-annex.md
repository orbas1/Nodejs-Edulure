# Navigation design system dependencies (Annex A55)

Design dependencies for navigation remediation are stored in `navigation_annex_design_dependencies`, seeded in
`backend-nodejs/seeds/004_navigation_annex.js`, and surfaced through `GET /api/v1/navigation/annex`. Update the
seed data whenever tokens, QA checks, or component references change so that the annex remains the canonical source for design
reviews.

## Token adoption
- **Feed shell spacing** – `--space-4` keeps header padding consistent across `AppTopBar` and feed cards.
- **Course skeleton palette** – `--skeleton-base` standardises shimmer colours and aligns with reduced-motion expectations.
- **Upload readiness indicator** – `--uploads-progress-radius` gives the instructor builder’s readiness pill the shared border
  radius.

## QA checklist
1. `feed-focus-outline` – verify feed header controls expose the focus-visible ring token.
2. `courses-motion-pref` – confirm course skeleton loaders honour the `prefers-reduced-motion` media query.
3. `builder-progress-contrast` – ensure the instructor upload readiness indicator meets a 4.5:1 contrast ratio in light and
   dark themes.

## Asset references
- `frontend-reactjs/src/components/navigation/AppTopBar.jsx`
- `frontend-reactjs/src/pages/Courses.jsx`
- `frontend-reactjs/src/pages/dashboard/InstructorCourseCreate.jsx`
- `frontend-reactjs/src/styles/tokens.css`

To inspect the live annex payload run:

```bash
curl "http://localhost:4000/api/v1/navigation/annex" | jq '.designDependencies'
```

Add new tokens or QA checks by inserting rows into `navigation_annex_design_dependencies` (or editing the seeder) so the API,
handbook, and notification panel stay aligned.
