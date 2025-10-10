# Screen Text

## Tone & Voice
- Confident, instructive, and community-forward with direct verbs and inclusive language.
- Balance motivational cues ("Keep the momentum") with operational clarity ("Conversion in progress").
- Avoid jargon; explain new concepts with short tooltips or info banners.
- Ensure every widget uses reference copy from component library; provide localisation keys (e.g., `dashboard.hero.keepMomentum`).

## Copy Patterns
- **Headlines:** Action-focused, e.g., "Pick up where you left off", "Share your next deck".
- **Supporting Text:** Short sentences providing value proposition or context, limited to 80 characters.
- **Microcopy:** Provide immediate guidance such as "Slides convert automatically with narration support" or "Members you invite can join once approval is granted".
- **Error Messages:** Describe issue, impact, and solution, e.g., "Upload paused because connection dropped. We will resume when you're back online.".
- **Empty States:** Encourage action with relevant next steps, e.g., "No events scheduled yet. Plan your first session to engage your community.".
- **Status Chips:** Use concise phrases: `"In review"`, `"Syncing"`, `"Action needed"`; avoid ambiguous verbs.
- **Button Labels:** Align with widget functions; Quick Action pill uses `"Upload deck"`, `"Schedule event"`, `"Post update"`.

## Screen-Specific Copy Blocks
- **Provider Dashboard:**
  - Hero KPI subtitle: `"7-day change"` appended with `%` or currency depending on metric.
  - Conversion timeline cards include stage labels `"Queued"`, `"Processing"`, `"Ready"` and CTA `"View status"`.
  - Insights feed cards pair headline `"Learners are pausing on slide 12"` with supporting text `"Add a summary callout to maintain attention."`.
- **Media Library:**
  - Search placeholder `"Search media, tags, or owners"`.
  - Bulk action banner text `"3 items selected"` and CTA `"Publish"`, `"Archive"`.
  - Version drawer uses timeline copy `"Uploaded by Maya • 2h ago"`, `"Comment added by Luis"`.
- **Learner Home:**
  - Greeting template `"Good evening, {firstName}. Keep the momentum."` with streak microcopy `"{streakDays}-day streak"`.
  - Community highlights call-to-action `"Jump into today's discussion"`, `"Congratulate the top scorer"`.
  - Event strip uses countdown phrasing `"Starts in 45 min"`, `"Live now"`.
- **Media Viewer:**
  - Header shows progress `"Slide 4 of 16"` or `"Chapter 2 • 07:12 / 18:36"`.
  - Annotation rail tooltips `"Highlight"`, `"Comment"`, `"Pointer"`.
  - Notes panel placeholder `"Capture a thought…"`, auto-save toast `"Saved to your notebook"`.

## Content Governance
- Maintain copy inventory in localisation sheet referencing widget IDs.
- Include inclusive language review before handoff; ensure examples consider accessibility (e.g., avoid colour-only descriptors).
- Collaborate with legal/compliance for system messages regarding billing or moderation outcomes.

## Accessibility & Localisation
- Ensure key actions include text labels even when accompanied by icons.
- Prepare copy for localisation by avoiding embedded variables mid-sentence; use placeholders with fallback values.
- Provide text expansion buffer; allow up to 30% length increase for translated copy.
- Tone remains respectful and neutral across different cultures and time zones.
- Supply alt text recommendations for hero illustrations (e.g., `"Provider team reviewing analytics dashboard"`).
