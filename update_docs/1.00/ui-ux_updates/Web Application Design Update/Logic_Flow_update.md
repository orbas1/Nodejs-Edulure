# Logic Flow Update – Web Application v1.50

## Overview
- Consolidates learner, provider, and admin workflows under unified navigation.
- Integrates follow graph, affiliate monetisation, and communities 2.0 modules introduced in version 1.50 change log.
- Provides consistent entry points across mobile and web through shared components.

## Key Flow Changes
1. **Home Feed Orchestration:**
   - Sequence: Authentication → Personalisation fetch → Content aggregation (courses, communities, resume, events) → Render modular sections.
   - Utilises new recommendation service and caching to reduce load time.
2. **Content Creation Wizard:**
   - Accessed via global Create button.
   - Steps: Select entity type → Provide metadata → Attach media → Configure monetisation → Publish preview.
   - Auto-generates announcement drafts when publishing new courses or communities.
3. **Community Hub Interaction:**
   - Entry from navigation or follow suggestions.
   - Flow: Hub overview → Widget selection (Announcements/Event/Chat) → Action modals (Create, Moderate, Promote).
   - Supports tier-specific content gating.
4. **Settings & Compliance:**
   - Flow: Settings index → Category tabs (Profile, Notifications, Monetisation, Privacy) → Detail view with inline preview.
   - Audit log accessible via side drawer with filters.

## Automation & Notifications
- Background jobs notify providers when assets finish processing.
- Learners receive follow-up reminders for incomplete enrolments via notifications tray.
- Admin alerts triggered for policy breaches escalate to moderation dashboard.

## Dependencies
- Requires updated API endpoints for follow management, asset pipeline (R2 storage), and analytics streaming.
- Aligns with logic flows defined for provider and user apps to ensure cross-platform parity.
