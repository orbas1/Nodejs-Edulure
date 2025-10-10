# Web Application Logic Flow Changes

## 1. Global Navigation & Explorer
1. User initiates search from header; auto-complete calls Meilisearch with debounced input.
2. Results populate with entity tabs; selecting tab filters data set without full page reload.
3. Inline CTAs trigger context-specific modals (follow confirmation, community join paywall, course enrolment).
4. Analytics events log search query, tab selection, filter toggles, and CTA conversions.

## 2. Homepage Personalisation
1. Homepage loads user profile context, pulling progress for courses/ebooks and community activity.
2. Continue Learning row surfaces next steps; clicking resume routes to respective viewer module.
3. Spotlight modules rotate based on social graph (followed instructors, communities).
4. On scroll, lazy load additional explorer sections to maintain performance budgets.

## 3. Profile Management
1. On profile view, backend aggregator collects metrics (followers, completions, revenue).
2. Widgets render conditionally: teaching analytics for instructors, learning streaks for students.
3. Editing sections opens side panel forms with autosave and preview before publish.
4. Changes propagate via GraphQL mutation, update caches, and log to audit trail.

## 4. Community Governance
1. Moderator selects flagged content from drawer.
2. Modal displays context, member history, and recommended actions (approve, warn, suspend).
3. Decision writes to moderation log, updates member status, and notifies relevant parties.
4. Community analytics recalculates health score and updates dashboards.

## 5. Settings & Integrations
1. User navigates to settings tab; data fetched from configuration service.
2. Updating notification frequency triggers validation (rate limits) and persists to user profile.
3. Monetisation tab integrates with payment provider for payout onboarding; success updates affiliate readiness status.
4. Integrations tab manages API keys for SDK/CLI usage; key generation logs to audit and surfaces copy-to-clipboard.
