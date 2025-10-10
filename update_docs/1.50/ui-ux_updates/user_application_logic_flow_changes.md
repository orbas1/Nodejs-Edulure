# Learner Application Logic Flow Changes

## 1. Resume Learning Flow
1. Learner taps resume card from hero carousel.
2. App checks media type (PowerPoint/Ebook) and routes to appropriate viewer with persisted state.
3. Viewer preloads next segment, updates progress meter, and syncs notes/highlights asynchronously.
4. Completion triggers recommendation engine to surface next lesson or community discussion.

## 2. Join Community Flow
1. Learner selects community tile from feed or explorer.
2. Paywall check determines join vs. subscribe path; price tier sheet displayed if required.
3. On success, onboarding prompts gather interests to seed suggestions and leaderboard placement.
4. Activity feed refreshes with new community filter and notifications preferences default to digest mode.

## 3. Follow Persona Flow
1. Learner taps "Follow" on profile card.
2. Backend verifies privacy status; if private, request enters pending state, else follow confirmed instantly.
3. Follow triggers timeline injection (recent posts) and updates recommended explorer results.
4. Notification centre adds follow event; learner can adjust frequency from inline settings link.

## 4. Search & Save Flow
1. Search initiated from top bar; results load via Meilisearch with entity-specific cards.
2. Learner applies filters (level, price) updating results via debounced calls.
3. Saving item stores to "Continue Learning" list accessible from home feed quick nav.
4. Telemetry logs search query, filter usage, and follow/enrol conversions for analytics dashboards.

## 5. Settings & Accessibility Flow
1. Learner opens settings, toggles dyslexia font or dark mode.
2. Theming tokens update across app; preference stored locally and synced to profile.
3. App refreshes visible screens to ensure consistent contrast and readability.
4. Accessibility audit logs preference for QA verification.
