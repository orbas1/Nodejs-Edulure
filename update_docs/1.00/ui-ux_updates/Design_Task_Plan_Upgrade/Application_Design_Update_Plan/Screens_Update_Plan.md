# Screens Update Plan — Execution Timeline

## Phase 1: Discovery & Alignment (Week 1)
- Audit existing learner/provider screens; document pain points.
- Conduct co-creation workshop with 6 learners, 4 providers to prioritise tasks.
- Finalise screen inventory (`Screens_list.md`) and map success metrics.

## Phase 2: Wireframing (Week 2)
- Produce low-fidelity wireframes for Home, Learn, Lesson Player, Community, Provider Dashboard.
- Validate navigation flow with rapid usability tests (Maze or Useberry) targeting path completion <60 s.
- Iterate based on findings, capture in `design_change_log.md`.

## Phase 3: Visual Design (Weeks 3–4)
- Apply colour, typography tokens; craft high-fidelity mockups in Figma with component variants.
- Define imagery and illustration requirements (`Screens_update_images_and_vectors.md`).
- Review with brand and accessibility stakeholders; log sign-off.

## Phase 4: Prototyping & Interaction (Week 5)
- Build interactive prototypes for key flows (resume lesson, upload content, moderate post).
- Document motion specs and widget behaviour in `Screens_Updates_widget_functions.md`.
- Conduct moderated usability sessions capturing SUS >80 target.

## Phase 5: Handoff & QA (Week 6)
- Generate redline exports with spacing, typography, asset notes.
- Deliver JSON data schema to engineering for dummy data binding.
- Schedule design QA checkpoints aligning with sprint reviews.

## Dependencies & Risks
- Await backend confirmation for new analytics endpoints (affects Provider Dashboard).
- Ensure localisation team available for copy review in Week 4.
- Mitigate risk of scope creep by freezing P0 screen requirements at end of Week 2.

## Success Criteria
- All P0 screens pass accessibility audit (WCAG 2.2 AA) by Week 6.
- Engineering sign-off on component tokens with zero unresolved questions.
- Usability test participants report ≥4/5 clarity rating for navigation.
