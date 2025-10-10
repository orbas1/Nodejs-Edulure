# Application Design Update — Mobile Apps v1.00

## Experience Vision
Deliver a premium, mobile-first Edulure experience that feels like a personalised learning cockpit. Every interaction should help providers publish and manage programmes faster while giving learners frictionless access to media-rich lessons, community touchpoints, and support resources. The design must:
- Provide immediate clarity on "what to do next" when the app launches.
- Blend analytics, course content, and community prompts without cognitive overload.
- Prioritise inclusive, accessible interaction patterns that scale from 4.7" phones to 12.9" tablets.

## Strategic Design Pillars
1. **Task-Centric Navigation** – No critical job-to-be-done requires more than two taps from a primary screen. Bottom navigation (learner) and docked action menus (provider) expose top tasks with clear iconography and text labels.
2. **Context Preservation** – Recent activity, media progress, and conversation drafts persist locally. Toasts indicate background sync states, and skeleton placeholders maintain layout stability during loading.
3. **Guided Discovery** – Algorithmic recommendations appear within structured sections backed by manual editorial curations. Each carousel communicates why it is shown through short descriptors (“Because you followed AI Cohort”).
4. **Operational Transparency** – Upload queues, payout checkpoints, and assessment grading appear as timeline widgets with explicit status badges and timestamps.
5. **Accessibility & Inclusivity** – WCAG 2.2 AA compliance with high-contrast mode, dyslexia-friendly font toggle, and motion reduction switch exposed in the profile flyout.
6. **Performance-Ready Assets** – Provide redlines, Lottie specs, and density guidelines so engineering can implement without guesswork.

## Primary App Shells
- **Learner Shell:** Bottom navigation with five anchors (Home, Learn, Community, Library, Profile). Supports floating action button (FAB) for quick resume or scanning QR. Adaptive top app bar collapses on scroll and exposes search + filter chips.
- **Provider Shell:** Left-anchored collapsible rail on tablet; bottom tab bar with overflow sheet on phone. A global Create FAB opens segmented modal for upload, create cohort, schedule event.

## Layout Grid & Spacing
- Base grid: 8 dp increments with 4 dp micro-adjustments allowed for optical alignment.
- Safe area padding: 24 dp top/bottom on phone, 32 dp on tablet.
- Card gutters: 16 dp between cards in vertical stacks, 12 dp between carousel items.
- Typography baseline grid: align to 4 dp to maintain crisp text on both Android and iOS.

## Component & State Requirements
- Buttons, chips, input fields, cards, banners, and list tiles conform to shared design tokens documented in component specs.
- Each interactive element includes states: default, hover (for tablet pointer), focus, pressed, disabled, and loading.
- Motion: Use 200 ms ease-out for entrance, 150 ms ease-in for exit. Shared curve `cubic-bezier(0.2, 0.0, 0, 1)`.
- Shadows: Two elevation tiers for mobile (Level 1: 0 dp y/2 dp blur/rgba(15,23,42,0.08); Level 2: 6 dp y/12 dp blur/rgba(15,23,42,0.12)).

## Accessibility Checklist
- Minimum tap target: 48 × 48 dp with 8 dp spacing.
- Provide alternate text for all imagery and transcripts for audio/video.
- Support dynamic text scaling to 200% with responsive container reflow (cards stack vertically, chips wrap).
- Provide focus order map documented in `Screens_Update_Logic_Flow_map.md`.

## Deliverables for Engineering
- Annotated Figma frames per screen with measurements.
- Export kit listing raster (WebP @1x/@2x/@3x) and vector (SVG, Lottie JSON) assets.
- Interaction prototypes demonstrating transitions (home → lesson, lesson → community post, provider upload → review).
- Content specifications (copy decks, dummy data) for each widget.

## Success Metrics
- Reduce median time-to-resume-course by 25% (from 12 taps to 9 taps cross-platform).
- Increase daily active providers checking analytics by 18% via redesigned dashboard.
- 90% of testers rate "Understanding next action" 4/5 or higher in post-test survey.
- Crash- and jank-free navigation at 60 fps on reference devices (Pixel 6, iPhone 13 Mini, Galaxy Tab S7).

## Roadmap Alignment
- **Sprint 1 (Research + Wireframes):** Validate flows with 6 learners, 4 providers. Document in `provider_app_wireframe_changes.md` and `user_app_wireframe_changes.md`.
- **Sprint 2 (Visual Design):** Finalise tokens, typography, iconography. Update `Colours.md`, `Fonts.md`, `Cards.md`.
- **Sprint 3 (Interaction + Motion):** Prototype transitions, update `Screens_Update_Logic_Flow.md` and widget behaviour docs.
- **Sprint 4 (Spec & Handoff):** Produce redlines, asset kit, QA checklist.
- **Sprint 5 (Design QA):** Validate build against specs, log deltas in `design_change_log.md`.
