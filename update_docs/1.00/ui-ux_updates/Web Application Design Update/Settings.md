# Settings Experience Specification – Web Application v1.00

## Information Architecture
- Primary tabs: Overview, Account, Notifications, Security, Billing, Integrations.
- Secondary navigation within each tab accessible via sticky sub-tabs (scrolls horizontally on mobile).

## Layout
- Overview: 2-column grid (8/4 split). Account and Billing use 2-column forms. Notifications uses matrix layout (table) with toggles.
- Sticky summary column (right) displays account status, plan, and quick help.

## Components
- Toggle matrix for notification preferences (channels vs events) using table with checkboxes.
- Billing card: shows current plan, next invoice, update payment method button.
- Security: 2FA setup card, device list table, login history timeline.

## Visual Styling
- Use accent backgrounds for warning states (e.g., "Complete your profile").
- Provide icons for each tab to reinforce recognition.
- Apply consistent spacing (24px between sections, 32px top/bottom).

## Interactions
- Auto-save toggles with inline spinner. Provide toast on success.
- Sensitive actions open confirmation modal requiring password or WebAuthn.
- Provide change logs in Security tab for audit.

## Accessibility
- Forms follow guidelines in `Forms.md`.
- Provide skip links within tab content for quick navigation to main sections.
- Ensure tables are responsive with overflow handling.
