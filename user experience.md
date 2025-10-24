# User experience research ledger

## Latest synthesis (May 2025)
- **Design system parity:** Verified that the generated tokens (`npm run sync:design-tokens`) render consistently across web and Flutter. Persona-tag density, CTA contrast, and focus states meet WCAG AA under light, dark, and high-contrast modes. Capture screenshots when running the sync to document changes in the design review folder.
- **Onboarding heuristics:** Diary study with 12 learners highlighted friction when switching from marketing site to native app. Update nav affordances to reuse the same component spacing exported via `docs/design-system/design_tokens.json`.
- **Streak recovery loops:** High-signal participants preferred contextual reminders over generic emails. Align product copy with `docs/operations/strategy.md` cadence notes so retention pushes reinforce the activation narrative.

## Research backlog
| Study | Status | Notes |
| --- | --- | --- |
| Multi-surface onboarding intercepts | Scheduled | Script participants that experienced both React and Flutter flows after next deployment. |
| Accessibility audit (dark/high contrast) | In progress | Validate newly generated Flutter themes from `Edulure-Flutter/lib/core/design_tokens.dart`. |
| Stakeholder comms tone testing | Planned | Co-create investor update templates using `docs/operations/templates/investor-update-outline.md`. |

## Ops checklist
- Run `npm run sync:design-tokens` before reviewing any UI diffs.
- Capture pre/post screenshots for marketing, dashboard, and Flutter surfaces after each token sync.
- Attach analytics traces (streak health, onboarding completion) to research summaries stored here.
