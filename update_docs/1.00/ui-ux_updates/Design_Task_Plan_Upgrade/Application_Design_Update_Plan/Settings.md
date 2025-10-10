# Settings — Information Architecture & Interaction Rules

## Structure Overview
1. **Account**
   - Profile Information (name, headline, avatar upload)
   - Security (password, 2FA, device sessions)
   - Connected Integrations (Google, Microsoft, Slack)
2. **Preferences**
   - Notifications (push, email, SMS toggles)
   - Accessibility (font toggle, contrast mode, motion reduction)
   - Language & Region (dropdown, locale detection)
3. **Learning Controls**
   - Download Quality (Low/Medium/High radio group)
   - Autoplay & Captions
   - Offline Storage Management
4. **Billing & Earnings** (provider only)
   - Payout Methods
   - Tax Forms
   - Invoice History
5. **Support & Legal**
   - Help Centre
   - Community Guidelines
   - Privacy Policy
   - Terms of Service
   - Delete Account (destructive zone)

## Layout Specifications
- **Header:** 104 dp avatar, display name, role chips (Learner/Provider). Primary CTA to “View Public Profile”.
- **Section Cards:** Each category collapsed by default showing summary chips; tapping expands list items.
- **List Row:** 64 dp height with trailing icon. Use `body/02` for title, `caption/01` for description.
- **Destructive Zone:** Red-tinted container (background `rgba(239, 68, 68, 0.12)`) with 12 dp radius.

## Interaction Patterns
- Collapsible sections maintain state per session.
- Provide confirmation modals for sensitive toggles (e.g., disabling 2FA).
- Inline toasts confirm preference saved, anchored above bottom nav.
- Show skeleton placeholders when fetching remote settings; each row skeleton 48 dp height.

## Accessibility Considerations
- Settings navigation supports VoiceOver rotor categories (Headers, Links, Controls).
- Provide descriptive `accessibilityLabel` for toggles (“Enable push notifications for new lesson releases”).
- Ensure focus returns to triggering control after closing dialogs.

## Content & Microcopy
- Use supportive tone (“We’ll remind you about live cohorts 24 hours before start”).
- Provide inline helper text for complex items (e.g., 2FA) with link to docs.
- Display last updated timestamp for preferences using `caption/01`.

## Technical Notes
- Document API endpoints that correspond to each section to coordinate with backend.
- Provide variant frames for dark mode and large text.
- Ensure destructive actions require double confirmation (modal + hold-to-confirm slider of 120 dp width).
