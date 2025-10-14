# Settings Overview – Application Design Update v1.50

## Goals
- Provide centralized control over personal information, preferences, notifications, security, and billing for both learner and provider roles.
- Ensure critical settings are easily discoverable and protected with proper confirmation steps.

## Structure
- Group settings into six categories: Account, Preferences, Notifications, Security, Billing, Support.
- Include search function to quickly locate settings.
- Provide breadcrumbs and status indicators showing unsaved changes.

## Key Enhancements
- Introduced granular notification controls with channel matrix and quiet hours scheduling.
- Added device management with ability to revoke sessions and enable MFA prompts.
- Billing section redesigned with invoice history, download options, and payout summaries (provider).
- Support section integrates log export and quick support ticket creation.

## Interaction Guidelines
- Use auto-save for toggle-based settings; forms with multiple fields require explicit Save button.
- Provide inline validation and success/error toasts.
- For sensitive actions (email change, password), require re-authentication.

## Accessibility
- Ensure labels describe controls and include helper text for context.
- Support keyboard navigation, focus order, and high contrast compliance.

## Implementation Notes
- Shared settings component library for learner/provider to maintain parity.
- Document API endpoints for each setting category and required payloads.
- Analytics events track interactions (e.g., `settings_notification_toggle`, `settings_mfa_enable`).
