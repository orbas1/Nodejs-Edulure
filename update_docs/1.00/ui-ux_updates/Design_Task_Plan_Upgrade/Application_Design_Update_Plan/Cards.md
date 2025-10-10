# Cards — Component Specifications

## Card Types Overview
| Card Type | Dimensions | Content Structure | Usage |
| --- | --- | --- | --- |
| Hero Metric Card | 160 × 120 dp (phone) / 200 × 140 dp (tablet) | Icon badge → Metric value → Trend chip | Revenue, enrolment, streak stats.
| Course Resume Card | 248 × 300 dp horizontal slider | Cover image (top 160 dp), title, lesson progress, CTA button | Learner Home, Learn screen.
| Compact List Card | Full-width 88 dp height | Thumbnail (64 dp) → Title (2 lines) → Metadata row | Library lists, community events.
| Community Post Card | Max width 344 dp, variable height | Author row → Body text → Media area → Action bar | Community feed.
| Task Timeline Card | 320 dp width, 96 dp height | Stage badge → Title → Subtext → Due date pill | Provider pipeline.
| Notification Card | 312 dp width, 88 dp height | Icon circle 40 dp → Title/Message → Action chip | Inbox, alerts center.

## Visual Treatment
- **Corner Radius:** 16 dp for primary cards, 12 dp for list tiles, 20 dp for hero cards.
- **Border:** 1 dp `rgba(148, 163, 184, 0.25)` for neutral state; apply 2 dp `primary/500` for focused state.
- **Shadow:** Level 1 default; Level 2 when card is lifted (drag, reorder).
- **Background:** Light mode `#FFFFFF`; dark mode `rgba(13, 21, 36, 0.92)` with 1 px border `rgba(96, 165, 250, 0.12)`.

## Content Guidelines
- Title max 48 characters; clamp to 2 lines with ellipsis.
- Subtitle/metadata uses `body/03` with grey `neutral/400`.
- Buttons placed bottom-right (primary) or inline chips bottom-left.
- Include status badges (success/warning/error) at top-right with 12 dp radius.

## Interaction States
| State | Treatment |
| --- | --- |
| Default | Shadow level 1, border neutral/100.
| Hover (tablet pointer) | Elevate to level 2, background lighten by 4%.
| Focus (keyboard) | Outline 2 dp `info/500`, maintain accessible contrast.
| Pressed | Reduce shadow to level 0, darken background by 6%.
| Disabled | Remove shadow, set background to `neutral/100`, text `neutral/400`.

## Media Handling
- Cover images 16:9 ratio, auto-crop centre; ensure key subject within central 60% safe area.
- Use `object-fit: cover` equivalent; overlay gradient bottom 80 dp to ensure text readability.
- Lottie/animated icons limit file size ≤ 350 KB; provide fallback PNG.

## Data Visualisation Cards
- Sparkline area occupies bottom 24 dp with gradient fill `rgba(37, 99, 235, 0.24)` → `rgba(34, 211, 238, 0.0)`.
- Axis labels use `caption/01`, 8 dp padding from edges.
- Provide toggles for period selection (7d, 30d) as pills aligned top-right.

## Accessibility Considerations
- Card actions accessible via rotor/VoiceOver order: Title → CTA button → Secondary actions.
- Provide 8 dp spacing between interactive elements inside card.
- For long press menus, display haptic feedback with ripple radius 72 dp.

## Implementation Notes
- Use component variants in design system for each card with nested auto-layout.
- Export measurement annotations showing padding and margin tokens.
- Document JSON schema for data binding (e.g., `courseCard { id, title, coverUrl, progressPercent, nextLessonLabel }`).
