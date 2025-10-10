# Settings Requirements

## Structure
- Tabbed interface: Profile, Notifications, Monetisation, Privacy & Security, Integrations.
- Each tab loads sectioned forms with inline save buttons.

## Key Fields
- **Profile:** Display name, bio, expertise tags, social links, timezone.
- **Notifications:** Channel toggles (email, push, in-app) for events (follows, payouts, mentions).
- **Monetisation:** Payout method, commission rates, affiliate approvals, tax info.
- **Privacy & Security:** Login management, 2FA, community visibility, content permissions.
- **Integrations:** Connected apps (Zoom, Stripe), API keys, webhook management.

## Functional Requirements
- Autosave toggles; forms require explicit "Save changes" with success toast.
- Provide preview panel showing how settings affect UI (e.g., notifications preview).
- Audit log accessible from any tab via side drawer.

## Accessibility
- Keyboard navigable tabs and fields.
- Provide descriptive labels and helper text.
