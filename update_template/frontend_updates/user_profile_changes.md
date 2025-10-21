# User Profile Changes

## Personal Information
- Guided onboarding wizard collects personal details, learning goals, and accessibility preferences.
- Introduced profile completeness tracker that highlights missing verification steps.
- Added localized form labels and contextual help per supported language.

## Security & Privacy
- Multi-factor authentication setup wizard supports TOTP apps, SMS fallback, and WebAuthn security keys.
- Device management page lists active sessions with geolocation, browser fingerprint, and revoke controls.
- Privacy dashboard exposes consent toggles, data export, and delete requests with status tracking.

## Learning Preferences
- New learning style selector influences recommendation algorithms (visual, auditory, blended).
- Calendar sync options for Google, Outlook, and ICS with configurable reminder cadence.
- Notification settings granular by channel (email, push, in-app) and event type.

## Accessibility & UX
- High contrast theme preview and persistent preference saved to local storage.
- Keyboard navigation improvements with skip links, focus outlines, and ARIA live regions for updates.
- Upload flow for avatars includes automatic cropping, alt text prompts, and NSFW detection safeguards.

## Testing & Analytics
- Added unit tests for consent ledger integration and device revocation flows.
- A/B tests running on notification settings layout to drive adoption metrics.
- Real user monitoring monitors time-to-interactive and error rates per profile action.

