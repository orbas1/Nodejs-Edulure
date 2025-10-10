# Settings

## Structure
- Sections: Account, Notifications, Privacy, Monetisation, Integrations, Accessibility, Support.
- Use segmented control on tablet and accordion on phones for deeper sections.
- Provide persistent summary panel showing account status, plan tier, storage usage, and outstanding actions.

## Key Modules
### Account
- Profile information, security (password, MFA), device management.
- Session history with ability to revoke individual devices.

### Notifications
- Matrix of channels (push, email, in-app) vs event types with quick toggles.
- Quiet hours scheduling and digest frequency controls.

### Privacy
- Visibility preferences for profile, learning progress, community memberships.
- Data export request and account deletion workflows with confirmation prompts.

### Monetisation
- Payment methods, payout schedules, tax documents.
- Commission settings for affiliates and community tiers.

### Integrations
- Connected apps (calendar, CRM, analytics) with OAuth status and sync logs.
- Webhook configuration for enterprise customers.

### Accessibility
- Text size presets, dyslexia-friendly font toggle, colour contrast mode, reduced motion.
- Caption defaults and playback speed preferences.

### Support
- Access to help articles, contact support form, status page link, community guidelines.
- "Send diagnostics" option capturing logs with consent.

## Interaction Guidelines
- Autosave changes when toggles flip; show "Saved" toast with timestamp.
- Provide breadcrumbs/back button to return to previous screen without losing progress.
- Ensure destructive actions (delete account) require multi-step confirmation.
