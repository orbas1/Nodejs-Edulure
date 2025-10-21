# User Application Logic Flow Changes

## Onboarding
- **Step 1 – Account Creation:**
  - Consolidated social and email sign-up into a single decision screen with context-aware helper copy.
  - Added password strength feedback derived from zxcvbn scoring; submission blocked below "Good" threshold.
- **Step 2 – Persona Selection:**
  - Introduced RBAC-informed persona choices (`Learner`, `Instructor`, `Community Curator`). Selection triggers prefetch of role-specific resources.
  - Implemented progress persistence via secure local storage so partially onboarded users resume seamlessly.
- **Step 3 – Goals & Interests:**
  - Reordered questionnaire to surface learning cadence before topic selection, improving recommendation accuracy.
  - Added inline preview of recommended playlists powered by live telemetry (fallback to cached sample data when offline).
- **Step 4 – Consent & Policies:**
  - Centralized consent toggles, mapping each toggle to backend audit events with unique identifiers for compliance reporting.

## Dashboard Navigation
- **Home Tab:** Displays personalized progress, open tasks, and recommended sessions prioritized by upcoming dates.
- **Learn Tab:** Hierarchical catalog view with server-driven filters, offline-first caching, and session prerequisites surfaced.
- **Community Tab:** Unified message center merging chat, announcements, and event invites with read receipts synced over websockets.
- **Profile Tab:** Modular layout exposing verification status, RBAC role summary, and privacy controls.

## Session Booking Flow
1. User selects available tutor slot from aggregator API.
2. Availability validated in real-time; conflicts trigger alternative suggestions.
3. Secure payment modal uses saved payment methods with CVV re-entry requirement for compliance.
4. Confirmation screen generates calendar invite and surfaces cancellation policy, with quick access to support chat.

## Notification Logic
- Push notifications deduplicated by content hash to prevent duplicate alerts across devices.
- Deep links route into relevant tab and scroll to context (e.g., new message opens Community tab -> specific conversation thread).
- Quiet hours respected per user preference; urgent compliance alerts bypass with explicit `high_priority` flag.

## Error & Offline Handling
- Global retry queue for API mutations with exponential backoff capped at 5 attempts.
- Offline banner indicates stale data age; actionable elements disabled with explanatory tooltips.
- Secure storage flushes sensitive tokens when device rooted/jailbroken detection triggers.

## Accessibility & Inclusivity
- Screen reader hints added to onboarding cards and dashboard widgets.
- Minimum touch target size enforced (48x48 dp) across primary actions.
- High-contrast mode inherits color tokens from design system and adheres to WCAG 2.1 AA.
