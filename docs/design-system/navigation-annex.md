# Navigation design system dependencies (Annex A55)

Design dependencies for navigation remediation are stored in `navigation_annex_design_dependencies`, seeded in
`backend-nodejs/seeds/004_navigation_annex.js`, and surfaced through `GET /api/v1/navigation/annex`. The same
payload now enriches each token reference with metadata pulled from `design_system_tokens`, which is hydrated by
`backend-nodejs/seeds/006_design_system_assets.js` (and the SQL mirror `database/seeders/004_seed_design_system_assets.sql`).
Update the JSON sources whenever tokens, QA checks, or component references change so that the annex remains the canonical
source for design reviews.

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
- `backend-nodejs/src/models/DesignSystemTokenModel.js`
- `backend-nodejs/src/models/UxResearchInsightModel.js`

To inspect the live annex payload run:

```bash
curl "http://localhost:4000/api/v1/navigation/annex" | jq '.designDependencies'
```

Use `jq '.designSystem.catalogue[] | {category, tokens}'` to inspect every token grouped by category and confirm that light, dark, and high-contrast contexts are present for Annex reviews.

Add new tokens or QA checks by editing the JSON sources (`design_tokens.json`, `research_insights.json`) and re-running
`npm run sync:design-tokens`, then updating `navigation_annex_design_dependencies` (or its seeder) so the API, handbook,
and notification panel stay aligned with the underlying database tables.
