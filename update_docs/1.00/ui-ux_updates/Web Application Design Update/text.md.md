# Content & Microcopy Guidelines – Web Application v1.00

## Tone & Voice
- **Voice:** Supportive, expert mentor. Blend inspiration with actionable direction.
- **Tone Modulation:**
  - Home/marketing: aspirational and visionary.
  - Dashboard: concise, data-driven, confidence-building.
  - Error states: empathetic, solution-oriented.
- Avoid jargon; prefer direct verbs ("Launch", "Review", "Share").

## Copy Structure
- **Headlines:** Maximum 8 words, use present tense. Pair with eyebrow label to establish context.
- **Body Copy:** Use short sentences (<18 words). Break into paragraphs no longer than 3 sentences.
- **CTAs:** Begin with verbs; avoid generic "Click here". Provide secondary context in tooltip if needed.
- **Empty States:** Provide purpose, next action, and optional link to help centre.

## Messaging Matrix
| Scenario | Primary Message | Supporting Copy | CTA |
| --- | --- | --- | --- |
| New learner onboarding | "Welcome to your learning orbit" | "Pick up where you left off or explore curated tracks tailored to your goals." | "Start exploring" |
| Provider dashboard zero data | "Publish your first course" | "Use the guided builder to structure lessons, add media, and share with your audience." | "Create course" |
| Community inactivity | "Spark a conversation" | "Post a prompt or schedule a live session to re-engage members." | "Compose post" |
| Payment success | "Payout scheduled" | "Funds will arrive in your account within 2 business days. Track status in finance." | "View finance" |
| Error retrieving data | "We lost connection" | "Retry in a few moments or check system status. All changes are saved." | "Retry" |

## Style Rules
- Use Oxford comma in lists.
- Use title case for navigation labels and button text; sentence case for body copy.
- Display dates as `15 Aug 2024` and times as `14:30 UTC`.
- Use metric units; convert automatically for locale preferences.
- Em dash (—) with spaces for emphasis; avoid ellipses except in loading states.

## Accessibility & Inclusivity
- Avoid gendered language; use "they" or role-specific nouns.
- Provide alternative text descriptions aligned with copy.
- Ensure reading level stays at or below grade 9 for general surfaces; allow grade 11 for provider analytics.

## Governance
- Store copy strings in localisation files with keys matching component + usage (e.g., `home.hero.headline`).
- Changes to tone require review from product marketing; log modifications in `design_change_log.md`.
- Use Grammarly style guide enforcement integrated with CMS before publishing.
